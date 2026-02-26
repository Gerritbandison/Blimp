/**
 * Base API client for Blimp.
 *
 * When VITE_API_BASE_URL is set, all service calls go through this client to a
 * real backend. When it is empty (the default), the app operates in local-only
 * mode: data lives in the Zustand store persisted to localStorage and no
 * network calls are made for core data operations.
 *
 * Features: auth headers, 30 s timeout, exponential-backoff retry (3 attempts
 * for GET/idempotent requests on network errors).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_ENABLED = Boolean(BASE_URL);

export interface ApiError {
  status: number;
  message: string;
}

// ─── Token management ───────────────────────────────────────────────────────

const TOKEN_KEY = 'blimp-auth-token';

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Retry + timeout helpers ───────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

/** Only retry on network failures, not on server errors */
function isRetryable(err: unknown): boolean {
  if (err instanceof TypeError) return true; // network error / fetch failed
  if (err instanceof DOMException && err.name === 'AbortError') return false;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Request client ─────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      `[api] No VITE_API_BASE_URL configured. Cannot call ${path} in local-only mode.`
    );
  }

  const url = `${BASE_URL.replace(/\/$/, '')}${path}`;
  const token = getAuthToken();
  const method = init?.method ?? 'GET';
  const idempotent = method === 'GET' || method === 'DELETE';

  let lastError: unknown;

  for (let attempt = 0; attempt <= (idempotent ? MAX_RETRIES - 1 : 0); attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1)); // 1s, 2s, 4s…
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init?.headers,
        },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(body || res.statusText) as Error & ApiError;
        err.status = res.status;

        // Auto-clear token on 401
        if (res.status === 401) {
          clearAuthToken();
        }

        throw err;
      }

      return res.json() as Promise<T>;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (!isRetryable(err)) throw err;
    }
  }

  throw lastError;
}

export const api = {
  get: <T>(path: string, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, { ...init, method: 'GET' }),

  post: <T>(path: string, body: unknown, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, { ...init, method: 'DELETE' }),
};
