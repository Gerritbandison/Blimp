import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, Users, AppWindow, BarChart3,
  Settings, Link2, ClipboardList, ChevronLeft, ChevronRight,
  Server, LogOut,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../auth/useAuth';
import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Assets', icon: Monitor, path: '/assets' },
  { label: 'People', icon: Users, path: '/people' },
  { label: 'Apps', icon: AppWindow, path: '/apps' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Integrations', icon: Link2, path: '/integrations' },
  { label: 'Audit Log', icon: ClipboardList, path: '/audit-log' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { currentUserName, currentUserRole } = useStore();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
    void navigate('/login');
  }

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-[#0f172a] transition-all duration-200 ease-in-out flex-shrink-0',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0 border-b border-white/[0.06]">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Server size={16} className="text-white" />
        </div>
        {!collapsed && <span className="text-[15px] font-semibold text-white tracking-tight">Blimp</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto" role="navigation" aria-label="Main navigation" style={{ scrollbarWidth: 'none' }}>
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-lg transition-all duration-150 relative',
                collapsed ? 'justify-center px-0 py-2.5 mx-auto w-10 h-10' : 'px-3 py-2',
                isActive
                  ? 'bg-blue-500/[0.12] text-blue-400'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full" />
                )}
                <Icon size={18} className={clsx('flex-shrink-0', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
                {!collapsed && <span className="text-[13px] font-medium truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="flex-shrink-0 border-t border-white/[0.06] p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {currentUserName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-200 truncate">{currentUserName}</p>
              <p className="text-[11px] text-slate-500 truncate">{currentUserRole}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center gap-2 px-3 py-2 text-[13px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-150"
              title="Sign out"
            >
              <LogOut size={15} />
              Sign out
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={clsx(
              'flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-150',
              collapsed ? 'w-10 h-10 mx-auto' : 'w-8 h-8'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
