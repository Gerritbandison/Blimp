import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Download, Clock, User, ArrowRight,
  Monitor, AppWindow, Users, Shield,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { exportToCSV } from '../utils/csvExport';
import { EmptyState } from '../components/common/EmptyState';
import { clsx } from 'clsx';
import { format, isBefore, startOfDay, subDays } from 'date-fns';

const MODULE_ICONS: Record<string, React.ElementType> = {
  Assets: Monitor,
  Apps: AppWindow,
  People: Users,
};

const MODULE_COLORS: Record<string, string> = {
  Assets: 'bg-blue-100 text-blue-700',
  Apps: 'bg-purple-100 text-purple-700',
  People: 'bg-green-100 text-green-700',
};

const DATE_RANGES = [
  { label: 'All time', value: '' },
  { label: 'Today', value: '0' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
];

export function AuditLog() {
  const navigate = useNavigate();
  const { activityLog, addToast } = useStore();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const modules = [...new Set(activityLog.map(e => e.module).filter(Boolean))] as string[];
  const users = [...new Set(activityLog.map(e => e.user))];

  const filtered = useMemo(() => {
    return activityLog.filter((entry) => {
      if (moduleFilter && entry.module !== moduleFilter) return false;
      if (userFilter && entry.user !== userFilter) return false;
      if (dateRange) {
        const days = parseInt(dateRange);
        const cutoff = startOfDay(subDays(new Date(), days));
        if (isBefore(new Date(entry.timestamp), cutoff)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          entry.action.toLowerCase().includes(q) ||
          entry.user.toLowerCase().includes(q) ||
          (entry.details?.toLowerCase().includes(q) ?? false) ||
          (entry.entityName?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [activityLog, moduleFilter, userFilter, dateRange, search]);

  function handleExport() {
    exportToCSV(
      filtered as unknown as Record<string, unknown>[],
      [
        { key: 'timestamp', label: 'Timestamp' },
        { key: 'action', label: 'Action' },
        { key: 'user', label: 'User' },
        { key: 'module', label: 'Module' },
        { key: 'entityName', label: 'Entity' },
        { key: 'details', label: 'Details' },
      ],
      'audit-log',
    );
    addToast({ type: 'success', message: `Exported ${filtered.length} log entries` });
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activityLog.length} total entries · Track all changes across your organization
          </p>
        </div>
        <button className="btn-secondary" onClick={handleExport}>
          <Download size={15} /> Export
        </button>
      </div>

      {/* Date range pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {DATE_RANGES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setDateRange(value)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              dateRange === value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="card">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search actions, users, entities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx('btn-secondary', showFilters && 'bg-blue-50 border-blue-200 text-blue-700')}
          >
            <Filter size={14} /> Filters
            {(moduleFilter || userFilter) && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-0.5" />}
          </button>
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} entries</span>
        </div>

        {showFilters && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Module:</label>
              <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                <option value="">All Modules</option>
                {modules.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">User:</label>
              <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                <option value="">All Users</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {(moduleFilter || userFilter) && (
              <button onClick={() => { setModuleFilter(''); setUserFilter(''); }} className="text-xs text-blue-600 hover:text-blue-700">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Log entries */}
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Shield}
              title="No audit entries found"
              description="Adjust your search or filters to see activity"
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((entry) => {
              const ModIcon = MODULE_ICONS[entry.module || ''] || Clock;
              const modColor = MODULE_COLORS[entry.module || ''] || 'bg-gray-100 text-gray-600';
              return (
                <div
                  key={entry.id}
                  className={clsx(
                    'flex items-start gap-4 px-4 py-3 hover:bg-gray-50/50 transition-colors',
                    entry.entityId && 'cursor-pointer',
                  )}
                  onClick={() => {
                    if (entry.entityId && entry.module) {
                      const base = entry.module === 'Assets' ? '/assets' : entry.module === 'Apps' ? '/apps' : '/people';
                      navigate(`${base}/${entry.entityId}`);
                    }
                  }}
                >
                  <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', modColor)}>
                    <ModIcon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{entry.action}</span>
                      {entry.module && (
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', modColor)}>
                          {entry.module}
                        </span>
                      )}
                    </div>
                    {entry.details && (
                      <p className="text-sm text-gray-500 mt-0.5">{entry.details}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <User size={10} /> {entry.user}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                      </span>
                      {entry.entityName && (
                        <span className="text-xs text-blue-500 flex items-center gap-1">
                          <ArrowRight size={10} /> {entry.entityName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
