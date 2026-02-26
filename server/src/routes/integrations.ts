import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { mapIntegrationStatusFromDb, intuneDeviceToAssetData, ninjaDeviceToAssetData } from '../utils/mappers.js';
import { param } from '../utils/query.js';
import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import {
  validateIntuneCredentials,
  fetchIntuneDevices,
  fetchEntraUsers,
  type IntuneCredentials,
} from '../services/intune.js';
import {
  validateNinjaOneCredentials,
  fetchNinjaOneDevices,
  type NinjaOneCredentials,
} from '../services/ninjaone.js';

const router = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const intuneConnectSchema = z.object({
  tenantId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  syncFrequency: z.string().default('daily'),
  enabledFeatures: z.array(z.string()).default([]),
});

const ninjaConnectSchema = z.object({
  instanceUrl: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  syncFrequency: z.string().default('daily'),
  enabledFeatures: z.array(z.string()).default([]),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatIntegration(i: Record<string, unknown>) {
  return {
    ...i,
    status: mapIntegrationStatusFromDb(i.status as string),
    configEncrypted: undefined, // Never expose stored credentials
  };
}

// ─── GET /integrations ──────────────────────────────────────────────────────

router.get('/', authenticate, async (_req, res) => {
  const integrations = await prisma.integration.findMany({
    orderBy: { name: 'asc' },
    include: { syncResults: { orderBy: { at: 'desc' }, take: 1 } },
  });

  res.json(integrations.map((i) => {
    const formatted = formatIntegration(i as unknown as Record<string, unknown>);
    return {
      ...formatted,
      lastSyncResult: i.syncResults[0] ?? null,
      syncResults: undefined,
    };
  }));
});

// ─── POST /integrations/intune/connect ──────────────────────────────────────

router.post('/intune/connect', authenticate, requireRole('Admin', 'ITManager'), async (req, res) => {
  const body = intuneConnectSchema.parse(req.body);

  const creds: IntuneCredentials = {
    tenantId: body.tenantId,
    clientId: body.clientId,
    clientSecret: body.clientSecret,
  };

  // Validate credentials by attempting token exchange
  const validation = await validateIntuneCredentials(creds);
  if (!validation.ok) {
    res.status(401).json({ error: validation.error || 'Invalid Intune credentials' });
    return;
  }

  // Upsert the integration record
  const integration = await prisma.integration.upsert({
    where: { id: 'intune' },
    update: {
      status: 'Connected',
      connectedAt: new Date(),
      syncFrequency: body.syncFrequency,
      features: body.enabledFeatures,
      errorMessage: null,
      configEncrypted: encrypt(JSON.stringify(creds)),
    },
    create: {
      id: 'intune',
      name: 'Microsoft Intune',
      category: 'MDM / Endpoint Management',
      description: 'Sync managed devices, compliance status, and Entra ID users from Microsoft Intune.',
      status: 'Connected',
      connectedAt: new Date(),
      syncFrequency: body.syncFrequency,
      features: body.enabledFeatures,
      configEncrypted: encrypt(JSON.stringify(creds)),
    },
  });

  res.json(formatIntegration(integration as unknown as Record<string, unknown>));
});

// ─── POST /integrations/intune/sync ─────────────────────────────────────────

router.post('/intune/sync', authenticate, requireRole('Admin', 'ITManager'), async (_req, res) => {
  const integration = await prisma.integration.findUnique({ where: { id: 'intune' } });
  if (!integration?.configEncrypted) {
    res.status(400).json({ error: 'Intune not connected. Connect first.' });
    return;
  }

  const creds = JSON.parse(decrypt(integration.configEncrypted)) as IntuneCredentials;

  // Mark as syncing
  await prisma.integration.update({
    where: { id: 'intune' },
    data: { status: 'Syncing' },
  });

  try {
    const devices = await fetchIntuneDevices(creds);

    // Pre-load all persons and existing Intune assets to avoid N+1 queries
    const [allPersons, existingAssets] = await Promise.all([
      prisma.person.findMany(),
      prisma.asset.findMany({ where: { detectionSource: 'Microsoft Intune' } }),
    ]);
    const personByEmail = new Map(allPersons.map((p) => [p.email.toLowerCase(), p]));
    const assetBySerial = new Map(existingAssets.map((a) => [a.serial, a]));

    let assetsAdded = 0;
    let assetsUpdated = 0;

    for (const device of devices) {
      const assetData = intuneDeviceToAssetData(device);

      // Resolve person by userPrincipalName (email) — O(1) lookup
      let personLink: { assignedToId: string; assignedTo: string } | undefined;
      if (device.userPrincipalName) {
        const person = personByEmail.get(device.userPrincipalName.toLowerCase());
        if (person) personLink = { assignedToId: person.id, assignedTo: person.name };
      }

      const existing = assetBySerial.get(assetData.serial);

      if (existing) {
        await prisma.asset.update({ where: { id: existing.id }, data: { ...assetData, ...personLink } });
        assetsUpdated++;
      } else {
        const created = await prisma.asset.create({ data: { ...(assetData as Parameters<typeof prisma.asset.create>[0]['data']), ...personLink } });
        assetBySerial.set(assetData.serial, created);
        assetsAdded++;
      }
    }

    // Optionally sync Entra ID users if enabled
    let peopleAdded = 0;
    if (integration.features.includes('Entra ID user assignment')) {
      const users = await fetchEntraUsers(creds);
      for (const user of users) {
        if (!user.mail) continue;
        if (!personByEmail.has(user.mail.toLowerCase())) {
          const created = await prisma.person.create({
            data: {
              name: user.displayName,
              email: user.mail,
              department: user.department || 'Unknown',
              title: user.jobTitle || 'Unknown',
              status: user.accountEnabled ? 'Active' : 'Offboarded',
              location: 'Entra ID',
              startDate: new Date(),
            },
          });
          personByEmail.set(user.mail.toLowerCase(), created);
          peopleAdded++;
        }
      }
    }

    const syncResult = await prisma.syncResult.create({
      data: {
        integrationId: 'intune',
        assetsAdded,
        assetsUpdated,
        peopleAdded,
        errors: [],
      },
    });

    await prisma.integration.update({
      where: { id: 'intune' },
      data: {
        status: 'Connected',
        lastSync: new Date(),
        syncCount: { increment: 1 },
        errorMessage: null,
      },
    });

    res.json({
      ok: true,
      result: syncResult,
      summary: { devices: devices.length, assetsAdded, assetsUpdated, peopleAdded },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    await prisma.integration.update({
      where: { id: 'intune' },
      data: { status: 'Error', errorMessage: message },
    });
    res.status(500).json({ error: message });
  }
});

// ─── POST /integrations/ninjaone/connect ────────────────────────────────────

router.post('/ninjaone/connect', authenticate, requireRole('Admin', 'ITManager'), async (req, res) => {
  const body = ninjaConnectSchema.parse(req.body);

  const creds: NinjaOneCredentials = {
    instanceUrl: body.instanceUrl,
    clientId: body.clientId,
    clientSecret: body.clientSecret,
  };

  const validation = await validateNinjaOneCredentials(creds);
  if (!validation.ok) {
    res.status(401).json({ error: validation.error || 'Invalid NinjaOne credentials' });
    return;
  }

  const integration = await prisma.integration.upsert({
    where: { id: 'ninjaone' },
    update: {
      status: 'Connected',
      connectedAt: new Date(),
      syncFrequency: body.syncFrequency,
      features: body.enabledFeatures,
      errorMessage: null,
      configEncrypted: encrypt(JSON.stringify(creds)),
    },
    create: {
      id: 'ninjaone',
      name: 'NinjaOne',
      category: 'RMM / Endpoint Management',
      description: 'Sync endpoint inventory, patch compliance, and monitoring alerts from NinjaOne.',
      status: 'Connected',
      connectedAt: new Date(),
      syncFrequency: body.syncFrequency,
      features: body.enabledFeatures,
      configEncrypted: encrypt(JSON.stringify(creds)),
    },
  });

  res.json(formatIntegration(integration as unknown as Record<string, unknown>));
});

// ─── POST /integrations/ninjaone/sync ───────────────────────────────────────

router.post('/ninjaone/sync', authenticate, requireRole('Admin', 'ITManager'), async (_req, res) => {
  const integration = await prisma.integration.findUnique({ where: { id: 'ninjaone' } });
  if (!integration?.configEncrypted) {
    res.status(400).json({ error: 'NinjaOne not connected. Connect first.' });
    return;
  }

  const creds = JSON.parse(decrypt(integration.configEncrypted)) as NinjaOneCredentials;

  await prisma.integration.update({
    where: { id: 'ninjaone' },
    data: { status: 'Syncing' },
  });

  try {
    const devices = await fetchNinjaOneDevices(creds);

    // Pre-load all persons and existing NinjaOne assets to avoid N+1 queries
    const [allPersons, existingAssets] = await Promise.all([
      prisma.person.findMany(),
      prisma.asset.findMany({ where: { detectionSource: 'NinjaOne' } }),
    ]);
    const personByName = new Map(allPersons.map((p) => [p.name.toLowerCase(), p]));
    const assetBySerial = new Map(existingAssets.map((a) => [a.serial, a]));

    let assetsAdded = 0;
    let assetsUpdated = 0;

    for (const device of devices) {
      const assetData = ninjaDeviceToAssetData(device);

      // Resolve person by assignedUser display name — O(1) lookup
      let personLink: { assignedToId: string; assignedTo: string } | undefined;
      if (device.assignedUser) {
        const person = personByName.get(device.assignedUser.toLowerCase());
        if (person) personLink = { assignedToId: person.id, assignedTo: person.name };
      }

      const existing = assetBySerial.get(assetData.serial);

      if (existing) {
        await prisma.asset.update({ where: { id: existing.id }, data: { ...assetData, ...personLink } });
        assetsUpdated++;
      } else {
        const created = await prisma.asset.create({ data: { ...(assetData as Parameters<typeof prisma.asset.create>[0]['data']), ...personLink } });
        assetBySerial.set(assetData.serial, created);
        assetsAdded++;
      }
    }

    const syncResult = await prisma.syncResult.create({
      data: {
        integrationId: 'ninjaone',
        assetsAdded,
        assetsUpdated,
        errors: [],
      },
    });

    await prisma.integration.update({
      where: { id: 'ninjaone' },
      data: {
        status: 'Connected',
        lastSync: new Date(),
        syncCount: { increment: 1 },
        errorMessage: null,
      },
    });

    res.json({
      ok: true,
      result: syncResult,
      summary: { devices: devices.length, assetsAdded, assetsUpdated },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    await prisma.integration.update({
      where: { id: 'ninjaone' },
      data: { status: 'Error', errorMessage: message },
    });
    res.status(500).json({ error: message });
  }
});

// ─── POST /integrations/:id/disconnect ──────────────────────────────────────

router.post('/:id/disconnect', authenticate, requireRole('Admin', 'ITManager'), async (req, res) => {
  const id = param(req.params.id);
  const integration = await prisma.integration.findUnique({ where: { id } });
  if (!integration) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }

  await prisma.integration.update({
    where: { id },
    data: {
      status: 'Disconnected',
      configEncrypted: null,
      errorMessage: null,
    },
  });

  res.json({ ok: true });
});

export default router;
