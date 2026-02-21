import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, type Prisma, AppStatus, LicenseType } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { mapAppStatusFromDb, mapAppStatusToDb, mapLicenseTypeFromDb, mapLicenseTypeToDb } from '../utils/mappers.js';
import { qstr, qint, param } from '../utils/query.js';

const router = Router();
const prisma = new PrismaClient();

// ─── Schemas ────────────────────────────────────────────────────────────────

const appCreateSchema = z.object({
  name: z.string().min(1),
  vendor: z.string().min(1),
  logo: z.string().optional(),
  category: z.string().min(1),
  licenseType: z.string(),
  totalLicenses: z.number().int().min(0),
  assignedLicenses: z.number().int().min(0).default(0),
  costPerLicense: z.number().min(0),
  billingCycle: z.enum(['monthly', 'annual']).default('annual'),
  currency: z.string().default('USD'),
  renewalDate: z.string(),
  noticePeriodDays: z.number().int().default(30),
  status: z.string().default('Active'),
  detectionSource: z.string().default('Manual'),
  adminOwner: z.string().optional(),
  businessOwner: z.string().optional(),
  description: z.string().optional(),
  vendorContact: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  supportTier: z.string().optional(),
  url: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const appUpdateSchema = appCreateSchema.partial();

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatApp(a: Record<string, unknown>) {
  return {
    ...a,
    status: mapAppStatusFromDb(a.status as string),
    licenseType: mapLicenseTypeFromDb(a.licenseType as string),
    renewalDate: a.renewalDate instanceof Date ? a.renewalDate.toISOString().split('T')[0] : a.renewalDate,
    contractStart: a.contractStart instanceof Date ? a.contractStart.toISOString().split('T')[0] : a.contractStart,
    contractEnd: a.contractEnd instanceof Date ? a.contractEnd.toISOString().split('T')[0] : a.contractEnd,
    compLastAudit: a.compLastAudit instanceof Date ? a.compLastAudit.toISOString().split('T')[0] : a.compLastAudit,
    compliance: {
      soc2: a.compSoc2,
      iso27001: a.compIso27001,
      gdpr: a.compGdpr,
      hipaa: a.compHipaa,
      cyberEssentials: a.compCyberEss,
      riskRating: a.compRiskRating,
      lastAudit: a.compLastAudit instanceof Date ? a.compLastAudit.toISOString().split('T')[0] : a.compLastAudit,
      dpaStatus: a.compDpaStatus,
      questionnaire: a.compQuestionnaire,
    },
  };
}

// ─── GET /apps ──────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  const status = qstr(req.query.status);
  const search = qstr(req.query.search);
  const limit = qint(req.query.limit, 100);
  const offset = qint(req.query.offset, 0);

  const where: Prisma.AppWhereInput = {};
  if (status) where.status = mapAppStatusToDb(status) as AppStatus;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { vendor: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [apps, total] = await Promise.all([
    prisma.app.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit, 500),
      skip: offset,
      include: { licenses: true, payments: true },
    }),
    prisma.app.count({ where }),
  ]);

  res.json({
    data: apps.map((a) => formatApp(a as unknown as Record<string, unknown>)),
    total,
    limit,
    offset,
  });
});

// ─── GET /apps/:id ──────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req, res) => {
  const id = param(req.params.id);
  const app = await prisma.app.findUnique({
    where: { id },
    include: {
      licenses: true,
      payments: { orderBy: { date: 'desc' } },
      activities: { orderBy: { timestamp: 'desc' }, take: 50 },
      documents: true,
    },
  });
  if (!app) {
    res.status(404).json({ error: 'App not found' });
    return;
  }
  res.json(formatApp(app as unknown as Record<string, unknown>));
});

// ─── POST /apps ─────────────────────────────────────────────────────────────

router.post('/', authenticate, async (req, res) => {
  const body = appCreateSchema.parse(req.body);

  const app = await prisma.app.create({
    data: {
      name: body.name,
      vendor: body.vendor,
      logo: body.logo,
      category: body.category,
      licenseType: mapLicenseTypeToDb(body.licenseType) as LicenseType,
      totalLicenses: body.totalLicenses,
      assignedLicenses: body.assignedLicenses,
      costPerLicense: body.costPerLicense,
      billingCycle: body.billingCycle,
      currency: body.currency,
      renewalDate: new Date(body.renewalDate),
      noticePeriodDays: body.noticePeriodDays,
      status: mapAppStatusToDb(body.status) as AppStatus,
      detectionSource: body.detectionSource,
      adminOwner: body.adminOwner,
      businessOwner: body.businessOwner,
      description: body.description,
      vendorContact: body.vendorContact,
      contractStart: body.contractStart ? new Date(body.contractStart) : undefined,
      contractEnd: body.contractEnd ? new Date(body.contractEnd) : undefined,
      supportTier: body.supportTier,
      url: body.url,
      tags: body.tags,
    },
  });

  await prisma.activityEntry.create({
    data: {
      action: 'App Added',
      user: req.user!.email,
      details: `${app.name} added to app register`,
      module: 'Apps',
      entityId: app.id,
      entityName: app.name,
      userId: req.user!.userId,
      appId: app.id,
    },
  });

  res.status(201).json(formatApp(app as unknown as Record<string, unknown>));
});

// ─── PATCH /apps/:id ────────────────────────────────────────────────────────

router.patch('/:id', authenticate, async (req, res) => {
  const id = param(req.params.id);
  const body = appUpdateSchema.parse(req.body);

  const data: Prisma.AppUncheckedUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.vendor !== undefined) data.vendor = body.vendor;
  if (body.category !== undefined) data.category = body.category;
  if (body.status !== undefined) data.status = mapAppStatusToDb(body.status) as AppStatus;
  if (body.licenseType !== undefined) data.licenseType = mapLicenseTypeToDb(body.licenseType) as LicenseType;
  if (body.totalLicenses !== undefined) data.totalLicenses = body.totalLicenses;
  if (body.assignedLicenses !== undefined) data.assignedLicenses = body.assignedLicenses;
  if (body.costPerLicense !== undefined) data.costPerLicense = body.costPerLicense;
  if (body.renewalDate !== undefined) data.renewalDate = new Date(body.renewalDate);
  if (body.contractStart !== undefined) data.contractStart = new Date(body.contractStart);
  if (body.contractEnd !== undefined) data.contractEnd = new Date(body.contractEnd);
  if (body.description !== undefined) data.description = body.description;
  if (body.url !== undefined) data.url = body.url;
  if (body.tags !== undefined) data.tags = body.tags;

  const app = await prisma.app.update({ where: { id }, data });
  res.json(formatApp(app as unknown as Record<string, unknown>));
});

export default router;
