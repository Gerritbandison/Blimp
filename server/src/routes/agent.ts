/**
 * Blimp Agent routes
 *
 * Token management (requires JWT + Admin/ITManager role):
 *   GET    /agent/devices          — list registered devices
 *   POST   /agent/devices          — create a new device token
 *   DELETE /agent/devices/:id      — revoke a device token
 *
 * Data ingestion (requires X-Blimp-Token device auth):
 *   POST   /agent/report           — submit a hardware inventory report
 *   GET    /agent/health           — liveness check (useful for agents)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { agentAuth } from '../middleware/agentAuth.js';
import { AssetStatus, AssetType } from '@prisma/client';

// 30 reports per device per minute — skipped in test environment
const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  message: { error: 'Rate limit exceeded' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const applyReportLimit: (req: Request, res: Response, next: NextFunction) => void =
  process.env.NODE_ENV === 'test'
    ? (_req, _res, next) => { next(); }
    : reportLimiter;

const router = Router();

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const StorageSchema = z.object({
  label:   z.string(),
  totalGB: z.number(),
  freeGB:  z.number().nullable().optional(),
});

const DisplaySchema = z.object({
  name:           z.string().optional(),
  manufacturer:   z.string().nullable().optional(),
  manufacturerId: z.string().nullable().optional(),
  productId:      z.string().nullable().optional(),
  serial:         z.string().nullable().optional(),
  year:           z.number().nullable().optional(),
  week:           z.number().nullable().optional(),
  resolution:     z.string().nullable().optional(),
  refreshRate:    z.number().nullable().optional(),
  isBuiltIn:      z.boolean().default(false),
  edidVersion:    z.string().nullable().optional(),
});

const PeripheralSchema = z.object({
  type:           z.string(),
  name:           z.string(),
  manufacturer:   z.string().nullable().optional(),
  serial:         z.string().nullable().optional(),
  vendorId:       z.string().nullable().optional(),
  productId:      z.string().nullable().optional(),
  connectionType: z.string().default('USB'),
  isBuiltIn:      z.boolean().default(false),
});

const AgentReportSchema = z.object({
  version:     z.string(),
  generatedAt: z.string(),
  deviceId:    z.string(),
  platform:    z.enum(['Windows', 'macOS', 'Linux']),
  hostname:    z.string(),
  hardware: z.object({
    make:    z.string(),
    model:   z.string(),
    serial:  z.string(),
    cpu:     z.string().optional(),
    ramGB:   z.number().optional(),
    storage: z.array(StorageSchema).default([]),
  }),
  os: z.object({
    name:         z.string(),
    version:      z.string().optional(),
    buildNumber:  z.string().nullable().optional(),
    architecture: z.string().optional(),
  }),
  network: z.object({
    hostname:    z.string(),
    ipAddresses: z.array(z.string()).default([]),
  }),
  displays:    z.array(DisplaySchema).default([]),
  peripherals: z.array(PeripheralSchema).default([]),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a 37-char API token: blmp_ + 32 random hex chars */
function generateToken(): string {
  return `blmp_${randomBytes(16).toString('hex')}`;
}

/** Build an asset tag from a prefix + serial (strips non-alphanum, max 8 chars) */
function makeTag(prefix: string, seed: string): string {
  const clean = seed.replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
  return `${prefix}-${clean}`;
}

/** Decode EDID vendor ID → manufacturer name */
const EDID_VENDORS: Record<string, string> = {
  DEL: 'Dell',   GSM: 'LG',       SAM: 'Samsung',  ACI: 'ASUS',
  ACR: 'Acer',   HPN: 'HP',       HWP: 'HP',       LEN: 'Lenovo',
  PHL: 'Philips',BNQ: 'BenQ',     AOC: 'AOC',      APP: 'Apple',
  NEC: 'NEC',    SNY: 'Sony',     MSI: 'MSI',      VIZ: 'Vizio',
  ENC: 'Eizo',   CMO: 'Innolux',  BOE: 'BOE',
};

function resolveMonitorMake(d: z.infer<typeof DisplaySchema>): string {
  if (d.manufacturer && !/^[A-Z]{3}$/.test(d.manufacturer)) return d.manufacturer;
  const id = (d.manufacturerId ?? '').toUpperCase();
  if (id && EDID_VENDORS[id]) return EDID_VENDORS[id];
  return d.manufacturer ?? 'Unknown';
}

// ─── Token management (admin only) ───────────────────────────────────────────

