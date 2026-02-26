import { Router } from 'express';
import { type Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { qstr, qint } from '../utils/query.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// ─── GET /activity ──────────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  const module = qstr(req.query.module);
  const search = qstr(req.query.search);
  const from = qstr(req.query.from);
  const to = qstr(req.query.to);
  const limit = qint(req.query.limit, 100);
  const offset = qint(req.query.offset, 0);

  const where: Prisma.ActivityEntryWhereInput = {};
  if (module) where.module = module;
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { details: { contains: search, mode: 'insensitive' } },
      { entityName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.activityEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 500),
      skip: offset,
    }),
    prisma.activityEntry.count({ where }),
  ]);

  res.json({ data: entries, total });
});

export default router;
