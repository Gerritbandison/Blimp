import { Router } from 'express';
import { z } from 'zod';
import { type Prisma, AssetStatus, AssetType } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { mapAssetStatusToDb, mapAssetStatusFromDb } from '../utils/mappers.js';
import { qstr, qint, param } from '../utils/query.js';

import { prisma } from '../lib/prisma.js';

const router = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const assetCreateSchema = z.object({
  tag: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['Laptop', 'Monitor', 'Phone', 'Tablet', 'Desktop', 'Server', 'Printer', 'Network', 'Peripheral', 'Other']),
  make: z.string().min(1),
  model: z.string().min(1),
  serial: z.string().min(1),
  status: z.string().default('In Stock'),
  assignedTo: z.string().optional(),
  assignedToId: z.string().optional(),
  location: z.string().min(1),
  purchaseDate: z.string(),
  warrantyExpiry: z.string(),
  cost: z.number().default(0),
  currency: z.string().default('USD'),
  os: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  screenSize: z.string().optional(),
  poNumber: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  department: z.string().optional(),
  category: z.string().optional(),
  detectionSource: z.string().optional(),
});

const assetUpdateSchema = assetCreateSchema.partial();

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAsset(a: Record<string, unknown>) {
  return {
    ...a,
    status: mapAssetStatusFromDb(a.status as string),
    purchaseDate: a.purchaseDate instanceof Date ? a.purchaseDate.toISOString().split('T')[0] : a.purchaseDate,
    warrantyExpiry: a.warrantyExpiry instanceof Date ? a.warrantyExpiry.toISOString().split('T')[0] : a.warrantyExpiry,
  };
}

// ─── GET /assets ────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  const status = qstr(req.query.status);
  const type = qstr(req.query.type);
  const search = qstr(req.query.search);
  const limit = qint(req.query.limit, 100);
  const offset = qint(req.query.offset, 0);

  const where: Prisma.AssetWhereInput = {};
  if (status) where.status = mapAssetStatusToDb(status) as AssetStatus;
  if (type) where.type = type as AssetType;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { tag: { contains: search, mode: 'insensitive' } },
      { serial: { contains: search, mode: 'insensitive' } },
      { assignedTo: { contains: search, mode: 'insensitive' } },
    ];
  }

  const cursor = qstr(req.query.cursor);
  const take = Math.min(limit, 500);

  if (cursor) {
    // Cursor-based pagination — more efficient for large tables
    const assets = await prisma.asset.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: take + 1,
      cursor: { id: cursor },
      skip: 1, // skip the cursor itself
      include: { lifecycle: true },
    });
    const hasNext = assets.length > take;
    const page = hasNext ? assets.slice(0, take) : assets;
    const nextCursor = hasNext ? page[page.length - 1].id : null;
    res.json({ data: page.map(formatAsset), nextCursor });
  } else {
    // Offset-based pagination (default, backward compatible)
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take,
        skip: offset,
        include: { lifecycle: true },
      }),
      prisma.asset.count({ where }),
    ]);
    res.json({ data: assets.map(formatAsset), total, limit, offset });
  }
});

// ─── GET /assets/:id ────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req, res) => {
  const id = param(req.params.id);
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      lifecycle: { orderBy: { date: 'desc' } },
      activities: { orderBy: { timestamp: 'desc' }, take: 50 },
      documents: true,
    },
  });
  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }
  res.json(formatAsset(asset as unknown as Record<string, unknown>));
});

// ─── POST /assets ───────────────────────────────────────────────────────────

