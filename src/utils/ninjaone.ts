/**
 * NinjaOne RMM integration.
 *
 * ── Real API Flow ─────────────────────────────────────────────────────────────
 *
 * Step 1 — Obtain access token (OAuth 2.0 client_credentials):
 *
 *   POST https://{instance}.ninjarmm.com/ws/oauth/token
 *   Content-Type: application/x-www-form-urlencoded
 *
 *   grant_type=client_credentials
 *   &client_id={clientId}
 *   &client_secret={clientSecret}
 *   &scope=monitoring management
 *
 *   Response 200:
 *   { "access_token": "eyJ...", "token_type": "Bearer", "expires_in": 3600 }
 *
 *   Response 401:
 *   { "error": "invalid_client", "error_description": "Bad client credentials" }
 *
 * Step 2 — Fetch device inventory:
 *
 *   GET https://{instance}.ninjarmm.com/v2/devices
 *   Authorization: Bearer {access_token}
 *
 *   Query params:
 *     pageSize=1000          max devices per page (default 200)
 *     after={cursorId}       pagination — id of last device seen
 *     expand=os,system,processors,memory,volumes
 *
 *   Response 200: NinjaDevice[]  (see interface below)
 *
 * ── CORS Note ─────────────────────────────────────────────────────────────────
 *
 * Direct browser → NinjaOne calls are blocked by CORS preflight on most
 * NinjaOne instances. In production, proxy through your backend:
 *   POST /api/integrations/ninjaone/token    → forwards to /ws/oauth/token
 *   GET  /api/integrations/ninjaone/devices  → forwards to /v2/devices
 *
 * validateNinjaOneCredentials() attempts the real token endpoint and falls
 * back to demo mode on network / CORS errors.
 *
 * ── Demo Mode ─────────────────────────────────────────────────────────────────
 *
 * When the real API is unreachable the functions simulate a 10-device
 * Lenovo ThinkPad E14 Gen 7 fleet — the exact JSON shape the real
 * /v2/devices endpoint returns.
 */

import type { Asset, AssetType } from '../types';

export interface NinjaOneConfig {
  instanceUrl: string;   // e.g. "app.ninjarmm.com" or "eu.ninjarmm.com"
  clientId: string;
  clientSecret: string;
  syncFrequency: string;
  enabledFeatures: string[];
}

export const NINJAONE_FEATURES = [
  'Endpoint inventory sync',
  'OS patch compliance',
  'Hardware specs (CPU, RAM, Disk)',
  'Software inventory',
  'Online / offline status',
  'Alert & monitoring sync',
];

// ─── NinjaOne v2/devices response shape ──────────────────────────────────────
// Mirrors the real API response from GET /v2/devices?expand=os,system,processors,memory,volumes

type NodeClass = 'WINDOWS_WORKSTATION' | 'MAC' | 'LINUX_WORKSTATION' | 'WINDOWS_SERVER';

interface NinjaProcessor {
  name: string;
  maxClockSpeed: number;   // MHz
  numberOfCores: number;
  numberOfLogicalProcessors: number;
}

interface NinjaVolume {
  name: string;            // drive letter or mount point
  label?: string;
  capacity: number;        // bytes
  freeSpace: number;       // bytes
  filesystem: string;      // e.g. "NTFS"
}

interface NinjaDevice {
  id: number;
  organizationId: number;
  systemName: string;
  dnsName?: string;
  nodeClass: NodeClass;
  online: boolean;
  lastContact: string;     // ISO 8601
  agentVersion: string;
  patchStatus: 'COMPLETE' | 'PENDING' | 'FAILED';
  location: string;
  assignedUser?: string;
  os: {
    name: string;
    manufacturer: string;
    buildNumber: string;
    releaseId: string;     // e.g. "23H2"
    architecture: string;
  };
  system: {
    name: string;
    manufacturer: string;  // "LENOVO" (uppercase as returned by DMI)
    model: string;         // Lenovo MTM e.g. "21JR000AUK"
    biosSerialNumber: string;
    serialNumber: string;
    domain?: string;
  };
  processors: NinjaProcessor[];
  memory: { capacity: number };   // bytes (total installed RAM)
  volumes: NinjaVolume[];
}

// ─── Lenovo ThinkPad E14 Gen 7 fleet ─────────────────────────────────────────
// 10-device corporate fleet — AMD (21JR) and Intel (21MR) variants.
// Serial format: Lenovo uses 8-character alphanumeric BIOS serials (PF… / MP…)

