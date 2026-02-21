/**
 * Base API client for Blimp.
 *
 * When VITE_API_BASE_URL is set, all service calls go through this client to a
 * real backend. When it is empty (the default), the app operates in local-only
 * mode: data lives in the Zustand store persisted to localStorage and no
 * network calls are made for core data operations.
 *
 * This module is the single place to add auth headers, request logging,
 * retry logic, and error normalisation once a backend is introduced.
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

// ─── Request client ─────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      `[api] No VITE_API_BASE_URL configured. Cannot call ${path} in local-only mode.`
    );
  }

  const url = `${BASE_URL.replace(/\/$/, '')}${path}`;
  const token = getAuthToken();

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

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
