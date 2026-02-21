/**
 * Microsoft Intune / Graph API integration — server-side.
 *
 * Handles OAuth 2.0 client_credentials flow and device fetching through the
 * Microsoft Graph API. Secrets never leave the server.
 *
 * Required Azure AD App Permissions (Application, admin consent required):
 *   - DeviceManagementManagedDevices.Read.All
 *   - DeviceManagementConfiguration.Read.All
 *   - User.Read.All
 */

// ─── Types matching the Graph API response ──────────────────────────────────

export interface IntuneManagedDevice {
  id: string;
  deviceName: string;
  operatingSystem: string;
  osVersion: string;
  complianceState: 'compliant' | 'noncompliant' | 'unknown' | 'notApplicable';
  manufacturer: string;
  model: string;
  serialNumber: string;
  totalStorageSpaceInBytes: number;
  freeStorageSpaceInBytes: number;
  physicalMemoryInBytes: number;
  processorArchitecture: string;
  userPrincipalName: string;
  userDisplayName: string;
  enrolledDateTime: string;
  lastSyncDateTime: string;
  managedDeviceOwnerType: 'company' | 'personal';
  deviceEnrollmentType: string;
  azureActiveDirectoryDeviceId: string;
  isEncrypted: boolean;
  autopilotEnrolled: boolean;
  managementAgent: string;
}

export interface IntuneTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface IntuneCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

// ─── Token cache ────────────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

function cacheKey(creds: IntuneCredentials): string {
  return `${creds.tenantId}:${creds.clientId}`;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

/**
 * Obtain an access token from Azure AD using OAuth 2.0 client_credentials.
 * Tokens are cached until 5 minutes before expiry.
 */
export async function getIntuneToken(creds: IntuneCredentials): Promise<string> {
  const key = cacheKey(creds);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 300_000) {
    return cached.accessToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let message = `Azure AD token request failed: HTTP ${res.status}`;
    try {
      const json = JSON.parse(body) as { error_description?: string; error?: string };
      message = json.error_description?.split('\r\n')[0] || json.error || message;
    } catch { /* not JSON */ }
    throw new Error(message);
  }

  const data = (await res.json()) as IntuneTokenResponse;
  tokenCache.set(key, {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
}

/**
 * Validate Intune credentials by attempting to fetch a token.
 */
export async function validateIntuneCredentials(
  creds: IntuneCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await getIntuneToken(creds);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Device Sync ────────────────────────────────────────────────────────────

const DEVICE_SELECT = [
  'id', 'deviceName', 'operatingSystem', 'osVersion', 'complianceState',
  'manufacturer', 'model', 'serialNumber', 'totalStorageSpaceInBytes',
  'freeStorageSpaceInBytes', 'physicalMemoryInBytes', 'processorArchitecture',
  'userPrincipalName', 'userDisplayName', 'enrolledDateTime', 'lastSyncDateTime',
  'managedDeviceOwnerType', 'deviceEnrollmentType', 'azureActiveDirectoryDeviceId',
  'isEncrypted', 'autopilotEnrolled', 'managementAgent',
].join(',');

/**
 * Fetch all managed devices from Intune via the Microsoft Graph API.
 * Handles pagination automatically (follows @odata.nextLink).
 */
export async function fetchIntuneDevices(creds: IntuneCredentials): Promise<IntuneManagedDevice[]> {
  const token = await getIntuneToken(creds);
  const devices: IntuneManagedDevice[] = [];

  let url: string | null =
    `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$top=999&$select=${DEVICE_SELECT}`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Graph API /managedDevices failed: HTTP ${res.status} — ${body}`);
    }

    const data = (await res.json()) as {
      value: IntuneManagedDevice[];
      '@odata.nextLink'?: string;
    };
    devices.push(...data.value);
    url = data['@odata.nextLink'] ?? null;
  }

  return devices;
}

// ─── Entra ID Users (optional sync) ────────────────────────────────────────

export interface EntraUser {
  id: string;
  displayName: string;
  mail: string | null;
  department: string | null;
  jobTitle: string | null;
  accountEnabled: boolean;
}

export async function fetchEntraUsers(creds: IntuneCredentials): Promise<EntraUser[]> {
  const token = await getIntuneToken(creds);
  const users: EntraUser[] = [];

  let url: string | null =
    'https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,mail,department,jobTitle,accountEnabled';

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Graph API /users failed: HTTP ${res.status} — ${body}`);
    }

    const data = (await res.json()) as {
      value: EntraUser[];
      '@odata.nextLink'?: string;
    };
    users.push(...data.value);
    url = data['@odata.nextLink'] ?? null;
  }

  return users;
}
