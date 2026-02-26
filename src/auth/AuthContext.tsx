import {
  createContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { api, API_ENABLED, setAuthToken, clearAuthToken } from '../services/api';
import type { UserRole } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
}

/** Map backend role enum to frontend UserRole (spaces vs camelCase) */
function mapRole(backendRole: string): UserRole {
  switch (backendRole) {
    case 'Admin':     return 'Admin';
    case 'ITManager': return 'IT Manager';
    case 'Finance':   return 'Finance';
    case 'ReadOnly':  return 'Read Only';
    case 'Custom':    return 'Custom';
    default:          return 'Read Only';
  }
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ ok: boolean; user?: AuthUser; error?: string }>;
  logout: () => void;
}

// ─── Demo credentials ────────────────────────────────────────────────────────
// Only active when VITE_DEMO_MODE=true (default when no API is configured).
// In production set VITE_API_BASE_URL and leave VITE_DEMO_MODE unset.

const DEMO_MODE = !API_ENABLED || import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_USERS: Array<AuthUser & { password: string }> = DEMO_MODE
  ? [
      { email: 'admin@blimp.io',   password: 'admin123',   name: 'Admin User',   role: 'Admin' },
      { email: 'finance@blimp.io', password: 'finance123', name: 'Finance User', role: 'Finance' },
      { email: 'viewer@blimp.io',  password: 'viewer123',  name: 'Viewer User',  role: 'Read Only' },
    ]
  : [];

// ─── Rate limiting ────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const RATE_KEY = 'blimp-login-attempts';

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

function getAttemptRecord(email: string): AttemptRecord {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, AttemptRecord>) : {};
    return all[email.toLowerCase()] ?? { count: 0, lockedUntil: null };
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function setAttemptRecord(email: string, record: AttemptRecord) {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, AttemptRecord>) : {};
    all[email.toLowerCase()] = record;
    localStorage.setItem(RATE_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — fail open (no rate limiting)
  }
}

function clearAttemptRecord(email: string) {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, AttemptRecord>) : {};
    delete all[email.toLowerCase()];
    localStorage.setItem(RATE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

// ─── Auth persistence ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'blimp-auth';

function loadPersistedAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { isAuthenticated: false, user: null };
    const parsed = JSON.parse(raw) as AuthState;
    if (parsed.isAuthenticated && parsed.user) return parsed;
  } catch {
    // corrupted storage — treat as logged out
  }
  return { isAuthenticated: false, user: null };
}

function persistAuth(state: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Context ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components -- context must be co-located with AuthProvider
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(loadPersistedAuth);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; user?: AuthUser; error?: string }> => {
      const normalizedEmail = email.trim().toLowerCase();

      // Check rate limit
      const record = getAttemptRecord(normalizedEmail);
      if (record.lockedUntil !== null) {
        const remaining = Math.ceil((record.lockedUntil - Date.now()) / 60000);
        if (Date.now() < record.lockedUntil) {
          return {
            ok: false,
            error: `Too many failed attempts. Try again in ${remaining} minute${remaining === 1 ? '' : 's'}.`,
          };
        }
        // Lockout has expired — reset
        setAttemptRecord(normalizedEmail, { count: 0, lockedUntil: null });
      }

      if (API_ENABLED) {
        // ── Production path: validate against the real backend ──────────────
        try {
          const data = await api.post<{
            token: string;
            user: { id: string; email: string; name: string; role: string };
          }>('/auth/login', { email: normalizedEmail, password });

          setAuthToken(data.token);
          clearAttemptRecord(normalizedEmail);

          const user: AuthUser = {
            name: data.user.name,
            email: data.user.email,
            role: mapRole(data.user.role),
          };
          const next: AuthState = { isAuthenticated: true, user };
          setAuthState(next);
          persistAuth(next);
          return { ok: true, user };
        } catch (err) {
          const apiErr = err as Error & { status?: number };
          const newCount = record.count + 1;
          const locked = newCount >= MAX_ATTEMPTS;
          setAttemptRecord(normalizedEmail, {
            count: newCount,
            lockedUntil: locked ? Date.now() + LOCKOUT_MS : null,
          });
          if (apiErr.status === 401) {
            const remaining = MAX_ATTEMPTS - newCount;
            return {
              ok: false,
              error: locked
                ? 'Account locked for 15 minutes after too many failed attempts.'
                : `Invalid email or password.${remaining > 0 ? ` ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : ''}`,
            };
          }
          return { ok: false, error: 'Unable to reach the server. Check your connection.' };
        }
      }

      // ── Demo / local mode: validate against hardcoded credentials ───────────
      if (!DEMO_MODE) {
        return { ok: false, error: 'Backend API is not configured. Set VITE_API_BASE_URL.' };
      }
      // Simulate network latency for the demo
      await new Promise((r) => setTimeout(r, 400));

      const match = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
      );

      if (!match) {
        const newCount = record.count + 1;
        const locked = newCount >= MAX_ATTEMPTS;
        setAttemptRecord(normalizedEmail, {
          count: newCount,
          lockedUntil: locked ? Date.now() + LOCKOUT_MS : null,
        });
        const remaining = MAX_ATTEMPTS - newCount;
        return {
          ok: false,
          error: locked
            ? `Account locked for 15 minutes after too many failed attempts.`
            : `Invalid email or password.${remaining > 0 ? ` ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : ''}`,
        };
      }

      // Success — clear failed attempt counter
      clearAttemptRecord(normalizedEmail);

      const user: AuthUser = { name: match.name, email: match.email, role: match.role };
      const next: AuthState = { isAuthenticated: true, user };
      setAuthState(next);
      persistAuth(next);
      return { ok: true, user };
    },
    []
  );

  const logout = useCallback(() => {
    setAuthState({ isAuthenticated: false, user: null });
    clearAuth();
    clearAuthToken();
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

