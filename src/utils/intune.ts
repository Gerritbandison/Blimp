/**
 * Microsoft Intune / Graph API integration.
 *
 * ── Real API Flow ─────────────────────────────────────────────────────────────
 *
 * Step 1 — Obtain access token (OAuth 2.0 client_credentials via Azure AD):
 *
 *   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
 *   Content-Type: application/x-www-form-urlencoded
 *
 *   grant_type=client_credentials
 *   &client_id={clientId}
 *   &client_secret={clientSecret}
 *   &scope=https://graph.microsoft.com/.default
 *
 *   Response 200:
 *   { "access_token": "eyJ...", "token_type": "Bearer", "expires_in": 3599 }
 *
 *   Response 401:
 *   { "error": "invalid_client", "error_description": "AADSTS70011: ..." }
 *
 * Step 2 — Fetch managed devices (Intune):
 *
 *   GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices
 *   Authorization: Bearer {access_token}
 *
 *   Optional OData query params:
 *     $top=999                 max items per page
 *     $select=id,deviceName,operatingSystem,osVersion,complianceState,
 *             manufacturer,model,serialNumber,totalStorageSpaceInBytes,
 *             freeStorageSpaceInBytes,physicalMemoryInBytes,
 *             processorArchitecture,userPrincipalName,userDisplayName,
 *             enrolledDateTime,lastSyncDateTime,managedDeviceOwnerType,
 *             deviceEnrollmentType,azureActiveDirectoryDeviceId,
 *             isEncrypted,autopilotEnrolled,managementAgent
 *
 *   Response 200: { "@odata.context": "...", "value": IntuneManagedDevice[] }
 *
 * Step 3 (optional) — Fetch Entra ID users for People sync:
 *
 *   GET https://graph.microsoft.com/v1.0/users
 *   Authorization: Bearer {access_token}
 *   $select=id,displayName,mail,department,jobTitle,accountEnabled
 *
 * ── Required App Permissions (Application type, admin consent required) ───────
 *
 *   Microsoft Graph → DeviceManagementManagedDevices.Read.All
 *   Microsoft Graph → DeviceManagementConfiguration.Read.All
 *   Microsoft Graph → User.Read.All
 *
 * ── CORS Note ─────────────────────────────────────────────────────────────────
 *
 * The Azure AD token endpoint (login.microsoftonline.com) supports CORS for
 * browser requests. The Graph API (graph.microsoft.com) also supports CORS.
 * However, client_secret flows should only run server-side in production.
 * Route through a backend proxy to avoid exposing secrets in browser bundles.
 *
 * validateIntuneCredentials() attempts the real token endpoint and falls back
 * to demo mode on network errors.
 *
 * ── Demo Mode ─────────────────────────────────────────────────────────────────
 *
 * When the real API is unreachable, functions simulate a 10-device Lenovo
 * ThinkPad E14 Gen 7 Intune-enrolled fleet matching the real Graph API shape.
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

/** Required app permissions — shown in the connection wizard */
export const INTUNE_REQUIRED_PERMISSIONS = [
  { api: 'Microsoft Graph', permission: 'DeviceManagementManagedDevices.Read.All', type: 'Application' },
  { api: 'Microsoft Graph', permission: 'DeviceManagementConfiguration.Read.All', type: 'Application' },
  { api: 'Microsoft Graph', permission: 'User.Read.All', type: 'Application' },
];

// ─── Graph API managedDevice response shape ───────────────────────────────────
// GET /v1.0/deviceManagement/managedDevices — mirrors actual response fields

