/**
 * Microsoft Intune / Graph API integration utility.
 *
 * In production this would make authenticated requests to:
 *   GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices
 *   GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/{id}/deviceCompliancePolicyStates
 *   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
 *
 * This module simulates those responses with realistic device data.
 */

import type { Asset, AssetType } from '../types';

export interface IntuneConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  syncFrequency: string;
  enabledFeatures: string[];
}

export const INTUNE_FEATURES = [
  'Device inventory sync',
  'Compliance status',
  'OS version & patch level',
  'Hardware specs (RAM, CPU, Storage)',
  'App deployment tracking',
  'Entra ID user assignment',
];

export const INTUNE_SCOPES = [
  'DeviceManagementManagedDevices.Read.All',
  'DeviceManagementConfiguration.Read.All',
  'User.Read.All',
];

/** Required OAuth2 scopes for the Graph API calls Blimp needs */
export const INTUNE_REQUIRED_PERMISSIONS = [
  { api: 'Microsoft Graph', permission: 'DeviceManagementManagedDevices.Read.All', type: 'Application' },
  { api: 'Microsoft Graph', permission: 'DeviceManagementConfiguration.Read.All', type: 'Application' },
  { api: 'Microsoft Graph', permission: 'User.Read.All', type: 'Application' },
];

// ─── Simulated Graph API response data ───────────────────────────────────────
// Mirrors the actual /deviceManagement/managedDevices response shape