router.post('/', authenticate, async (req, res) => {
  const body = assetCreateSchema.parse(req.body);

  const asset = await prisma.asset.create({
    data: {
      tag: body.tag,
      name: body.name,
      type: body.type as AssetType,
      make: body.make,
      model: body.model,
      serial: body.serial,
      status: mapAssetStatusToDb(body.status) as AssetStatus,
      assignedTo: body.assignedTo,
      assignedToId: body.assignedToId,
      location: body.location,
      purchaseDate: new Date(body.purchaseDate),
      warrantyExpiry: new Date(body.warrantyExpiry),
      cost: body.cost,
      currency: body.currency,
      os: body.os,
      ram: body.ram,
      storage: body.storage,
      screenSize: body.screenSize,
      poNumber: body.poNumber,
      vendor: body.vendor,
      notes: body.notes,
      tags: body.tags,
      department: body.department,
      category: body.category,
      detectionSource: body.detectionSource,
    },
  });

  await prisma.activityEntry.create({
    data: {
      action: 'Asset Created',
      user: req.user!.email,
      details: `${asset.name} (${asset.tag}) added to inventory`,
      module: 'Assets',
      entityId: asset.id,
      entityName: asset.name,
      userId: req.user!.userId,
      assetId: asset.id,
    },
  });

  res.status(201).json(formatAsset(asset as unknown as Record<string, unknown>));
});

// ─── PATCH /assets/:id ──────────────────────────────────────────────────────

router.patch('/:id', authenticate, async (req, res) => {
  const id = param(req.params.id);
  const body = assetUpdateSchema.parse(req.body);

  const data: Prisma.AssetUncheckedUpdateInput = {};
  if (body.tag !== undefined) data.tag = body.tag;
  if (body.name !== undefined) data.name = body.name;
  if (body.type !== undefined) data.type = body.type as AssetType;
  if (body.make !== undefined) data.make = body.make;
  if (body.model !== undefined) data.model = body.model;
  if (body.serial !== undefined) data.serial = body.serial;
  if (body.status !== undefined) data.status = mapAssetStatusToDb(body.status) as AssetStatus;
  if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo;
  if (body.location !== undefined) data.location = body.location;
  if (body.purchaseDate !== undefined) data.purchaseDate = new Date(body.purchaseDate);
  if (body.warrantyExpiry !== undefined) data.warrantyExpiry = new Date(body.warrantyExpiry);
  if (body.cost !== undefined) data.cost = body.cost;
  if (body.currency !== undefined) data.currency = body.currency;
  if (body.os !== undefined) data.os = body.os;
  if (body.ram !== undefined) data.ram = body.ram;
  if (body.storage !== undefined) data.storage = body.storage;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.department !== undefined) data.department = body.department;
  if (body.tags !== undefined) data.tags = body.tags;
  if (body.detectionSource !== undefined) data.detectionSource = body.detectionSource;

  const asset = await prisma.asset.update({ where: { id }, data });
  res.json(formatAsset(asset as unknown as Record<string, unknown>));
});

// ─── DELETE /assets/:id ─────────────────────────────────────────────────────

router.delete('/:id', authenticate, async (req, res) => {
  const id = param(req.params.id);
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  await prisma.asset.delete({ where: { id } });

  await prisma.activityEntry.create({
    data: {
      action: 'Asset Deleted',
      user: req.user!.email,
      details: `${asset.name} (${asset.tag}) removed from inventory`,
      module: 'Assets',
      entityId: id,
      entityName: asset.name,
      userId: req.user!.userId,
    },
  });

  res.json({ ok: true });
});

// ─── POST /assets/bulk-update ───────────────────────────────────────────────

router.post('/bulk-update', authenticate, async (req, res) => {
  const { ids, updates } = z.object({
    ids: z.array(z.string()).min(1),
    updates: assetUpdateSchema,
  }).parse(req.body);

  const data: Prisma.AssetUpdateManyMutationInput = {};
  if (updates.status) data.status = mapAssetStatusToDb(updates.status) as AssetStatus;
  if (updates.location) data.location = updates.location;
  if (updates.department) data.department = updates.department;
  if (updates.assignedTo) data.assignedTo = updates.assignedTo;

  const result = await prisma.asset.updateMany({
    where: { id: { in: ids } },
    data,
  });

  res.json({ updated: result.count });
});

export default router;