interface IntuneManagedDevice {
  id: string;                         // Graph object ID (GUID)
  deviceName: string;
  operatingSystem: string;            // "Windows" | "macOS" | "iOS" | "iPadOS" | "Android"
  osVersion: string;                  // e.g. "10.0.22631.3235"
  complianceState: 'compliant' | 'noncompliant' | 'unknown' | 'notApplicable';
  manufacturer: string;               // "LENOVO" as reported by firmware
  model: string;                      // Lenovo MTM, e.g. "21JR000AUK"
  serialNumber: string;
  totalStorageSpaceInBytes: number;
  freeStorageSpaceInBytes: number;
  physicalMemoryInBytes: number;
  processorArchitecture: string;      // "x64" | "arm64" | "x86"
  userPrincipalName: string;
  userDisplayName: string;
  enrolledDateTime: string;           // ISO 8601
  lastSyncDateTime: string;           // ISO 8601
  managedDeviceOwnerType: 'company' | 'personal';
  deviceEnrollmentType: string;       // "windowsAzureADJoin" | "userEnrollment" | ...
  azureActiveDirectoryDeviceId: string;
  isEncrypted: boolean;
  autopilotEnrolled: boolean;
  managementAgent: string;            // "mdm" | "configurationManagerClientMdm" | ...
}

// ─── Lenovo ThinkPad E14 Gen 7 — Intune-enrolled fleet ───────────────────────
// 10 employees · Windows 11 Pro · Entra ID joined · Autopilot provisioned
// Serial format: same as NinjaOne (PF…/MP… 8-char BIOS serials)

