import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, AppWindow, Users, BarChart3,
  Plug, Settings, ChevronLeft, ChevronRight, LogOut,
  Server, Shield
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../auth/useAuth';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assets', icon: Monitor, label: 'Assets' },
  { to: '/apps', icon: AppWindow, label: 'Apps' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/integrations', icon: Plug, label: 'Integrations' },
  { to: '/audit-log', icon: Shield, label: 'Audit Log' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, currentUserRole } = useStore();
  const { user, logout } = useAuth();
  const location = useLocation();

  // RBAC: filter nav items based on role
  const filteredNavItems = navItems.filter(({ to }) => {
    if (currentUserRole === 'Read Only') {
      return !['/settings', '/integrations'].includes(to);
    }
    if (currentUserRole === 'Finance') {
      return !['/integrations'].includes(to);
    }
    return true;
  });

  const displayName = user?.name ?? 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-[#1a2035] text-white transition-all duration-300 flex-shrink-0 relative',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Server size={16} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-lg text-white tracking-tight">Blimp</span>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 py-4 overflow-y-auto">
        <div className={clsx('mb-1 px-3', !sidebarCollapsed && 'px-4')}>
          {!sidebarCollapsed && (
            <p className="text-xs font-semibold text-[#5a6580] uppercase tracking-wider mb-2 px-2">
              Main Menu
            </p>
          )}
          {filteredNavItems.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                aria-label={sidebarCollapsed ? label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'flex items-center gap-3 px-2 py-2.5 rounded-lg mb-0.5 transition-all duration-150 group',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-[#8892a4] hover:bg-white/5 hover:text-white'
                )}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon
                  size={18}
                  aria-hidden="true"
                  className={clsx(
                    'flex-shrink-0 transition-colors',
                    isActive ? 'text-blue-400' : 'text-[#8892a4] group-hover:text-white'
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {isActive && !sidebarCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" aria-hidden="true" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/10 p-3">
        <div className={clsx(
          'flex items-center gap-3 px-2 py-2 rounded-lg',
          sidebarCollapsed && 'justify-center'
        )}>
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
          >
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-[#8892a4] truncate">{currentUserRole}</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={logout}
              aria-label="Sign out"
              className="text-[#8892a4] hover:text-white transition-colors flex-shrink-0 p-1 rounded"
            >
              <LogOut size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!sidebarCollapsed}
        className="absolute -right-3 top-6 w-6 h-6 bg-[#1a2035] border border-white/20 rounded-full flex items-center justify-center text-[#8892a4] hover:text-white transition-colors cursor-pointer z-10"
      >
        {sidebarCollapsed
          ? <ChevronRight size={12} aria-hidden="true" />
          : <ChevronLeft size={12} aria-hidden="true" />}
      </button>
    </aside>
  );
}
