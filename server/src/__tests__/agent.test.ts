import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    agentDevice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    asset: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { prisma } = await import('../lib/prisma.js');

const app = createApp();

function makeJwt(role = 'Admin') {
  return jwt.sign(
    { userId: 'user-1', email: 'admin@blimp.io', role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

const MOCK_DEVICE = {
  id: 'dev-1',
  name: "Alice's ThinkPad",
  tokenPrefix: 'blmp_abc12',
  tokenHash: '$bcrypt_hash',
  platform: 'macOS',
  hostname: 'alice-mac.local',
  lastSeen: new Date('2026-02-24T10:00:00Z'),
  lastReport: new Date('2026-02-24T10:00:00Z'),
  reportCount: 5,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-02-24T10:00:00Z'),
  createdBy: 'user-1',
};

beforeEach(() => vi.clearAllMocks());

// ── GET /agent/devices ────────────────────────────────────────────────────────

describe('GET /agent/devices', () => {
  it('returns device list for Admin', async () => {
    vi.mocked(prisma.agentDevice.findMany).mockResolvedValue([MOCK_DEVICE] as never);

    const res = await request(app)
      .get('/agent/devices')
      .set('Authorization', `Bearer ${makeJwt('Admin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Alice's ThinkPad");
    // tokenHash must never be exposed
    expect(res.body[0]).not.toHaveProperty('tokenHash');
  });

  it('returns device list for ITManager', async () => {
    vi.mocked(prisma.agentDevice.findMany).mockResolvedValue([MOCK_DEVICE] as never);

    const res = await request(app)
      .get('/agent/devices')
      .set('Authorization', `Bearer ${makeJwt('ITManager')}`);

    expect(res.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/agent/devices');
    expect(res.status).toBe(401);
  });

  it('returns 403 for Finance role', async () => {
    const res = await request(app)
      .get('/agent/devices')
      .set('Authorization', `Bearer ${makeJwt('Finance')}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for ReadOnly role', async () => {
    const res = await request(app)
      .get('/agent/devices')
      .set('Authorization', `Bearer ${makeJwt('ReadOnly')}`);
    expect(res.status).toBe(403);
  });
});

// ── POST /agent/devices ───────────────────────────────────────────────────────

describe('POST /agent/devices', () => {
  it('creates a device token and returns it once', async () => {
    vi.mocked(prisma.agentDevice.create).mockResolvedValue(MOCK_DEVICE as never);

    const res = await request(app)
      .post('/agent/devices')
      .set('Authorization', `Bearer ${makeJwt('Admin')}`)
      .send({ name: "Alice's ThinkPad" });

    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^blmp_/);
    expect(typeof res.body.tokenPrefix).toBe('string');
    // Token must not appear again in subsequent responses
    expect(res.body).not.toHaveProperty('tokenHash');
  });

  it('returns 400 for empty device name', async () => {
    const res = await request(app)
      .post('/agent/devices')
      .set('Authorization', `Bearer ${makeJwt('Admin')}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/agent/devices')
      .send({ name: 'Test Device' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for Finance role', async () => {
    const res = await request(app)
      .post('/agent/devices')
      .set('Authorization', `Bearer ${makeJwt('Finance')}`)
      .send({ name: 'Test Device' });
    expect(res.status).toBe(403);
  });
});

// ── DELETE /agent/devices/:id ─────────────────────────────────────────────────

describe('DELETE /agent/devices/:id', () => {
  it('deactivates (soft-deletes) the device', async () => {
    vi.mocked(prisma.agentDevice.update).mockResolvedValue({
      ...MOCK_DEVICE,
      isActive: false,
    } as never);

    const res = await request(app)
      .delete('/agent/devices/dev-1')
      .set('Authorization', `Bearer ${makeJwt('Admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(vi.mocked(prisma.agentDevice.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dev-1' },
        data: { isActive: false },
      })
    );
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/agent/devices/dev-1');
    expect(res.status).toBe(401);
  });
});
