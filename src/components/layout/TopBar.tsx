import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, X, Check } from 'lucide-react';
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
  const { notifications, markAllNotificationsRead, globalSearch, setGlobalSearch } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

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

      {/* Global Search */}
      <div className="relative w-72">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search assets, apps, people..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
        />
        {globalSearch && (
          <button onClick={() => setGlobalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setShowNotifications(!showNotifications); setShowQuickAdd(false); }}
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
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={clsx(
                    'px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer',
                    !n.read && 'bg-blue-50/50'
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

      {/* Quick Add */}
      <div className="relative">
        <button
          onClick={() => { setShowQuickAdd(!showQuickAdd); setShowNotifications(false); }}
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

      {/* Click outside to close dropdowns */}
      {(showNotifications || showQuickAdd) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotifications(false); setShowQuickAdd(false); }}
        />
      )}
    </header>
  );
}