const INTUNE_MANAGED_DEVICES = [
  {
    id: 'intune-d1', deviceName: 'LAPTOP-ENG-042', operatingSystem: 'Windows',
    osVersion: '10.0.22621.3007', complianceState: 'compliant',
    manufacturer: 'Dell', model: 'Latitude 5540', serialNumber: 'DL5540-0042',
    totalStorageSpaceInBytes: 512_000_000_000, freeStorageSpaceInBytes: 187_000_000_000,
    physicalMemoryInBytes: 16_000_000_000, processorArchitecture: 'x64',
    userPrincipalName: 'j.smith@company.com', userDisplayName: 'James Smith',
    enrolledDateTime: '2023-03-15T09:00:00Z', lastSyncDateTime: '2024-02-21T07:12:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-d1',
  },
  {
    id: 'intune-d2', deviceName: 'LAPTOP-MKT-017', operatingSystem: 'Windows',
    osVersion: '10.0.22621.3007', complianceState: 'compliant',
    manufacturer: 'HP', model: 'EliteBook 845 G10', serialNumber: 'HP845G10-0017',
    totalStorageSpaceInBytes: 256_000_000_000, freeStorageSpaceInBytes: 98_000_000_000,
    physicalMemoryInBytes: 16_000_000_000, processorArchitecture: 'x64',
    userPrincipalName: 'a.johnson@company.com', userDisplayName: 'Anna Johnson',
    enrolledDateTime: '2023-06-01T09:00:00Z', lastSyncDateTime: '2024-02-21T06:58:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-d2',
  },
  {
    id: 'intune-d3', deviceName: 'MACBOOK-DEV-009', operatingSystem: 'macOS',
    osVersion: '14.3', complianceState: 'compliant',
    manufacturer: 'Apple', model: 'MacBook Pro 16-inch', serialNumber: 'C02ZT0RKMD6N',
    totalStorageSpaceInBytes: 1_000_000_000_000, freeStorageSpaceInBytes: 420_000_000_000,
    physicalMemoryInBytes: 32_000_000_000, processorArchitecture: 'arm64',
    userPrincipalName: 'l.chen@company.com', userDisplayName: 'Lisa Chen',
    enrolledDateTime: '2023-01-10T09:00:00Z', lastSyncDateTime: '2024-02-21T08:01:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'userEnrollment',
    azureActiveDirectoryDeviceId: 'aad-d3',
  },
  {
    id: 'intune-d4', deviceName: 'SURFACE-FIN-003', operatingSystem: 'Windows',
    osVersion: '10.0.22621.3007', complianceState: 'noncompliant',
    manufacturer: 'Microsoft', model: 'Surface Pro 9', serialNumber: 'MSP9-FIN-003',
    totalStorageSpaceInBytes: 256_000_000_000, freeStorageSpaceInBytes: 55_000_000_000,
    physicalMemoryInBytes: 8_000_000_000, processorArchitecture: 'x64',
    userPrincipalName: 'r.patel@company.com', userDisplayName: 'Raj Patel',
    enrolledDateTime: '2023-09-20T09:00:00Z', lastSyncDateTime: '2024-02-20T14:33:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-d4',
  },
  {
    id: 'intune-d5', deviceName: 'IPHONE-OPS-031', operatingSystem: 'iOS',
    osVersion: '17.3', complianceState: 'compliant',
    manufacturer: 'Apple', model: 'iPhone 15 Pro', serialNumber: 'FPRMVX2T0041',
    totalStorageSpaceInBytes: 128_000_000_000, freeStorageSpaceInBytes: 47_000_000_000,
    physicalMemoryInBytes: 8_000_000_000, processorArchitecture: 'arm64',
    userPrincipalName: 'k.martinez@company.com', userDisplayName: 'Kate Martinez',
    enrolledDateTime: '2023-11-01T09:00:00Z', lastSyncDateTime: '2024-02-21T08:30:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'deviceEnrollmentManager',
    azureActiveDirectoryDeviceId: 'aad-d5',
  },
  {
    id: 'intune-d6', deviceName: 'LAPTOP-HR-022', operatingSystem: 'Windows',
    osVersion: '10.0.22621.2861', complianceState: 'compliant',
    manufacturer: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 11', serialNumber: 'LX1C11-0022',
    totalStorageSpaceInBytes: 512_000_000_000, freeStorageSpaceInBytes: 201_000_000_000,
    physicalMemoryInBytes: 16_000_000_000, processorArchitecture: 'x64',
    userPrincipalName: 'b.thompson@company.com', userDisplayName: 'Beth Thompson',
    enrolledDateTime: '2023-04-12T09:00:00Z', lastSyncDateTime: '2024-02-21T07:45:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-d6',
  },
  {
    id: 'intune-d7', deviceName: 'MACBOOK-DES-014', operatingSystem: 'macOS',
    osVersion: '14.3', complianceState: 'compliant',
    manufacturer: 'Apple', model: 'MacBook Air M2', serialNumber: 'FVFF2JXRQ6LX',
    totalStorageSpaceInBytes: 512_000_000_000, freeStorageSpaceInBytes: 389_000_000_000,
    physicalMemoryInBytes: 16_000_000_000, processorArchitecture: 'arm64',
    userPrincipalName: 'd.wu@company.com', userDisplayName: 'David Wu',
    enrolledDateTime: '2023-08-15T09:00:00Z', lastSyncDateTime: '2024-02-21T08:10:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'userEnrollment',
    azureActiveDirectoryDeviceId: 'aad-d7',
  },
  {
    id: 'intune-d8', deviceName: 'TABLET-EXEC-007', operatingSystem: 'Windows',
    osVersion: '10.0.22621.3007', complianceState: 'compliant',
    manufacturer: 'Microsoft', model: 'Surface Laptop 5', serialNumber: 'MSLL5-EXEC-007',
    totalStorageSpaceInBytes: 256_000_000_000, freeStorageSpaceInBytes: 178_000_000_000,
    physicalMemoryInBytes: 16_000_000_000, processorArchitecture: 'x64',
    userPrincipalName: 'ceo@company.com', userDisplayName: 'Sarah Williams',
    enrolledDateTime: '2023-02-01T09:00:00Z', lastSyncDateTime: '2024-02-21T09:00:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-d8',
  },
  {
    id: 'intune-d9', deviceName: 'LAPTOP-ENG-058', operatingSystem: 'Windows',
    osVersion: '10.0.22621.3007', complianceState: 'noncompliant',
    manufacturer: 'Dell', model: 'Precision 5570', serialNumber: 'DLP5570-0058',
    totalStorageSpaceInBytes: 1_000_000_000_000, freeStorageSpaceInBytes: 512_000_000_000,
    physicalMemoryInBytes: 32_000_000_000, processorArchitecture: 'x64',
    userPrincipalName: 'p.nguyen@company.com', userDisplayName: 'Peter Nguyen',
    enrolledDateTime: '2023-05-20T09:00:00Z', lastSyncDateTime: '2024-02-21T05:55:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-d9',
  },
  {
    id: 'intune-d10', deviceName: 'IPAD-SALES-012', operatingSystem: 'iPadOS',
    osVersion: '17.3', complianceState: 'compliant',
    manufacturer: 'Apple', model: 'iPad Pro 12.9"', serialNumber: 'DMPYX3CH0003',
    totalStorageSpaceInBytes: 256_000_000_000, freeStorageSpaceInBytes: 189_000_000_000,
    physicalMemoryInBytes: 8_000_000_000, processorArchitecture: 'arm64',
    userPrincipalName: 't.garcia@company.com', userDisplayName: 'Tom Garcia',
    enrolledDateTime: '2023-10-05T09:00:00Z', lastSyncDateTime: '2024-02-21T07:20:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'deviceEnrollmentManager',
    azureActiveDirectoryDeviceId: 'aad-d10',
  },
];

