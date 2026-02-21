import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, X, Check, Monitor, AppWindow, Users, Sun, Moon, Laptop } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const breadcrumbMap: Record<string, string> = {
  '': 'Dashboard',
  assets: 'Assets',
  apps: 'Apps',
  people: 'People',
  reports: 'Reports',
  integrations: 'Integrations',
  'audit-log': 'Audit Log',
  settings: 'Settings',
};

const quickAddOptions = [
  { label: 'New Asset', path: '/assets' },
  { label: 'New App', path: '/apps' },
  { label: 'New Person', path: '/people' },
];

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, markAllNotificationsRead, globalSearch, setGlobalSearch, assets, apps, people, theme, setTheme, currentUserRole } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Build breadcrumbs
  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs = [
    { label: 'Blimp', path: '/' },
    ...segments.map((seg, i) => ({
      label: breadcrumbMap[seg] || seg,
      path: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  // Global search results
  const searchResults = useMemo(() => {
    if (!globalSearch || globalSearch.length < 2) return { assets: [], apps: [], people: [] };
    const q = globalSearch.toLowerCase();
    return {
      assets: assets.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.tag.toLowerCase().includes(q) ||
        a.serial.toLowerCase().includes(q) ||
        (a.assignedTo?.toLowerCase().includes(q) ?? false)
      ).slice(0, 5),
      apps: apps.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.vendor.toLowerCase().includes(q)
      ).slice(0, 5),
      people: people.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      ).slice(0, 5),
    };
  }, [globalSearch, assets, apps, people]);

  const hasResults = searchResults.assets.length > 0 || searchResults.apps.length > 0 || searchResults.people.length > 0;
  const totalResults = searchResults.assets.length + searchResults.apps.length + searchResults.people.length;

  // Close search results on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'system' ? Laptop : Sun;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-1">
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            <button
              onClick={() => navigate(crumb.path)}
              className={clsx(
                'transition-colors',
                i === crumbs.length - 1
                  ? 'text-gray-900 font-medium cursor-default'
                  : 'text-gray-500 hover:text-gray-900 cursor-pointer'
              )}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </div>

      {/* Global Search with Results Dropdown */}
      <div className="relative w-80" ref={searchRef}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          data-global-search
          placeholder="Search assets, apps, people..."
          value={globalSearch}
          onChange={(e) => { setGlobalSearch(e.target.value); setShowSearchResults(true); }}
          onFocus={() => setShowSearchResults(true)}
          className="w-full pl-9 pr-16 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
        />
        {globalSearch ? (
          <button onClick={() => { setGlobalSearch(''); setShowSearchResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        ) : (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono pointer-events-none">
            {navigator.platform.includes('Mac') ? '\u2318K' : 'Ctrl+K'}
          </kbd>
        )}

        {/* Search Results Dropdown */}
        {showSearchResults && globalSearch.length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">
            {!hasResults ? (
              <div className="p-6 text-center text-gray-400">
                <Search size={20} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results for "{globalSearch}"</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500 font-medium">{totalResults} result{totalResults !== 1 ? 's' : ''}</p>
                </div>

                {searchResults.assets.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 bg-gray-50/50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Monitor size={11} /> Assets ({searchResults.assets.length})
                      </p>
                    </div>
                    {searchResults.assets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => { navigate(`/assets/${asset.id}`); setShowSearchResults(false); setGlobalSearch(''); }}
                        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Monitor size={13} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                          <p className="text-xs text-gray-400">{asset.tag} · {asset.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.apps.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 bg-gray-50/50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AppWindow size={11} /> Apps ({searchResults.apps.length})
                      </p>
                    </div>
                    {searchResults.apps.map((app) => (
                      <button
                        key={app.id}
                        onClick={() => { navigate(`/apps/${app.id}`); setShowSearchResults(false); setGlobalSearch(''); }}
                        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {app.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{app.name}</p>
                          <p className="text-xs text-gray-400">{app.vendor} · {app.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.people.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 bg-gray-50/50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={11} /> People ({searchResults.people.length})
                      </p>
                    </div>
                    {searchResults.people.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => { navigate(`/people/${person.id}`); setShowSearchResults(false); setGlobalSearch(''); }}
                        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {person.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{person.name}</p>
                          <p className="text-xs text-gray-400">{person.department} · {person.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Theme Toggle */}
      <div className="relative">
        <button
          onClick={() => { setShowThemeMenu(!showThemeMenu); setShowNotifications(false); setShowQuickAdd(false); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          title="Toggle theme"
        >
          <ThemeIcon size={18} />
        </button>
        {showThemeMenu && (
          <div className="absolute right-0 top-full mt-2 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
            {([
              { value: 'light' as const, label: 'Light', icon: Sun },
              { value: 'dark' as const, label: 'Dark', icon: Moon },
              { value: 'system' as const, label: 'System', icon: Laptop },
            ]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => { setTheme(value); setShowThemeMenu(false); }}
                className={clsx(
                  'w-full px-3 py-2 text-sm flex items-center gap-2.5 transition-colors text-left',
                  theme === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <Icon size={14} />
                {label}
                {theme === value && <Check size={12} className="ml-auto text-blue-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setShowNotifications(!showNotifications); setShowQuickAdd(false); setShowThemeMenu(false); }}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (n.link) { navigate(n.link); setShowNotifications(false); } }}
                  className={clsx(
                    'px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                    !n.read && 'bg-blue-50/50',
                    n.link && 'cursor-pointer'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                      n.type === 'error' ? 'bg-red-500' :
                      n.type === 'warning' ? 'bg-yellow-500' :
                      n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Role Badge */}
      {currentUserRole !== 'Admin' && (
        <span className={clsx(
          'text-xs font-medium px-2.5 py-1 rounded-full',
          currentUserRole === 'Read Only' ? 'bg-gray-100 text-gray-600' :
          currentUserRole === 'Finance' ? 'bg-yellow-100 text-yellow-700' :
          'bg-blue-100 text-blue-700',
        )}>
          {currentUserRole}
        </span>
      )}

      {/* Quick Add */}
      {currentUserRole !== 'Read Only' && currentUserRole !== 'Finance' && (
      <div className="relative">
        <button
          onClick={() => { setShowQuickAdd(!showQuickAdd); setShowNotifications(false); setShowThemeMenu(false); }}
          className="btn-primary text-sm"
        >
          <Plus size={16} />
          Add New
        </button>
        {showQuickAdd && (
          <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
            {quickAddOptions.map((opt) => (
              <button
                key={opt.path}
                onClick={() => { navigate(opt.path); setShowQuickAdd(false); }}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Click outside to close dropdowns */}
      {(showNotifications || showQuickAdd || showThemeMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotifications(false); setShowQuickAdd(false); setShowThemeMenu(false); }}
        />
      )}
    </header>
  );
}
