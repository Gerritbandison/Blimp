import { Router } from 'express';
import { z } from 'zod';
import { type Prisma, PersonStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { qstr, qint, param } from '../utils/query.js';
import { mapLicenseTypeFromDb, mapAppStatusFromDb } from '../utils/mappers.js';

import { prisma } from '../lib/prisma.js';

const router = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const personCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  department: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['Active', 'Onboarding', 'Offboarding', 'Offboarded']).default('Active'),
  location: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  managerId: z.string().optional(),
  managerName: z.string().optional(),
  phone: z.string().optional(),
  photo: z.string().optional(),
  assetsAssigned: z.number().int().default(0),
  licensesAssigned: z.number().int().default(0),
  notes: z.string().optional(),
  totalItCost: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

const personUpdateSchema = personCreateSchema.partial();

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPerson(p: Record<string, unknown>) {
  return {
    ...p,
    startDate: p.startDate instanceof Date ? p.startDate.toISOString().split('T')[0] : p.startDate,
    endDate: p.endDate instanceof Date ? p.endDate.toISOString().split('T')[0] : p.endDate,
  };
}

// ─── GET /people ────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  const status = qstr(req.query.status);
  const department = qstr(req.query.department);
  const search = qstr(req.query.search);
  const limit = qint(req.query.limit, 100);
  const offset = qint(req.query.offset, 0);

  const where: Prisma.PersonWhereInput = {};
  if (status) where.status = status as PersonStatus;
  if (department) where.department = department;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [people, total] = await Promise.all([
    prisma.person.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit, 500),
      skip: offset,
    }),
    prisma.person.count({ where }),
  ]);

  res.json({
    data: people.map((p) => formatPerson(p as unknown as Record<string, unknown>)),
    total,
    limit,
    offset,
  });
});

// ─── GET /people/:id/profile ─────────────────────────────────────────────────

router.get('/:id/profile', authenticate, async (req, res) => {
  const id = param(req.params.id);

  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }

  // All assets assigned to this person
  const assets = await prisma.asset.findMany({
    where: { assignedToId: id },
    orderBy: { updatedAt: 'desc' },
  });

  // Apps that have at least one license assigned to this person (by ID or email)
  const appsWithLicenses = await prisma.app.findMany({
    where: {
      licenses: {
        some: {
          OR: [
            { assignedToId: id },
            { assignedTo: { equals: person.email, mode: 'insensitive' } },
          ],
        },
      },
    },
    include: {
      licenses: {
        where: {
          OR: [
            { assignedToId: id },
            { assignedTo: { equals: person.email, mode: 'insensitive' } },
          ],
        },
      },
    },
  });

  // Split assets by category
  const computingTypes = ['Laptop', 'Desktop', 'Server', 'Phone', 'Tablet', 'Other', 'Network', 'Printer'];
  const computingAssets = assets.filter((a) => computingTypes.includes(a.type));
  const monitors = assets.filter((a) => a.type === 'Monitor');
  const peripherals = assets.filter((a) => a.type === 'Peripheral');

  // Group computing assets by serial to merge data from multiple detection sources
  const devicesBySerial = new Map<string, typeof computingAssets>();
  for (const asset of computingAssets) {
    const key = asset.serial || asset.id;
    if (!devicesBySerial.has(key)) devicesBySerial.set(key, []);
    devicesBySerial.get(key)!.push(asset);
  }

  // Helper: parse structured key=value pairs from notes (pipe-separated)
  function parseNote(notes: string | null, prefix: string): string | undefined {
    if (!notes) return undefined;
    const part = notes.split(' | ').find((p) => p.startsWith(prefix));
    return part ? part.slice(prefix.length).trim() : undefined;
  }

  const devices = Array.from(devicesBySerial.entries()).map(([serial, records]) => {
    const primary = records[0];
    const sources = [...new Set(records.map((r) => r.detectionSource).filter(Boolean))];

    // Merge structured fields from all source records
    let compliance: string | undefined;
    let patchStatus: string | undefined;
    let online: boolean | undefined;
    let cpu: string | undefined;
    let lastSync: string | undefined;
    let bitlocker: string | undefined;
    let entraId: string | undefined;
    let freeDisk: string | undefined;

    for (const r of records) {
      compliance    ??= parseNote(r.notes, 'Compliance: ');
      patchStatus   ??= parseNote(r.notes, 'Patches: ');
      cpu           ??= parseNote(r.notes, 'CPU: ');
      lastSync      ??= parseNote(r.notes, 'Last Sync: ');
      bitlocker     ??= parseNote(r.notes, 'BitLocker: ');
      entraId       ??= parseNote(r.notes, 'Entra ID: ');
      freeDisk      ??= parseNote(r.notes, 'Free Disk: ') ?? parseNote(r.notes, 'Free Storage: ');
      if (online === undefined) {
        const statusNote = parseNote(r.notes, 'Status: ');
        if (statusNote !== undefined) online = statusNote === 'Online';
      }
    }

    return {
      serial,
      name: primary.name,
      type: primary.type,
      make: primary.make,
      model: primary.model,
      os: records.map((r) => r.os).find(Boolean),
      ram: records.map((r) => r.ram).find(Boolean),
      storage: records.map((r) => r.storage).find(Boolean),
      cost: Math.max(...records.map((r) => r.cost)),
      currency: primary.currency,
      location: primary.location,
      purchaseDate: primary.purchaseDate instanceof Date ? primary.purchaseDate.toISOString().split('T')[0] : primary.purchaseDate,
      warrantyExpiry: primary.warrantyExpiry instanceof Date ? primary.warrantyExpiry.toISOString().split('T')[0] : primary.warrantyExpiry,
      status: primary.status,
      sources,
      compliance,
      patchStatus,
      online,
      cpu,
      lastSync,
      bitlocker,
      entraId,
      freeDisk,
      assetIds: records.map((r) => ({ id: r.id, tag: r.tag, detectionSource: r.detectionSource })),
    };
  });

  const formattedMonitors = monitors.map((m) => ({
    id: m.id,
    name: m.name,
    make: m.make,
    model: m.model,
    serial: m.serial,
    screenSize: m.screenSize,
    cost: m.cost,
    currency: m.currency,
    location: m.location,
    detectionSource: m.detectionSource,
  }));

  const formattedPeripherals = peripherals.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    make: p.make,
    model: p.model,
    serial: p.serial,
    cost: p.cost,
    currency: p.currency,
    detectionSource: p.detectionSource,
  }));

  const licenses = appsWithLicenses.map((app) => ({
    appId: app.id,
    appName: app.name,
    vendor: app.vendor,
    logo: app.logo,
    category: app.category,
    licenseType: mapLicenseTypeFromDb(app.licenseType),
    costPerLicense: app.costPerLicense,
    billingCycle: app.billingCycle,
    currency: app.currency,
    status: mapAppStatusFromDb(app.status),
    licenseCount: app.licenses.length,
  }));

  const hardwareCost = assets.reduce((s, a) => s + a.cost, 0);
  const softwareCostAnnual = appsWithLicenses.reduce((s, app) => {
    const annual = app.billingCycle === 'annual' ? app.costPerLicense : app.costPerLicense * 12;
    return s + annual * app.licenses.length;
  }, 0);

  res.json({
    person: formatPerson(person as unknown as Record<string, unknown>),
    devices,
    monitors: formattedMonitors,
    peripherals: formattedPeripherals,
    licenses,
    costSummary: {
      hardware: hardwareCost,
      softwareAnnual: softwareCostAnnual,
      total: hardwareCost + softwareCostAnnual,
    },
  });
});