/** GET /agent/devices — list all registered agent devices */
router.get('/devices', authenticate, requireRole('Admin', 'ITManager'), async (_req, res, next) => {
  try {
    const devices = await prisma.agentDevice.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(devices.map((d) => ({
      id:          d.id,
      name:        d.name,
      tokenPrefix: d.tokenPrefix,
      platform:    d.platform,
      hostname:    d.hostname,
      lastSeen:    d.lastSeen,
      lastReport:  d.lastReport,
      reportCount: d.reportCount,
      isActive:    d.isActive,
      createdAt:   d.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

/** POST /agent/devices — create a device token */
router.post('/devices', authenticate, requireRole('Admin', 'ITManager'), async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);

    const token     = generateToken();
    const prefix    = token.slice(0, 12);
    const tokenHash = await bcrypt.hash(token, 10);

    const device = await prisma.agentDevice.create({
      data: {
        name,
        tokenHash,
        tokenPrefix: prefix,
        createdBy: req.user?.userId,
      },
    });

    // Return the plaintext token ONCE — never stored in the clear
    res.status(201).json({
      id:          device.id,
      name:        device.name,
      tokenPrefix: prefix,
      token,        // ← shown only on creation
      createdAt:   device.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

/** DELETE /agent/devices/:id — revoke (deactivate) a device token */
router.delete('/devices/:id', authenticate, requireRole('Admin', 'ITManager'), async (req, res, next) => {
  try {
    const id = req.params['id'] as string;
    await prisma.agentDevice.update({
      where: { id },
      data:  { isActive: false },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Agent health check ───────────────────────────────────────────────────────

router.get('/health', agentAuth, (req, res) => {
  res.json({
    status:     'ok',
    device:     req.agent?.deviceName,
    serverTime: new Date().toISOString(),
  });
});

// ─── Report ingestion ─────────────────────────────────────────────────────────

/**
 * POST /agent/report
 *
 * Accepts a full AgentReport from a registered device.  Upserts:
 *   1. The main device as a Laptop/Desktop/Server asset (matched by serial)
 *   2. Each external monitor as a Monitor asset (matched by display serial or
 *      deviceId+index fallback)
 *   3. Each external peripheral as a Peripheral asset (matched by
 *      deviceId+index)
 *
 * All assets get parentAssetId set to the main device asset.
 */
router.post('/report', applyReportLimit, agentAuth, async (req, res, next) => {
  try {
    const report = AgentReportSchema.parse(req.body);
    const { hardware, os, displays, peripherals, platform, hostname, deviceId } = report;

    const storageStr = hardware.storage.length
      ? hardware.storage.map((s) => `${s.totalGB} GB (${s.label})`).join(', ')
      : 'Unknown';

    const notes = [
      hardware.cpu          ? `CPU: ${hardware.cpu}` : null,
      os.architecture       ? `Architecture: ${os.architecture}` : null,
      `Hostname: ${hostname}`,
      report.network.ipAddresses.length ? `IPs: ${report.network.ipAddresses.join(', ')}` : null,
      `Agent v${report.version}`,
      `Report: ${new Date(report.generatedAt).toLocaleString()}`,
    ].filter(Boolean).join(' · ');

    // ── 1. Upsert main device asset ─────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const deviceTag = makeTag('AGENT', hardware.serial);

    let deviceAsset = await prisma.asset.findFirst({
      where: { serial: hardware.serial, detectionSource: { contains: 'Agent' } },
    });

    if (deviceAsset) {
      deviceAsset = await prisma.asset.update({
        where: { id: deviceAsset.id },
        data: {
          name: `${hardware.make} ${hardware.model}`,
          make: hardware.make,
          model: hardware.model,
          os:   `${os.name}${os.version ? ' ' + os.version : ''}${os.buildNumber ? ' (' + os.buildNumber + ')' : ''}`,
          ram:  hardware.ramGB ? `${hardware.ramGB} GB` : undefined,
          storage: storageStr,
          notes,
          updatedAt: new Date(),
        },
      });
    } else {
      deviceAsset = await prisma.asset.create({
        data: {
          tag:            deviceTag,
          name:           `${hardware.make} ${hardware.model}`,
          type:           AssetType.Laptop,
          make:           hardware.make,
          model:          hardware.model,
          serial:         hardware.serial,
          status:         AssetStatus.Deployed,
          location:       `${hostname} (Agent)`,
          purchaseDate:   new Date(today),
          warrantyExpiry: new Date(Date.now() + 3 * 365 * 86400000),
          cost:           0,
          currency:       'USD',
          os:             `${os.name}${os.version ? ' ' + os.version : ''}${os.buildNumber ? ' (' + os.buildNumber + ')' : ''}`,
          ram:            hardware.ramGB ? `${hardware.ramGB} GB` : undefined,
          storage:        storageStr,
          detectionSource:'Blimp Agent',
          notes,
        },
      });
    }

    // ── 2. Upsert monitor assets ─────────────────────────────────────────────
    let monitorsAdded = 0, monitorsUpdated = 0;
    const externalDisplays = displays.filter((d) => !d.isBuiltIn);

    for (let idx = 0; idx < externalDisplays.length; idx++) {
      const d = externalDisplays[idx];
      const mfr      = resolveMonitorMake(d);
      const monName  = (d.name && d.name !== 'Unknown Display') ? d.name : `${mfr} Monitor`;
      const monNotes = [
        d.manufacturerId ? `EDID Vendor: ${d.manufacturerId}` : null,
        d.productId      ? `Product ID: ${d.productId}` : null,
        d.resolution     ? `Resolution: ${d.resolution}` : null,
        d.refreshRate    ? `Refresh: ${d.refreshRate} Hz` : null,
        d.year           ? `Manufactured: ${d.year}${d.week ? ` wk${d.week}` : ''}` : null,
        d.edidVersion    ? `EDID: v${d.edidVersion}` : null,
        `Host: ${hardware.make} ${hardware.model} (${hardware.serial})`,
      ].filter(Boolean).join(' · ');

      const monTag = makeTag('MON', d.serial ?? `${deviceId}-M${idx}`);

      // Match by display serial if available, otherwise by tag
      const existing = d.serial
        ? await prisma.asset.findFirst({ where: { serial: d.serial, type: AssetType.Monitor } })
        : await prisma.asset.findFirst({ where: { tag: monTag } });

      if (existing) {
        await prisma.asset.update({
          where: { id: existing.id },
          data: { notes: monNotes, parentAssetId: deviceAsset.id, updatedAt: new Date() },
        });
        monitorsUpdated++;
      } else {
        await prisma.asset.create({
          data: {
            tag:            monTag,
            name:           monName,
            type:           AssetType.Monitor,
            make:           mfr,
            model:          d.name ?? 'Unknown',
            serial:         d.serial ?? 'N/A',
            status:         AssetStatus.Deployed,
            location:       `${hostname} (Agent)`,
            purchaseDate:   d.year ? new Date(`${d.year}-01-01`) : new Date(today),
            warrantyExpiry: d.year
              ? new Date(`${d.year + 3}-01-01`)
              : new Date(Date.now() + 3 * 365 * 86400000),
            cost:           0,
            currency:       'USD',
            detectionSource:'Blimp Agent (EDID)',
            parentAssetId:  deviceAsset.id,
            notes:          monNotes,
          },
        });
        monitorsAdded++;
      }
    }

    // ── 3. Upsert peripheral assets ──────────────────────────────────────────
    let peripheralsAdded = 0;
    const externalPeripherals = peripherals.filter((p) => !p.isBuiltIn);

    for (let idx = 0; idx < externalPeripherals.length; idx++) {
      const p = externalPeripherals[idx];
      const tagSeed = p.serial
        ?? (p.vendorId ? `${p.vendorId.replace('0x', '')}${(p.productId ?? '').replace('0x', '')}` : null)
        ?? `${deviceId}P${idx}`;
      const periTag = makeTag('PERI', tagSeed);
      const periNotes = [
        `Connection: ${p.connectionType}`,
        p.vendorId  ? `Vendor ID: ${p.vendorId}` : null,
        p.productId ? `Product ID: ${p.productId}` : null,
        `Host: ${hardware.make} ${hardware.model} (${hardware.serial})`,
        `Agent v${report.version}`,
      ].filter(Boolean).join(' · ');

      const exists = await prisma.asset.findFirst({ where: { tag: periTag } });
      if (!exists) {
        await prisma.asset.create({
          data: {
            tag:            periTag,
            name:           p.name,
            type:           AssetType.Peripheral,
            make:           p.manufacturer ?? 'Unknown',
            model:          p.name,
            serial:         p.serial ?? 'N/A',
            status:         AssetStatus.Deployed,
            location:       `${hostname} (Agent)`,
            purchaseDate:   new Date(today),
            warrantyExpiry: new Date(Date.now() + 3 * 365 * 86400000),
            cost:           0,
            currency:       'USD',
            detectionSource:`Blimp Agent (${p.connectionType})`,
            parentAssetId:  deviceAsset.id,
            notes:          periNotes,
          },
        });
        peripheralsAdded++;
      }
    }

    // ── 4. Update device record ──────────────────────────────────────────────
    await prisma.agentDevice.update({
      where: { id: req.agent!.deviceId },
      data: {
        hostname:    hostname,
        platform:    platform,
        lastSeen:    new Date(),
        lastReport:  new Date(),
        reportCount: { increment: 1 },
      },
    });

    res.json({
      ok:               true,
      assetId:          deviceAsset.id,
      monitorsAdded,
      monitorsUpdated,
      peripheralsAdded,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
