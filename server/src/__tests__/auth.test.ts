import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';

// Mock Prisma before anything imports it
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Import mocked prisma AFTER vi.mock declaration
const { prisma } = await import('../lib/prisma.js');

const app = createApp();

// ── Shared fixture ────────────────────────────────────────────────────────────

const TEST_USER = {
  id: 'user-1',
  email: 'admin@blimp.io',
  name: 'Admin User',
  role: 'Admin',
  department: 'IT',
  photo: null,
  status: 'Active',
  lastLogin: null,
  passwordHash: '',
};

beforeEach(async () => {
  vi.clearAllMocks();
  TEST_USER.passwordHash = await bcrypt.hash('password123', 10);
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns 200 + JWT on valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER as never);
    vi.mocked(prisma.user.update).mockResolvedValue(TEST_USER as never);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@blimp.io', password: 'password123' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('admin@blimp.io');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 on wrong password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER as never);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@blimp.io', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('returns 401 for unknown email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body (bad email, empty password)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 401 for inactive user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...TEST_USER,
      status: 'Suspended',
    } as never);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@blimp.io', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

// ── POST /auth/register ───────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('returns 201 + JWT on valid registration', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      ...TEST_USER,
      email: 'new@blimp.io',
      name: 'New User',
      role: 'ReadOnly',
    } as never);

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@blimp.io', name: 'New User', password: 'securepass123' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('new@blimp.io');
  });

  it('returns 409 on duplicate email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER as never);

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'admin@blimp.io', name: 'Dupe', password: 'securepass123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@blimp.io', name: 'Test', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@blimp.io', password: 'securepass123' });

    expect(res.status).toBe(400);
  });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  function makeToken() {
    return jwt.sign(
      { userId: 'user-1', email: 'admin@blimp.io', role: 'Admin' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  }

  it('returns user profile with valid JWT', async () => {
    // Return only the fields the route's Prisma `select` would return (no passwordHash)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: TEST_USER.id,
      email: TEST_USER.email,
      name: TEST_USER.name,
      role: TEST_USER.role,
      department: TEST_USER.department,
      photo: TEST_USER.photo,
      status: TEST_USER.status,
      lastLogin: TEST_USER.lastLogin,
    } as never);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@blimp.io');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong secret', async () => {
    const badToken = jwt.sign({ userId: 'x', email: 'x', role: 'Admin' }, 'wrong-secret');
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });
});