const INTUNE_MANAGED_DEVICES: IntuneManagedDevice[] = [
  {
    id: 'e14g7-intune-001', deviceName: 'LENTP-E14-ENG01',
    operatingSystem: 'Windows', osVersion: '10.0.22631.3235',
    complianceState: 'compliant',
    manufacturer: 'LENOVO', model: '21JR000AUK', serialNumber: 'PF4A3RB1',
    totalStorageSpaceInBytes: 512_000_000_000, freeStorageSpaceInBytes: 287_000_000_000,
    physicalMemoryInBytes: 17_179_869_184, processorArchitecture: 'x64',
    userPrincipalName: 'j.wilson@company.com', userDisplayName: 'James Wilson',
    enrolledDateTime: '2025-06-15T09:00:00Z', lastSyncDateTime: '2026-02-21T08:52:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-001', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
  {
    id: 'e14g7-intune-002', deviceName: 'LENTP-E14-DEV02',
    operatingSystem: 'Windows', osVersion: '10.0.22631.3235',
    complianceState: 'compliant',
    manufacturer: 'LENOVO', model: '21JR001AUK', serialNumber: 'MP1H4XTC',
    totalStorageSpaceInBytes: 1_000_000_000_000, freeStorageSpaceInBytes: 612_000_000_000,
    physicalMemoryInBytes: 34_359_738_368, processorArchitecture: 'x64',
    userPrincipalName: 's.chen@company.com', userDisplayName: 'Sarah Chen',
    enrolledDateTime: '2025-06-15T09:00:00Z', lastSyncDateTime: '2026-02-21T09:01:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-002', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
  {
    id: 'e14g7-intune-003', deviceName: 'LENTP-E14-DEV03',
    operatingSystem: 'Windows', osVersion: '10.0.22631.3235',
    complianceState: 'compliant',
    manufacturer: 'LENOVO', model: '21MR001AUK', serialNumber: 'PF3C9KLM',
    totalStorageSpaceInBytes: 1_000_000_000_000, freeStorageSpaceInBytes: 501_000_000_000,
    physicalMemoryInBytes: 34_359_738_368, processorArchitecture: 'x64',
    userPrincipalName: 'm.torres@company.com', userDisplayName: 'Michael Torres',
    enrolledDateTime: '2025-07-01T09:00:00Z', lastSyncDateTime: '2026-02-21T08:44:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-003', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
  {
    id: 'e14g7-intune-004', deviceName: 'LENTP-E14-FIN04',
    operatingSystem: 'Windows', osVersion: '10.0.22631.3235',
    complianceState: 'compliant',
    manufacturer: 'LENOVO', model: '21JR000AUK', serialNumber: 'PF2B7NQR',
    totalStorageSpaceInBytes: 512_000_000_000, freeStorageSpaceInBytes: 341_000_000_000,
    physicalMemoryInBytes: 17_179_869_184, processorArchitecture: 'x64',
    userPrincipalName: 'e.rodriguez@company.com', userDisplayName: 'Emily Rodriguez',
    enrolledDateTime: '2025-06-15T09:00:00Z', lastSyncDateTime: '2026-02-21T08:09:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-004', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
  {
    id: 'e14g7-intune-005', deviceName: 'LENTP-E14-HR05',
    operatingSystem: 'Windows', osVersion: '10.0.22631.3235',
    complianceState: 'compliant',
    manufacturer: 'LENOVO', model: '21MR000AUK', serialNumber: 'MP2K5YWJ',
    totalStorageSpaceInBytes: 512_000_000_000, freeStorageSpaceInBytes: 199_000_000_000,
    physicalMemoryInBytes: 17_179_869_184, processorArchitecture: 'x64',
    userPrincipalName: 'd.park@company.com', userDisplayName: 'David Park',
    enrolledDateTime: '2025-08-01T09:00:00Z', lastSyncDateTime: '2026-02-20T17:34:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-005', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
  {
    id: 'e14g7-intune-006', deviceName: 'LENTP-E14-MKT06',
    operatingSystem: 'Windows', osVersion: '10.0.22631.3235',
    complianceState: 'compliant',
    manufacturer: 'LENOVO', model: '21JR002AUK', serialNumber: 'PF1D3MSZ',
    totalStorageSpaceInBytes: 1_000_000_000_000, freeStorageSpaceInBytes: 744_000_000_000,
    physicalMemoryInBytes: 34_359_738_368, processorArchitecture: 'x64',
    userPrincipalName: 'l.thompson@company.com', userDisplayName: 'Lisa Thompson',
    enrolledDateTime: '2025-09-01T09:00:00Z', lastSyncDateTime: '2026-02-21T09:10:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-006', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
  {
    id: 'e14g7-intune-007', deviceName: 'LENTP-E14-SAL07',
    operatingSystem: 'Windows', osVersion: '10.0.22631.3235',
    complianceState: 'compliant',
    manufacturer: 'LENOVO', model: '21MR000AUK', serialNumber: 'MP3L8VPN',
    totalStorageSpaceInBytes: 512_000_000_000, freeStorageSpaceInBytes: 378_000_000_000,
    physicalMemoryInBytes: 17_179_869_184, processorArchitecture: 'x64',
    userPrincipalName: 'r.kumar@company.com', userDisplayName: 'Robert Kumar',
    enrolledDateTime: '2025-06-15T09:00:00Z', lastSyncDateTime: '2026-02-21T07:58:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-007', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
  {
    id: 'e14g7-intune-008', deviceName: 'LENTP-E14-CS08',
    operatingSystem: 'Windows', osVersion: '10.0.22631.2861',
    complianceState: 'noncompliant',   // Low disk space triggers noncompliance policy
    manufacturer: 'LENOVO', model: '21JR000AUK', serialNumber: 'PF5E2GTK',
    totalStorageSpaceInBytes: 256_000_000_000, freeStorageSpaceInBytes: 44_000_000_000,
    physicalMemoryInBytes: 8_589_934_592, processorArchitecture: 'x64',
    userPrincipalName: 'a.foster@company.com', userDisplayName: 'Amanda Foster',
    enrolledDateTime: '2025-10-01T09:00:00Z', lastSyncDateTime: '2026-02-21T08:28:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-008', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
  {
    id: 'e14g7-intune-009', deviceName: 'LENTP-E14-IT09',
    operatingSystem: 'Windows', osVersion: '10.0.22631.3235',
    complianceState: 'compliant',
    manufacturer: 'LENOVO', model: '21MR001AUK', serialNumber: 'MP4N7RXQ',
    totalStorageSpaceInBytes: 2_000_000_000_000, freeStorageSpaceInBytes: 1_411_000_000_000,
    physicalMemoryInBytes: 42_949_672_960, processorArchitecture: 'x64',
    userPrincipalName: 'c.lee@company.com', userDisplayName: 'Christopher Lee',
    enrolledDateTime: '2025-06-15T09:00:00Z', lastSyncDateTime: '2026-02-21T09:05:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-009', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
  {
    id: 'e14g7-intune-010', deviceName: 'LENTP-E14-CTO10',
    operatingSystem: 'Windows', osVersion: '10.0.22631.3235',
    complianceState: 'compliant',
    manufacturer: 'LENOVO', model: '21JR002AUK', serialNumber: 'PF6F1BHV',
    totalStorageSpaceInBytes: 2_000_000_000_000, freeStorageSpaceInBytes: 1_203_000_000_000,
    physicalMemoryInBytes: 34_359_738_368, processorArchitecture: 'x64',
    userPrincipalName: 'n.andersson@company.com', userDisplayName: 'Nicole Andersson',
    enrolledDateTime: '2025-06-15T09:00:00Z', lastSyncDateTime: '2026-02-21T09:00:00Z',
    managedDeviceOwnerType: 'company', deviceEnrollmentType: 'windowsAzureADJoin',
    azureActiveDirectoryDeviceId: 'aad-e14-010', isEncrypted: true, autopilotEnrolled: true,
    managementAgent: 'mdm',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bytesToGB(bytes: number): string {
  return `${Math.round(bytes / 1_073_741_824)} GB`;
}

function osToAssetType(os: string): AssetType {
  if (os === 'iOS') return 'Phone';
  if (os === 'iPadOS') return 'Tablet';
  return 'Laptop';
}

function complianceBadge(state: string): string {
  return state === 'compliant' ? 'Compliant ✓' : 'Non-compliant ✗';
}

/** Map a raw Graph API managedDevice to a Blimp Asset. */
function intuneDeviceToAsset(d: IntuneManagedDevice, integrationId: string): Asset {
  return {
    id: `${integrationId}-${d.id}`,
    tag: `INTUNE-${d.serialNumber}`,
    name: d.deviceName,
    type: osToAssetType(d.operatingSystem),
    make: d.manufacturer === 'LENOVO' ? 'Lenovo' : d.manufacturer,
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
      `Free Storage: ${bytesToGB(d.freeStorageSpaceInBytes)} / ${bytesToGB(d.totalStorageSpaceInBytes)}`,
      `BitLocker: ${d.isEncrypted ? 'Enabled ✓' : 'Not encrypted ✗'}`,
      `Autopilot: ${d.autopilotEnrolled ? 'Yes' : 'No'}`,
      `Entra ID: ${d.azureActiveDirectoryDeviceId}`,
      `Enrolled: ${new Date(d.enrolledDateTime).toLocaleDateString()}`,
    ].join(' · '),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates Intune credentials by attempting the real Azure AD token endpoint.
 *
 * On success  → { ok: true }
 * On bad creds → { ok: false, error: "AADSTS70011: ..." }
 * On CORS/network error → demo mode: { ok: true } after 1.8 s delay
 *
 * Note: The Azure AD token endpoint supports CORS for browser requests.
 * However exposing client_secret in browser code is not recommended
 * for production — use a backend proxy instead.
 */
export async function validateIntuneCredentials(
  config: IntuneConfig
): Promise<{ ok: boolean; error?: string }> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }).toString(),
    });

    if (res.ok) return { ok: true };

    const body = await res.text().catch(() => '');
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(body) as { error_description?: string; error?: string };
      // Azure AD error_description is verbose — trim to first sentence
      const desc = json.error_description ?? json.error ?? '';
      message = desc.split('\r\n')[0] || message;
    } catch { /* body was not JSON */ }
    return { ok: false, error: message };
  } catch {
    // CORS or network error — simulate success for demo
    await new Promise((r) => setTimeout(r, 1800));
    return { ok: true };
  }
}

/**
 * Syncs Intune managed devices into Blimp Assets.
 *
 * Returns the simulated Lenovo ThinkPad E14 Gen 7 fleet matching the
 * real Graph API managedDevices response shape.
 *
 * In production with a backend proxy, this would call:
 *   GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices
 */
export function syncIntuneDevices(integrationId: string): Promise<Asset[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(INTUNE_MANAGED_DEVICES.map((d) => intuneDeviceToAsset(d, integrationId)));
    }, 2200);
  });
}

export { INTUNE_MANAGED_DEVICES };
