/**
 * NinjaOne RMM integration — server-side.
 *
 * Handles OAuth 2.0 client_credentials flow and device fetching through
 * the NinjaOne v2 API. Secrets never leave the server.
 */

// ─── Types matching the NinjaOne API response ───────────────────────────────

export interface NinjaProcessor {
  name: string;
  maxClockSpeed: number;
  numberOfCores: number;
  numberOfLogicalProcessors: number;
}

export interface NinjaVolume {
  name: string;
  label?: string;
  capacity: number;
  freeSpace: number;
  filesystem: string;
}

export interface NinjaDevice {
  id: number;
  organizationId: number;
  systemName: string;
  dnsName?: string;
  nodeClass: 'WINDOWS_WORKSTATION' | 'MAC' | 'LINUX_WORKSTATION' | 'WINDOWS_SERVER';
  online: boolean;
  lastContact: string;
  agentVersion: string;
  patchStatus: 'COMPLETE' | 'PENDING' | 'FAILED';
  location: string;
  assignedUser?: string;
  os: {
    name: string;
    manufacturer: string;
    buildNumber: string;
    releaseId: string;
    architecture: string;
  };
  system: {
    name: string;
    manufacturer: string;
    model: string;
    biosSerialNumber: string;
    serialNumber: string;
    domain?: string;
  };
  processors: NinjaProcessor[];
  memory: { capacity: number };
  volumes: NinjaVolume[];
}

export interface NinjaOneCredentials {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
}

// ─── Token cache ────────────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

function cacheKey(creds: NinjaOneCredentials): string {
  return `${creds.instanceUrl}:${creds.clientId}`;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

/**
 * Obtain an access token from NinjaOne using OAuth 2.0 client_credentials.
 * Tokens are cached until 5 minutes before expiry.
 */
export async function getNinjaOneToken(creds: NinjaOneCredentials): Promise<string> {
  const key = cacheKey(creds);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 300_000) {
    return cached.accessToken;
  }

  const base = creds.instanceUrl.replace(/^https?:\/\//, '');
  const tokenUrl = `https://${base}/ws/oauth/token`;

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      scope: 'monitoring management',
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let message = `NinjaOne token request failed: HTTP ${res.status}`;
    try {
      const json = JSON.parse(body) as { error_description?: string; error?: string };
      message = json.error_description || json.error || message;
    } catch { /* not JSON */ }
    throw new Error(message);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(key, {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
}

/**
 * Validate NinjaOne credentials by attempting to fetch a token.
 */
export async function validateNinjaOneCredentials(
  creds: NinjaOneCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await getNinjaOneToken(creds);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Device Sync ────────────────────────────────────────────────────────────

/**
 * Fetch all devices from NinjaOne /v2/devices endpoint.
 * Handles cursor-based pagination automatically.
 */
export async function fetchNinjaOneDevices(creds: NinjaOneCredentials): Promise<NinjaDevice[]> {
  const token = await getNinjaOneToken(creds);
  const base = creds.instanceUrl.replace(/^https?:\/\//, '');
  const devices: NinjaDevice[] = [];

  let afterCursor: number | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = new URLSearchParams({
      pageSize: '1000',
      expand: 'os,system,processors,memory,volumes',
    });
    if (afterCursor !== null) {
      params.set('after', String(afterCursor));
    }

    const url = `https://${base}/v2/devices?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`NinjaOne /v2/devices failed: HTTP ${res.status} — ${body}`);
    }

    const page = (await res.json()) as NinjaDevice[];
    if (page.length === 0) break;

    devices.push(...page);

    // NinjaOne uses cursor pagination — the last device's id is the cursor
    if (page.length < 1000) break;
    afterCursor = page[page.length - 1].id;
  }

  return devices;
}
