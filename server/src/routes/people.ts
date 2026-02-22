import { Router } from 'express';
import { z } from 'zod';
import { type Prisma, PersonStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { qstr, qint, param } from '../utils/query.js';

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

export default router;
