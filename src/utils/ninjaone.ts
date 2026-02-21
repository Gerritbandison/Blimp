/**
 * NinjaOne RMM integration utility.
 *
 * In production this would make authenticated requests to:
 *   POST https://{instance}.ninjarmm.com/ws/oauth/token  (client_credentials grant)
 *   GET  https://{instance}.ninjarmm.com/v2/devices
 *   GET  https://{instance}.ninjarmm.com/v2/device/{id}/os-patch-installs
 *   GET  https://{instance}.ninjarmm.com/v2/device/{id}/software
 *
 * This module simulates those responses with realistic device data.
 */

import type { Asset, AssetType } from '../types';

export interface NinjaOneConfig {
  instanceUrl: string;   // e.g. "app.ninjarmm.com"
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
  'Online/offline status',
  'Alert & monitoring sync',
];

// ─── Simulated NinjaOne API response data ────────────────────────────────────
// Mirrors actual /v2/devices response shape

type NodeClass = 'WINDOWS_WORKSTATION' | 'MAC' | 'LINUX_WORKSTATION' | 'WINDOWS_SERVER';

interface NinjaDevice {
  id: number;
  organizationId: number;
  systemName: string;
  nodeClass: NodeClass;
  os: { name: string; version: string; buildNumber?: string; architecture: string };
  system: { manufacturer: string; model: string; biosSerialNumber: string; processorType: string };
  memory: { capacity: number }; // bytes
  volumes: { capacity: number; freeSpace: number; label: string }[];
  lastContact: string; // ISO timestamp
  online: boolean;
  patchStatus: 'COMPLETE' | 'PENDING' | 'FAILED';
  agentVersion: string;
  location: string;
  assignedUser?: string;
}

