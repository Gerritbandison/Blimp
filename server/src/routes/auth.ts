import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// 10 attempts per IP per 15 minutes — skipped in test environment
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many login attempts, please try again in 15 minutes' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const applyLoginLimit: (req: Request, res: Response, next: NextFunction) => void =
  process.env.NODE_ENV === 'test'
    ? (_req, _res, next) => { next(); }
    : loginLimiter;

const SALT_ROUNDS = 12;

// ─── Schemas ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['Admin', 'ITManager', 'Finance', 'ReadOnly', 'Custom']).optional(),
});

// ─── POST /auth/login ───────────────────────────────────────────────────────

router.post('/login', applyLoginLimit, async (req, res) => {
  const body = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
  });

  if (!user || user.status !== 'Active') {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as string & jwt.SignOptions['expiresIn'] },
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      photo: user.photo,
    },
  });
});

// ─── POST /auth/register ────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const body = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
  });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      name: body.name,
      passwordHash,
      role: body.role ?? 'ReadOnly',
    },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as string & jwt.SignOptions['expiresIn'] },
  );

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

// ─── GET /auth/me ───────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, email: true, name: true, role: true,
      department: true, photo: true, status: true, lastLogin: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

export default router;
