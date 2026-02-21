/**
 * Maps between Prisma models and the frontend JSON shapes.
 * Also maps raw Intune/NinjaOne API responses → Prisma-compatible data.
 */

import { AssetType, AssetStatus } from '@prisma/client';
import type { IntuneManagedDevice } from '../services/intune.js';
import type { NinjaDevice } from '../services/ninjaone.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function bytesToGB(bytes: number): string {
  return `${Math.round(bytes / 1_073_741_824)} GB`;
}

// ─── Asset status / type string mapping ─────────────────────────────────────

const ASSET_STATUS_TO_DB: Record<string, string> = {
  'Deployed': 'Deployed',
  'In Stock': 'InStock',
  'In Repair': 'InRepair',
  'Retired': 'Retired',
  'Lost': 'Lost',
};

const ASSET_STATUS_FROM_DB: Record<string, string> = {
  'Deployed': 'Deployed',
  'InStock': 'In Stock',
  'InRepair': 'In Repair',
  'Retired': 'Retired',
  'Lost': 'Lost',
};

const APP_STATUS_TO_DB: Record<string, string> = {
  'Active': 'Active',
  'Inactive': 'Inactive',
  'Pending': 'Pending',
  'Expired': 'Expired',
  'In Review': 'InReview',
  'Shadow IT': 'ShadowIT',
};

const APP_STATUS_FROM_DB: Record<string, string> = {
  'Active': 'Active',
  'Inactive': 'Inactive',
  'Pending': 'Pending',
  'Expired': 'Expired',
  'InReview': 'In Review',
  'ShadowIT': 'Shadow IT',
};

const LICENSE_TYPE_TO_DB: Record<string, string> = {
  'Per User': 'PerUser',
  'Per Device': 'PerDevice',
  'Site': 'Site',
  'Enterprise': 'Enterprise',
  'Open Source': 'OpenSource',
};

const LICENSE_TYPE_FROM_DB: Record<string, string> = {
  'PerUser': 'Per User',
  'PerDevice': 'Per Device',
  'Site': 'Site',
  'Enterprise': 'Enterprise',
  'OpenSource': 'Open Source',
};

const INTEGRATION_STATUS_FROM_DB: Record<string, string> = {
  'Connected': 'Connected',
  'Disconnected': 'Disconnected',
  'Error': 'Error',
  'Syncing': 'Syncing',
};

export function mapAssetStatusToDb(status: string): string {
  return ASSET_STATUS_TO_DB[status] || status;
}

export function mapAssetStatusFromDb(status: string): string {
  return ASSET_STATUS_FROM_DB[status] || status;
}

export function mapAppStatusToDb(status: string): string {
  return APP_STATUS_TO_DB[status] || status;
}

export function mapAppStatusFromDb(status: string): string {
  return APP_STATUS_FROM_DB[status] || status;
}

export function mapLicenseTypeToDb(type: string): string {
  return LICENSE_TYPE_TO_DB[type] || type;
}

export function mapLicenseTypeFromDb(type: string): string {
  return LICENSE_TYPE_FROM_DB[type] || type;
}

export function mapIntegrationStatusFromDb(status: string): string {
  return INTEGRATION_STATUS_FROM_DB[status] || status;
}

// ─── Intune device → Prisma Asset data ──────────────────────────────────────

function osToAssetType(os: string): AssetType {
  if (os === 'iOS') return AssetType.Phone;
  if (os === 'iPadOS') return AssetType.Tablet;
  return AssetType.Laptop;
}

export function intuneDeviceToAssetData(d: IntuneManagedDevice) {
  return {
    tag: `INTUNE-${d.serialNumber}`,
    name: d.deviceName,
    type: osToAssetType(d.operatingSystem),
    make: d.manufacturer === 'LENOVO' ? 'Lenovo' : d.manufacturer,
    model: d.model,
    serial: d.serialNumber,
    status: AssetStatus.Deployed,
    assignedTo: d.userDisplayName || undefined,
    location: 'Microsoft Intune',
    purchaseDate: new Date(d.enrolledDateTime),
    warrantyExpiry: new Date(Date.now() + 2 * 365 * 86400000),
    cost: 0,
    currency: 'USD',
    os: `${d.operatingSystem} ${d.osVersion}`,
    ram: bytesToGB(d.physicalMemoryInBytes),
    storage: bytesToGB(d.totalStorageSpaceInBytes),
    detectionSource: 'Microsoft Intune',
    notes: [
      `Compliance: ${d.complianceState === 'compliant' ? 'Compliant' : 'Non-compliant'}`,
      `Last Sync: ${new Date(d.lastSyncDateTime).toISOString()}`,
      `Architecture: ${d.processorArchitecture}`,
      `Free Storage: ${bytesToGB(d.freeStorageSpaceInBytes)} / ${bytesToGB(d.totalStorageSpaceInBytes)}`,
      `BitLocker: ${d.isEncrypted ? 'Enabled' : 'Not encrypted'}`,
      `Autopilot: ${d.autopilotEnrolled ? 'Yes' : 'No'}`,
      `Entra ID: ${d.azureActiveDirectoryDeviceId}`,
    ].join(' | '),
  };
}

// ─── NinjaOne device → Prisma Asset data ────────────────────────────────────

function nodeClassToAssetType(nc: string): AssetType {
  if (nc === 'WINDOWS_SERVER' || nc === 'LINUX_WORKSTATION') return AssetType.Server;
  return AssetType.Laptop;
}

export function ninjaDeviceToAssetData(d: NinjaDevice) {
  const cpu = d.processors[0]?.name ?? 'Unknown CPU';
  const primaryVolume = d.volumes[0];
  return {
    tag: `NINJA-${d.system.biosSerialNumber}`,
    name: d.systemName,
    type: nodeClassToAssetType(d.nodeClass),
    make: d.system.manufacturer === 'LENOVO' ? 'Lenovo' : d.system.manufacturer,
    model: d.system.model,
    serial: d.system.biosSerialNumber,
    status: AssetStatus.Deployed,
    assignedTo: d.assignedUser || undefined,
    location: d.location,
    purchaseDate: new Date(Date.now() - 2 * 365 * 86400000),
    warrantyExpiry: new Date(Date.now() + 365 * 86400000),
    cost: 0,
    currency: 'USD',
    os: `${d.os.name} ${d.os.releaseId} (Build ${d.os.buildNumber})`,
    ram: bytesToGB(d.memory.capacity),
    storage: primaryVolume ? bytesToGB(primaryVolume.capacity) : undefined,
    detectionSource: 'NinjaOne',
    notes: [
      `CPU: ${cpu}`,
      primaryVolume ? `Free Disk: ${bytesToGB(primaryVolume.freeSpace)} / ${bytesToGB(primaryVolume.capacity)}` : null,
      `Patches: ${d.patchStatus}`,
      `Status: ${d.online ? 'Online' : 'Offline'}`,
      `Agent: v${d.agentVersion}`,
      `Last Contact: ${d.lastContact}`,
      d.dnsName ? `DNS: ${d.dnsName}` : null,
    ].filter(Boolean).join(' | '),
  };
}