const NINJA_DEVICES: NinjaDevice[] = [
  {
    id: 1001, organizationId: 1, systemName: 'WIN-DESK-ENG01', nodeClass: 'WINDOWS_WORKSTATION',
    os: { name: 'Windows 11 Pro', version: '22H2', buildNumber: '22621.3007', architecture: 'x64' },
    system: { manufacturer: 'Dell', model: 'OptiPlex 7090', biosSerialNumber: 'OPX7090-001', processorType: 'Intel Core i7-11700' },
    memory: { capacity: 32_000_000_000 },
    volumes: [{ capacity: 512_000_000_000, freeSpace: 223_000_000_000, label: 'C:' }],
    lastContact: '2024-02-21T08:52:00Z', online: true, patchStatus: 'COMPLETE',
    agentVersion: '5.7.9002', location: 'London HQ', assignedUser: 'Oliver Smith',
  },
  {
    id: 1002, organizationId: 1, systemName: 'MAC-DESK-DES01', nodeClass: 'MAC',
    os: { name: 'macOS Sonoma', version: '14.3', architecture: 'arm64' },
    system: { manufacturer: 'Apple', model: 'Mac Studio M2 Max', biosSerialNumber: 'H9VTD3N2Q1', processorType: 'Apple M2 Max' },
    memory: { capacity: 96_000_000_000 },
    volumes: [{ capacity: 2_000_000_000_000, freeSpace: 1_400_000_000_000, label: 'Macintosh HD' }],
    lastContact: '2024-02-21T09:01:00Z', online: true, patchStatus: 'COMPLETE',
    agentVersion: '5.7.9002', location: 'London HQ', assignedUser: 'Sophie Patel',
  },
  {
    id: 1003, organizationId: 1, systemName: 'WIN-SRV-PROD01', nodeClass: 'WINDOWS_SERVER',
    os: { name: 'Windows Server 2022', version: '21H2', buildNumber: '20348.2159', architecture: 'x64' },
    system: { manufacturer: 'Dell', model: 'PowerEdge R750', biosSerialNumber: 'R750-PROD-001', processorType: 'Intel Xeon Gold 6338' },
    memory: { capacity: 256_000_000_000 },
    volumes: [
      { capacity: 480_000_000_000, freeSpace: 302_000_000_000, label: 'C:' },
      { capacity: 4_000_000_000_000, freeSpace: 2_100_000_000_000, label: 'D:' },
    ],
    lastContact: '2024-02-21T09:05:00Z', online: true, patchStatus: 'PENDING',
    agentVersion: '5.7.9002', location: 'Data Centre', assignedUser: undefined,
  },
  {
    id: 1004, organizationId: 1, systemName: 'WIN-LAPTOP-HR01', nodeClass: 'WINDOWS_WORKSTATION',
    os: { name: 'Windows 11 Pro', version: '22H2', buildNumber: '22621.3007', architecture: 'x64' },
    system: { manufacturer: 'HP', model: 'ProBook 450 G10', biosSerialNumber: 'PB450G10-001', processorType: 'Intel Core i5-1335U' },
    memory: { capacity: 16_000_000_000 },
    volumes: [{ capacity: 256_000_000_000, freeSpace: 87_000_000_000, label: 'C:' }],
    lastContact: '2024-02-21T07:34:00Z', online: false, patchStatus: 'COMPLETE',
    agentVersion: '5.7.9002', location: 'London HQ', assignedUser: 'Emma Clarke',
  },
  {
    id: 1005, organizationId: 1, systemName: 'MAC-LAPTOP-MKT02', nodeClass: 'MAC',
    os: { name: 'macOS Sonoma', version: '14.3', architecture: 'arm64' },
    system: { manufacturer: 'Apple', model: 'MacBook Pro 14"', biosSerialNumber: 'FVFG3M9RQ6LM', processorType: 'Apple M3 Pro' },
    memory: { capacity: 18_000_000_000 },
    volumes: [{ capacity: 512_000_000_000, freeSpace: 341_000_000_000, label: 'Macintosh HD' }],
    lastContact: '2024-02-21T08:48:00Z', online: true, patchStatus: 'COMPLETE',
    agentVersion: '5.7.9002', location: 'Remote', assignedUser: 'James Okafor',
  },
  {
    id: 1006, organizationId: 1, systemName: 'WIN-LAPTOP-FIN01', nodeClass: 'WINDOWS_WORKSTATION',
    os: { name: 'Windows 11 Enterprise', version: '22H2', buildNumber: '22621.3007', architecture: 'x64' },
    system: { manufacturer: 'Lenovo', model: 'ThinkPad T16 Gen 2', biosSerialNumber: 'LT16G2-FIN-001', processorType: 'Intel Core i7-1355U' },
    memory: { capacity: 16_000_000_000 },
    volumes: [{ capacity: 512_000_000_000, freeSpace: 291_000_000_000, label: 'C:' }],
    lastContact: '2024-02-21T08:09:00Z', online: true, patchStatus: 'COMPLETE',
    agentVersion: '5.7.9002', location: 'London HQ', assignedUser: 'Priya Sharma',
  },
  {
    id: 1007, organizationId: 1, systemName: 'WIN-SRV-DC01', nodeClass: 'WINDOWS_SERVER',
    os: { name: 'Windows Server 2022', version: '21H2', buildNumber: '20348.2159', architecture: 'x64' },
    system: { manufacturer: 'HP', model: 'ProLiant DL380 Gen10', biosSerialNumber: 'DL380-DC-001', processorType: 'Intel Xeon Silver 4210R' },
    memory: { capacity: 128_000_000_000 },
    volumes: [
      { capacity: 480_000_000_000, freeSpace: 389_000_000_000, label: 'C:' },
    ],
    lastContact: '2024-02-21T09:00:00Z', online: true, patchStatus: 'FAILED',
    agentVersion: '5.7.9002', location: 'Data Centre', assignedUser: undefined,
  },
  {
    id: 1008, organizationId: 1, systemName: 'LINUX-SRV-APP01', nodeClass: 'LINUX_WORKSTATION',
    os: { name: 'Ubuntu Server', version: '22.04.3 LTS', architecture: 'x64' },
    system: { manufacturer: 'Dell', model: 'PowerEdge R650', biosSerialNumber: 'R650-APP-001', processorType: 'Intel Xeon Silver 4316' },
    memory: { capacity: 64_000_000_000 },
    volumes: [
      { capacity: 480_000_000_000, freeSpace: 201_000_000_000, label: '/' },
      { capacity: 2_000_000_000_000, freeSpace: 1_100_000_000_000, label: '/data' },
    ],
    lastContact: '2024-02-21T09:05:00Z', online: true, patchStatus: 'COMPLETE',
    agentVersion: '5.7.9002', location: 'Data Centre', assignedUser: undefined,
  },
  {
    id: 1009, organizationId: 1, systemName: 'WIN-LAPTOP-ENG05', nodeClass: 'WINDOWS_WORKSTATION',
    os: { name: 'Windows 11 Pro', version: '22H2', buildNumber: '22621.2861', architecture: 'x64' },
    system: { manufacturer: 'Microsoft', model: 'Surface Laptop Studio 2', biosSerialNumber: 'MSLS2-ENG-005', processorType: 'Intel Core i7-13700H' },
    memory: { capacity: 32_000_000_000 },
    volumes: [{ capacity: 1_000_000_000_000, freeSpace: 672_000_000_000, label: 'C:' }],
    lastContact: '2024-02-21T08:28:00Z', online: true, patchStatus: 'COMPLETE',
    agentVersion: '5.7.9002', location: 'New York Office', assignedUser: 'Carlos Rivera',
  },
  {
    id: 1010, organizationId: 1, systemName: 'MAC-LAPTOP-ENG08', nodeClass: 'MAC',
    os: { name: 'macOS Sonoma', version: '14.2.1', architecture: 'arm64' },
    system: { manufacturer: 'Apple', model: 'MacBook Pro 16"', biosSerialNumber: 'C02ZT1RKMD6N', processorType: 'Apple M3 Max' },
    memory: { capacity: 64_000_000_000 },
    volumes: [{ capacity: 2_000_000_000_000, freeSpace: 1_201_000_000_000, label: 'Macintosh HD' }],
    lastContact: '2024-02-21T07:59:00Z', online: true, patchStatus: 'PENDING',
    agentVersion: '5.7.9002', location: 'Remote', assignedUser: 'Yuki Tanaka',
  },
];