function bytesToGB(bytes: number): string {
  return `${Math.round(bytes / 1_000_000_000)} GB`;
}

function osToAssetType(os: string): AssetType {
  if (os === 'iOS' || os === 'iPadOS') return os === 'iPadOS' ? 'Tablet' : 'Phone';
  if (os === 'macOS' || os === 'Windows') return 'Laptop';
  return 'Other';
}

function complianceBadge(state: string): string {
  return state === 'compliant' ? 'Compliant ✓' : 'Non-compliant ✗';
}

/** Validates Intune credentials (simulated — always succeeds after 1.5s) */
export async function validateIntuneCredentials(
  _config: IntuneConfig
): Promise<{ ok: boolean; error?: string }> {
  await new Promise((r) => setTimeout(r, 1800));
  // In a real app: POST to /api/integrations/intune/validate
  return { ok: true };
}

/** Simulates a full device sync from Intune Graph API */
export function syncIntuneDevices(integrationId: string): Promise<Asset[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const assets: Asset[] = INTUNE_MANAGED_DEVICES.map((d) => ({
        id: `${integrationId}-${d.id}`,
        tag: `INTUNE-${d.serialNumber}`,
        name: d.deviceName,
        type: osToAssetType(d.operatingSystem),
        make: d.manufacturer,
        model: d.model,
        serial: d.serialNumber,
        status: 'Deployed' as const,
        assignedTo: d.userDisplayName,
        location: 'Microsoft Intune',
        purchaseDate: d.enrolledDateTime.split('T')[0],
        warrantyExpiry: new Date(Date.now() + 2 * 365 * 86400000).toISOString().split('T')[0],
        cost: 0,
        currency: 'USD',
        os: `${d.operatingSystem} ${d.osVersion}`,
        ram: bytesToGB(d.physicalMemoryInBytes),
        storage: bytesToGB(d.totalStorageSpaceInBytes),
        detectionSource: 'Microsoft Intune',
        notes: [
          `Compliance: ${complianceBadge(d.complianceState)}`,
          `Last Intune Sync: ${new Date(d.lastSyncDateTime).toLocaleString()}`,
          `Architecture: ${d.processorArchitecture}`,
          `Free Storage: ${bytesToGB(d.freeStorageSpaceInBytes)}`,
          `Entra ID: ${d.azureActiveDirectoryDeviceId}`,
          `Enrollment: ${d.deviceEnrollmentType}`,
        ].join(' · '),
      }));
      resolve(assets);
    }, 2200);
  });
}

export { INTUNE_MANAGED_DEVICES };
