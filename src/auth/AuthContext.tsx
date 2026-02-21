import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  name: string;
  email: string;
  role: 'Admin' | 'Finance' | 'Read Only';
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
// In production these would be validated via an API call, not client-side.

const DEMO_USERS: Array<AuthUser & { password: string }> = [
  { email: 'admin@blimp.io',   password: 'admin123',   name: 'Admin User',   role: 'Admin' },
  { email: 'finance@blimp.io', password: 'finance123', name: 'Finance User', role: 'Finance' },
  { email: 'viewer@blimp.io',  password: 'viewer123',  name: 'Viewer User',  role: 'Read Only' },
];

const STORAGE_KEY = 'blimp-auth';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(loadPersistedAuth);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; user?: AuthUser; error?: string }> => {
      // Simulate network latency for the demo
      await new Promise((r) => setTimeout(r, 400));

      const match = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );

      if (!match) {
        return { ok: false, error: 'Invalid email or password.' };
      }

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
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
