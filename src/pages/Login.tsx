import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Server, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../store/useStore';

export function Login() {
  const { login } = useAuth();
  const { setCurrentUserRole, setCurrentUserName } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect back to where the user came from, or to root
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (!result.ok) {
      setError(result.error ?? 'Login failed.');
      setLoading(false);
      return;
    }

    // Sync auth identity into the Zustand store so RBAC and audit log work immediately
    if (result.user) {
      setCurrentUserRole(result.user.role);
      setCurrentUserName(result.user.name);
    }

    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2035] to-[#0f1628] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Server size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Blimp</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in to Blimp</h1>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials to access the platform.</p>

          {error && (
            <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={(e) => { void handleSubmit(e); }} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Demo credentials</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p><span className="font-mono bg-gray-100 px-1 rounded">admin@blimp.io</span> / <span className="font-mono bg-gray-100 px-1 rounded">admin123</span> — Admin</p>
              <p><span className="font-mono bg-gray-100 px-1 rounded">finance@blimp.io</span> / <span className="font-mono bg-gray-100 px-1 rounded">finance123</span> — Finance</p>
              <p><span className="font-mono bg-gray-100 px-1 rounded">viewer@blimp.io</span> / <span className="font-mono bg-gray-100 px-1 rounded">viewer123</span> — Read Only</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