function bytesToGB(bytes: number): string {
  return `${Math.round(bytes / 1_000_000_000)} GB`;
}

function nodeClassToAssetType(nc: NodeClass): AssetType {
  if (nc === 'WINDOWS_SERVER') return 'Server';
  if (nc === 'LINUX_WORKSTATION') return 'Server';
  return 'Laptop';
}

function patchBadge(status: string): string {
  if (status === 'COMPLETE') return 'Patches up to date ✓';
  if (status === 'PENDING') return 'Patches pending ⚠';
  return 'Patch failed ✗';
}

/** Validates NinjaOne credentials (simulated) */
export async function validateNinjaOneCredentials(
  _config: NinjaOneConfig
): Promise<{ ok: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 1500));
  return { ok: true };
}

/** Simulates a full device sync from NinjaOne /v2/devices */
export function syncNinjaOneDevices(integrationId: string): Promise<Asset[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const assets: Asset[] = NINJA_DEVICES.map((d) => {
        const primaryVolume = d.volumes[0];
        return {
          id: `${integrationId}-ninja-${d.id}`,
          tag: `NINJA-${d.system.biosSerialNumber}`,
          name: d.systemName,
          type: nodeClassToAssetType(d.nodeClass),
          make: d.system.manufacturer,
          model: d.system.model,
          serial: d.system.biosSerialNumber,
          status: 'Deployed' as const,
          assignedTo: d.assignedUser,
          location: d.location,
          purchaseDate: new Date(Date.now() - 365 * 2 * 86400000).toISOString().split('T')[0],
          warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          cost: 0,
          currency: 'USD',
          os: `${d.os.name} ${d.os.version}`,
          ram: bytesToGB(d.memory.capacity),
          storage: bytesToGB(primaryVolume.capacity),
          detectionSource: 'NinjaOne',
          notes: [
            `CPU: ${d.system.processorType}`,
            `Free Disk: ${bytesToGB(primaryVolume.freeSpace)}`,
            `${patchBadge(d.patchStatus)}`,
            `Status: ${d.online ? 'Online ●' : 'Offline ○'}`,
            `Agent: v${d.agentVersion}`,
            `Last Contact: ${new Date(d.lastContact).toLocaleString()}`,
          ].join(' · '),
        };
      });
      resolve(assets);
    }, 2000);
  });
}

export { NINJA_DEVICES };