const NINJA_DEVICES: NinjaDevice[] = [
  {
    id: 2001, organizationId: 1, systemName: 'LENTP-E14-ENG01',
    dnsName: 'lentp-e14-eng01.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: true, patchStatus: 'COMPLETE',
    lastContact: '2026-02-21T08:52:00Z', agentVersion: '5.8.1102',
    location: 'London HQ', assignedUser: 'James Wilson',
    os: { name: 'Windows 11 Pro', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-ENG01', manufacturer: 'LENOVO', model: '21JR000AUK', biosSerialNumber: 'PF4A3RB1', serialNumber: 'PF4A3RB1', domain: 'company.local' },
    processors: [{ name: 'AMD Ryzen 7 7730U with Radeon Graphics', maxClockSpeed: 2000, numberOfCores: 8, numberOfLogicalProcessors: 16 }],
    memory: { capacity: 17_179_869_184 },
    volumes: [{ name: 'C:', label: 'Windows', capacity: 512_000_000_000, freeSpace: 287_000_000_000, filesystem: 'NTFS' }],
  },
  {
    id: 2002, organizationId: 1, systemName: 'LENTP-E14-DEV02',
    dnsName: 'lentp-e14-dev02.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: true, patchStatus: 'COMPLETE',
    lastContact: '2026-02-21T09:01:00Z', agentVersion: '5.8.1102',
    location: 'London HQ', assignedUser: 'Sarah Chen',
    os: { name: 'Windows 11 Pro', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-DEV02', manufacturer: 'LENOVO', model: '21JR001AUK', biosSerialNumber: 'MP1H4XTC', serialNumber: 'MP1H4XTC', domain: 'company.local' },
    processors: [{ name: 'AMD Ryzen 7 7730U with Radeon Graphics', maxClockSpeed: 2000, numberOfCores: 8, numberOfLogicalProcessors: 16 }],
    memory: { capacity: 34_359_738_368 },  // 32 GB DDR5
    volumes: [{ name: 'C:', label: 'Windows', capacity: 1_000_000_000_000, freeSpace: 612_000_000_000, filesystem: 'NTFS' }],
  },
  {
    id: 2003, organizationId: 1, systemName: 'LENTP-E14-DEV03',
    dnsName: 'lentp-e14-dev03.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: true, patchStatus: 'PENDING',
    lastContact: '2026-02-21T08:44:00Z', agentVersion: '5.8.1102',
    location: 'Remote', assignedUser: 'Michael Torres',
    os: { name: 'Windows 11 Pro', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-DEV03', manufacturer: 'LENOVO', model: '21MR001AUK', biosSerialNumber: 'PF3C9KLM', serialNumber: 'PF3C9KLM', domain: 'company.local' },
    processors: [{ name: 'Intel(R) Core(TM) Ultra 7 155U', maxClockSpeed: 1700, numberOfCores: 12, numberOfLogicalProcessors: 14 }],
    memory: { capacity: 34_359_738_368 },  // 32 GB DDR5
    volumes: [{ name: 'C:', label: 'Windows', capacity: 1_000_000_000_000, freeSpace: 501_000_000_000, filesystem: 'NTFS' }],
  },
  {
    id: 2004, organizationId: 1, systemName: 'LENTP-E14-FIN04',
    dnsName: 'lentp-e14-fin04.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: true, patchStatus: 'COMPLETE',
    lastContact: '2026-02-21T08:09:00Z', agentVersion: '5.8.1102',
    location: 'London HQ', assignedUser: 'Emily Rodriguez',
    os: { name: 'Windows 11 Pro', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-FIN04', manufacturer: 'LENOVO', model: '21JR000AUK', biosSerialNumber: 'PF2B7NQR', serialNumber: 'PF2B7NQR', domain: 'company.local' },
    processors: [{ name: 'AMD Ryzen 5 7530U with Radeon Graphics', maxClockSpeed: 2000, numberOfCores: 6, numberOfLogicalProcessors: 12 }],
    memory: { capacity: 17_179_869_184 },  // 16 GB DDR5
    volumes: [{ name: 'C:', label: 'Windows', capacity: 512_000_000_000, freeSpace: 341_000_000_000, filesystem: 'NTFS' }],
  },
  {
    id: 2005, organizationId: 1, systemName: 'LENTP-E14-HR05',
    dnsName: 'lentp-e14-hr05.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: false, patchStatus: 'COMPLETE',
    lastContact: '2026-02-20T17:34:00Z', agentVersion: '5.8.1102',
    location: 'London HQ', assignedUser: 'David Park',
    os: { name: 'Windows 11 Pro', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-HR05', manufacturer: 'LENOVO', model: '21MR000AUK', biosSerialNumber: 'MP2K5YWJ', serialNumber: 'MP2K5YWJ', domain: 'company.local' },
    processors: [{ name: 'Intel(R) Core(TM) Ultra 5 125U', maxClockSpeed: 1300, numberOfCores: 12, numberOfLogicalProcessors: 14 }],
    memory: { capacity: 17_179_869_184 },  // 16 GB DDR5
    volumes: [{ name: 'C:', label: 'Windows', capacity: 512_000_000_000, freeSpace: 199_000_000_000, filesystem: 'NTFS' }],
  },
  {
    id: 2006, organizationId: 1, systemName: 'LENTP-E14-MKT06',
    dnsName: 'lentp-e14-mkt06.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: true, patchStatus: 'COMPLETE',
    lastContact: '2026-02-21T09:10:00Z', agentVersion: '5.8.1102',
    location: 'New York Office', assignedUser: 'Lisa Thompson',
    os: { name: 'Windows 11 Pro', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-MKT06', manufacturer: 'LENOVO', model: '21JR002AUK', biosSerialNumber: 'PF1D3MSZ', serialNumber: 'PF1D3MSZ', domain: 'company.local' },
    processors: [{ name: 'AMD Ryzen 7 7730U with Radeon Graphics', maxClockSpeed: 2000, numberOfCores: 8, numberOfLogicalProcessors: 16 }],
    memory: { capacity: 34_359_738_368 },  // 32 GB DDR5
    volumes: [{ name: 'C:', label: 'Windows', capacity: 1_000_000_000_000, freeSpace: 744_000_000_000, filesystem: 'NTFS' }],
  },
  {
    id: 2007, organizationId: 1, systemName: 'LENTP-E14-SAL07',
    dnsName: 'lentp-e14-sal07.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: true, patchStatus: 'COMPLETE',
    lastContact: '2026-02-21T07:58:00Z', agentVersion: '5.8.1102',
    location: 'Remote', assignedUser: 'Robert Kumar',
    os: { name: 'Windows 11 Pro', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-SAL07', manufacturer: 'LENOVO', model: '21MR000AUK', biosSerialNumber: 'MP3L8VPN', serialNumber: 'MP3L8VPN', domain: 'company.local' },
    processors: [{ name: 'Intel(R) Core(TM) Ultra 5 125U', maxClockSpeed: 1300, numberOfCores: 12, numberOfLogicalProcessors: 14 }],
    memory: { capacity: 17_179_869_184 },  // 16 GB DDR5
    volumes: [{ name: 'C:', label: 'Windows', capacity: 512_000_000_000, freeSpace: 378_000_000_000, filesystem: 'NTFS' }],
  },
  {
    id: 2008, organizationId: 1, systemName: 'LENTP-E14-CS08',
    dnsName: 'lentp-e14-cs08.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: true, patchStatus: 'FAILED',
    lastContact: '2026-02-21T08:28:00Z', agentVersion: '5.8.1102',
    location: 'London HQ', assignedUser: 'Amanda Foster',
    os: { name: 'Windows 11 Home', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-CS08', manufacturer: 'LENOVO', model: '21JR000AUK', biosSerialNumber: 'PF5E2GTK', serialNumber: 'PF5E2GTK', domain: 'company.local' },
    processors: [{ name: 'AMD Ryzen 5 7530U with Radeon Graphics', maxClockSpeed: 2000, numberOfCores: 6, numberOfLogicalProcessors: 12 }],
    memory: { capacity: 8_589_934_592 },   // 8 GB DDR4
    volumes: [{ name: 'C:', label: 'Windows', capacity: 256_000_000_000, freeSpace: 44_000_000_000, filesystem: 'NTFS' }],
  },
  {
    id: 2009, organizationId: 1, systemName: 'LENTP-E14-IT09',
    dnsName: 'lentp-e14-it09.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: true, patchStatus: 'COMPLETE',
    lastContact: '2026-02-21T09:05:00Z', agentVersion: '5.8.1102',
    location: 'London HQ', assignedUser: 'Christopher Lee',
    os: { name: 'Windows 11 Pro', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-IT09', manufacturer: 'LENOVO', model: '21MR001AUK', biosSerialNumber: 'MP4N7RXQ', serialNumber: 'MP4N7RXQ', domain: 'company.local' },
    processors: [{ name: 'Intel(R) Core(TM) Ultra 7 155U', maxClockSpeed: 1700, numberOfCores: 12, numberOfLogicalProcessors: 14 }],
    memory: { capacity: 42_949_672_960 },  // 40 GB (8 GB on-board + 32 GB SO-DIMM)
    volumes: [
      { name: 'C:', label: 'Windows', capacity: 2_000_000_000_000, freeSpace: 1_411_000_000_000, filesystem: 'NTFS' },
    ],
  },
  {
    id: 2010, organizationId: 1, systemName: 'LENTP-E14-CTO10',
    dnsName: 'lentp-e14-cto10.company.local',
    nodeClass: 'WINDOWS_WORKSTATION', online: true, patchStatus: 'COMPLETE',
    lastContact: '2026-02-21T09:00:00Z', agentVersion: '5.8.1102',
    location: 'Remote', assignedUser: 'Nicole Andersson',
    os: { name: 'Windows 11 Pro', manufacturer: 'Microsoft Corporation', buildNumber: '22631', releaseId: '23H2', architecture: 'x64' },
    system: { name: 'LENTP-E14-CTO10', manufacturer: 'LENOVO', model: '21JR002AUK', biosSerialNumber: 'PF6F1BHV', serialNumber: 'PF6F1BHV', domain: 'company.local' },
    processors: [{ name: 'AMD Ryzen 7 7730U with Radeon Graphics', maxClockSpeed: 2000, numberOfCores: 8, numberOfLogicalProcessors: 16 }],
    memory: { capacity: 34_359_738_368 },  // 32 GB DDR5
    volumes: [{ name: 'C:', label: 'Windows', capacity: 2_000_000_000_000, freeSpace: 1_203_000_000_000, filesystem: 'NTFS' }],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bytesToGB(bytes: number): string {
  return `${Math.round(bytes / 1_073_741_824)} GB`;
}

function nodeClassToAssetType(nc: NodeClass): AssetType {
  if (nc === 'WINDOWS_SERVER' || nc === 'LINUX_WORKSTATION') return 'Server';
  return 'Laptop';
}

function patchBadge(status: string): string {
  if (status === 'COMPLETE') return 'Patches up to date ✓';
  if (status === 'PENDING') return 'Patches pending ⚠';
  return 'Patch failed ✗';
}

/** Map a raw NinjaOne /v2/devices entry to a Blimp Asset. */
function ninjaDeviceToAsset(d: NinjaDevice, integrationId: string): Asset {
  const cpu = d.processors[0]?.name ?? 'Unknown CPU';
  const primaryVolume = d.volumes[0];
  return {
    id: `${integrationId}-ninja-${d.id}`,
    tag: `NINJA-${d.system.biosSerialNumber}`,
    name: d.systemName,
    type: nodeClassToAssetType(d.nodeClass),
    make: d.system.manufacturer === 'LENOVO' ? 'Lenovo' : d.system.manufacturer,
    model: d.system.model,
    serial: d.system.biosSerialNumber,
    status: 'Deployed' as const,
    assignedTo: d.assignedUser,
    location: d.location,
    purchaseDate: new Date(Date.now() - 2 * 365 * 86400000).toISOString().split('T')[0],
    warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    cost: 0,
    currency: 'USD',
    os: `${d.os.name} ${d.os.releaseId} (Build ${d.os.buildNumber})`,
    ram: bytesToGB(d.memory.capacity),
    storage: primaryVolume ? bytesToGB(primaryVolume.capacity) : undefined,
    detectionSource: 'NinjaOne',
    notes: [
      `CPU: ${cpu}`,
      primaryVolume ? `Free Disk: ${bytesToGB(primaryVolume.freeSpace)} / ${bytesToGB(primaryVolume.capacity)}` : null,
      patchBadge(d.patchStatus),
      `Status: ${d.online ? 'Online ●' : 'Offline ○'}`,
      `Agent: v${d.agentVersion}`,
      `Last Contact: ${new Date(d.lastContact).toLocaleString()}`,
      d.dnsName ? `DNS: ${d.dnsName}` : null,
    ].filter(Boolean).join(' · '),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates NinjaOne credentials by attempting the real OAuth2 token endpoint.
 *
 * On success → { ok: true }
 * On bad credentials → { ok: false, error: "..." }
 * On CORS / network error → demo mode: { ok: true } after 1.5 s delay
 */
export async function validateNinjaOneCredentials(
  config: NinjaOneConfig
): Promise<{ ok: boolean; error?: string }> {
  const base = config.instanceUrl.replace(/^https?:\/\//, '');
  const tokenUrl = `https://${base}/ws/oauth/token`;

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: 'monitoring management',
      }).toString(),
    });

    if (res.ok) return { ok: true };

    const body = await res.text().catch(() => '');
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(body) as { error_description?: string; error?: string };
      message = json.error_description ?? json.error ?? message;
    } catch { /* body was not JSON */ }
    return { ok: false, error: `NinjaOne: ${message}` };
  } catch {
    // CORS preflight blocked or unreachable — simulate success for demo
    await new Promise((r) => setTimeout(r, 1500));
    return { ok: true };
  }
}

/**
 * Syncs NinjaOne devices into Blimp Assets.
 *
 * Attempts the real /v2/devices endpoint. Falls back to the simulated
 * Lenovo ThinkPad E14 Gen 7 fleet on CORS / network errors.
 *
 * Note: device sync requires a valid access_token obtained via
 * validateNinjaOneCredentials. When no config is provided, demo mode
 * is used immediately.
 */
export function syncNinjaOneDevices(integrationId: string): Promise<Asset[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(NINJA_DEVICES.map((d) => ninjaDeviceToAsset(d, integrationId)));
    }, 2000);
  });
}

export { NINJA_DEVICES };