// ─── GET /people/:id ────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req, res) => {
  const id = param(req.params.id);
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { timestamp: 'desc' }, take: 50 },
      documents: true,
    },
  });
  if (!person) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json(formatPerson(person as unknown as Record<string, unknown>));
});

// ─── POST /people ───────────────────────────────────────────────────────────

router.post('/', authenticate, async (req, res) => {
  const body = personCreateSchema.parse(req.body);

  const person = await prisma.person.create({
    data: {
      name: body.name,
      email: body.email,
      department: body.department,
      title: body.title,
      status: body.status as PersonStatus,
      location: body.location,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      managerId: body.managerId,
      managerName: body.managerName,
      phone: body.phone,
      photo: body.photo,
      assetsAssigned: body.assetsAssigned,
      licensesAssigned: body.licensesAssigned,
      notes: body.notes,
      totalItCost: body.totalItCost,
      tags: body.tags,
    },
  });

  await prisma.activityEntry.create({
    data: {
      action: person.status === 'Onboarding' ? 'Person Onboarding' : 'Person Created',
      user: req.user!.email,
      details: `${person.name} added to system`,
      module: 'People',
      entityId: person.id,
      entityName: person.name,
      userId: req.user!.userId,
      personId: person.id,
    },
  });

  res.status(201).json(formatPerson(person as unknown as Record<string, unknown>));
});

// ─── PATCH /people/:id ──────────────────────────────────────────────────────

router.patch('/:id', authenticate, async (req, res) => {
  const id = param(req.params.id);
  const body = personUpdateSchema.parse(req.body);

  const data: Prisma.PersonUncheckedUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;
  if (body.department !== undefined) data.department = body.department;
  if (body.title !== undefined) data.title = body.title;
  if (body.status !== undefined) data.status = body.status as PersonStatus;
  if (body.location !== undefined) data.location = body.location;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.tags !== undefined) data.tags = body.tags;

  const person = await prisma.person.update({ where: { id }, data });
  res.json(formatPerson(person as unknown as Record<string, unknown>));
});

// ─── DELETE /people/:id ────────────────────────────────────────────────────

router.delete('/:id', authenticate, async (req, res) => {
  const id = param(req.params.id);

  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }

  // Unassign any assets linked to this person before deletion
  await prisma.asset.updateMany({
    where: { assignedToId: id },
    data: { assignedTo: null, assignedToId: null },
  });

  await prisma.person.delete({ where: { id } });

  await prisma.activityEntry.create({
    data: {
      action: 'Person Deleted',
      user: req.user!.email,
      details: `${person.name} removed from system`,
      module: 'People',
      entityId: person.id,
      entityName: person.name,
      userId: req.user!.userId,
    },
  });

  res.status(204).end();
});

export default router;
