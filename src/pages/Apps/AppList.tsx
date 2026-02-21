import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Filter, Search, AppWindow, AlertTriangle, Clock } from 'lucide-react';
import { DataTable, type Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useStore } from '../../store/useStore';
import { exportToCSV } from '../../utils/csvExport';
import type { App, AppCategory, AppStatus, LicenseType } from '../../types';
import { clsx } from 'clsx';
import { format, differenceInDays } from 'date-fns';

function RenewalUrgency({ renewalDate, noticeDays }: { renewalDate: string; noticeDays: number }) {
  const daysToRenewal = differenceInDays(new Date(renewalDate), new Date());
  const noticeStart = daysToRenewal <= noticeDays;
  const isUrgent = daysToRenewal <= 14;
  const isOverdue = daysToRenewal < 0;

  return (
    <div className="flex items-center gap-2">
      <div className={clsx(
        'w-2 h-2 rounded-full flex-shrink-0',
        isOverdue ? 'bg-red-500' : isUrgent ? 'bg-red-400' : noticeStart ? 'bg-yellow-400' : 'bg-green-400'
      )} />
      <span className={clsx(
        'text-xs font-medium',
        isOverdue ? 'text-red-600' : isUrgent ? 'text-red-600' : noticeStart ? 'text-yellow-600' : 'text-gray-600'
      )}>
        {isOverdue ? 'Overdue' : `${daysToRenewal}d`}
      </span>
      <span className="text-xs text-gray-400">{format(new Date(renewalDate), 'MMM d, yyyy')}</span>
    </div>
  );
}

function LicenseUtilBar({ assigned, total }: { assigned: number; total: number }) {
  const pct = total > 0 ? (assigned / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 min-w-28">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className={clsx('h-1.5 rounded-full', pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-yellow-400' : 'bg-blue-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{assigned}/{total}</span>
    </div>
  );
}

const COLUMNS: Column<App>[] = [
  { key: 'name', label: 'App', sortable: true, render: (r) => (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {r.name.substring(0, 2).toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{r.name}</p>
        <p className="text-xs text-gray-400">{r.vendor}</p>
      </div>
    </div>
  )},
  { key: 'category', label: 'Category', sortable: true, render: (r) => (
    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{r.category}</span>
  )},
  { key: 'licenseType', label: 'License Type', sortable: true },
  { key: 'assignedLicenses', label: 'Utilization', sortable: true, render: (r) => (
    <LicenseUtilBar assigned={r.assignedLicenses} total={r.totalLicenses} />
  )},
  { key: 'cost', label: 'Cost', sortable: true, render: (r) => (
    <div>
      <p className="text-sm font-medium">${(r.costPerLicense * r.totalLicenses).toLocaleString()}</p>
      <p className="text-xs text-gray-400">{r.billingCycle}</p>
    </div>
  )},
  { key: 'renewalDate', label: 'Renewal', sortable: true, render: (r) => (
    <RenewalUrgency renewalDate={r.renewalDate} noticeDays={r.noticePeriodDays} />
  )},
  { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: 'detectionSource', label: 'Source', sortable: true, render: (r) => (
    <span className={clsx(
      'text-xs px-2 py-0.5 rounded-full font-medium',
      r.detectionSource === 'Shadow IT' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
    )}>{r.detectionSource}</span>
  )},
];

const APP_CATEGORIES: AppCategory[] = ['Productivity', 'Development', 'Design', 'Communication', 'Security', 'HR', 'Finance', 'Marketing', 'Analytics', 'Infrastructure', 'Other'];

export function AppList() {
  const navigate = useNavigate();
  const { apps, addApp, addToast, currentUserRole } = useStore();
  const canEdit = currentUserRole !== 'Read Only' && currentUserRole !== 'Finance';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'renewals'>('list');
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [newApp, setNewApp] = useState<Partial<App>>({
    status: 'Active', licenseType: 'Per User', billingCycle: 'monthly', currency: 'USD',
    category: 'Productivity', detectionSource: 'Manual', totalLicenses: 0, assignedLicenses: 0, costPerLicense: 0, noticePeriodDays: 30,
  });

  const shadowItApps = apps.filter((a) => a.detectionSource === 'Shadow IT');
  const expiringApps = apps.filter((a) => {
    const days = differenceInDays(new Date(a.renewalDate), new Date());
    return days >= 0 && days <= 30;
  });

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (categoryFilter && a.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.vendor.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [apps, statusFilter, categoryFilter, search]);

  // Renewal timeline data
  const renewalApps = [...apps]
    .filter(a => a.status === 'Active')
    .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());

  function handleAddApp() {
    const errors: Record<string, boolean> = {};
    if (!newApp.name?.trim()) errors.name = true;
    if (!newApp.vendor?.trim()) errors.vendor = true;
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    addApp({
      id: `app${Date.now()}`,
      name: newApp.name!,
      vendor: newApp.vendor!,
      category: (newApp.category as AppCategory) || 'Other',
      licenseType: (newApp.licenseType as LicenseType) || 'Per User',
      totalLicenses: newApp.totalLicenses || 0,
      assignedLicenses: 0,
      costPerLicense: newApp.costPerLicense || 0,
      billingCycle: (newApp.billingCycle as 'monthly' | 'annual') || 'monthly',
      currency: 'USD',
      renewalDate: newApp.renewalDate || '',
      noticePeriodDays: newApp.noticePeriodDays || 30,
      status: (newApp.status as AppStatus) || 'Active',
      detectionSource: 'Manual',
      adminOwner: newApp.adminOwner,
      description: newApp.description,
    });
    setShowAddModal(false);
    addToast({ type: 'success', message: `"${newApp.name}" added successfully` });
    setNewApp({ status: 'Active', licenseType: 'Per User', billingCycle: 'monthly', currency: 'USD', category: 'Productivity', detectionSource: 'Manual', totalLicenses: 0, assignedLicenses: 0, costPerLicense: 0, noticePeriodDays: 30 });
  }

  const totalMonthlyCost = apps.reduce((sum, a) => {
    return sum + (a.billingCycle === 'monthly' ? a.costPerLicense * a.totalLicenses : a.costPerLicense * a.totalLicenses / 12);
  }, 0);

  const unusedLicenses = apps.reduce((sum, a) => sum + (a.totalLicenses - a.assignedLicenses), 0);
  const unusedCost = apps.reduce((sum, a) => {
    const unused = a.totalLicenses - a.assignedLicenses;
    const monthly = a.billingCycle === 'monthly' ? a.costPerLicense : a.costPerLicense / 12;
    return sum + unused * monthly;
  }, 0);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Apps & Licenses</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{apps.length} apps · ${totalMonthlyCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/mo</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => {
            exportToCSV(
              filtered as unknown as Record<string, unknown>[],
              [
                { key: 'name', label: 'App Name' }, { key: 'vendor', label: 'Vendor' },
                { key: 'category', label: 'Category' }, { key: 'status', label: 'Status' },
                { key: 'totalLicenses', label: 'Total Licenses' },
                { key: 'assignedLicenses', label: 'Assigned Licenses' },
                { key: 'costPerLicense', label: 'Cost/License' },
                { key: 'billingCycle', label: 'Billing Cycle' },
                { key: 'renewalDate', label: 'Renewal Date' },
              ],
              'apps'
            );
            addToast({ type: 'success', message: `Exported ${filtered.length} apps to CSV` });
          }}>
            <Download size={15} /> Export
          </button>
          {canEdit && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus size={15} /> Add App
            </button>
          )}
        </div>
      </div>

      {/* Alert banners */}
      {shadowItApps.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle size={16} className="text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-800">
            <strong>{shadowItApps.length} Shadow IT app{shadowItApps.length > 1 ? 's' : ''}</strong> detected — {shadowItApps.map(a => a.name).join(', ')}
          </p>
          <button className="text-xs font-medium text-orange-700 underline ml-auto" onClick={() => setStatusFilter('')}>
            Review
          </button>
        </div>
      )}
      {expiringApps.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <Clock size={16} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>{expiringApps.length} app{expiringApps.length > 1 ? 's' : ''}</strong> renewing in the next 30 days — ${expiringApps.reduce((s, a) => s + a.costPerLicense * a.totalLicenses, 0).toLocaleString()} at stake
          </p>
        </div>
      )}

      {/* License Rightsizing insight */}
      {unusedLicenses > 10 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <AppWindow size={16} className="text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            <strong>{unusedLicenses} unused licenses</strong> detected across your apps — you could save <strong>${unusedCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/mo</strong> by rightsizing
          </p>
        </div>
      )}

      {/* View toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {[{ id: 'list', label: 'App Register' }, { id: 'renewals', label: 'Renewal Timeline' }].map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id as 'list' | 'renewals')}
            className={clsx('px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              activeView === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {activeView === 'list' ? (
        <div className="card">
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-150"
              />
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-1">
              {(['', 'Active', 'Inactive', 'Expired'] as (AppStatus | '')[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border',
                    statusFilter === s ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200/80 hover:border-gray-300 hover:shadow-sm'
                  )}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>

            <button onClick={() => setShowFilters(!showFilters)} className={clsx('btn-secondary', showFilters && 'bg-blue-50 border-blue-200 text-blue-700')}>
              <Filter size={14} /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Category:</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                  <option value="">All Categories</option>
                  {APP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              {categoryFilter && (
                <button onClick={() => setCategoryFilter('')} className="text-xs text-blue-600">Clear</button>
              )}
            </div>
          )}

          <DataTable
            data={filtered}
            columns={COLUMNS}
            onRowClick={(row) => { void navigate(`/apps/${row.id}`); }}
            emptyState={
              <EmptyState
                icon={AppWindow}
                title="No apps found"
                description="Add software licenses and SaaS apps to track costs and renewals"
                action={{ label: '+ Add App', onClick: () => setShowAddModal(true) }}
              />
            }
          />
        </div>
      ) : (
        /* Renewal Timeline View */
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-5">Renewal Timeline</h3>
          <div className="space-y-3">
            {renewalApps.map((app) => {
              const days = differenceInDays(new Date(app.renewalDate), new Date());
              const noticeStart = days <= app.noticePeriodDays;
              const isUrgent = days <= 14;
              const isOverdue = days < 0;
              const color = isOverdue ? '#ef4444' : isUrgent ? '#f97316' : noticeStart ? '#eab308' : '#22c55e';
              const totalCost = app.costPerLicense * app.totalLicenses;

              return (
                <div
                  key={app.id}
                  onClick={() => { void navigate(`/apps/${app.id}`); }}
                  className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {app.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="w-32 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{app.name}</p>
                    <p className="text-xs text-gray-400">{app.vendor}</p>
                  </div>
                  <div className="flex-1 relative h-6">
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                      <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                        {/* Notice period marker */}
                        <div
                          className="absolute top-0 right-0 h-full rounded-r-full opacity-30"
                          style={{ width: `${Math.min(100, (app.noticePeriodDays / 365) * 100)}%`, backgroundColor: '#eab308' }}
                        />
                        {/* Remaining time bar */}
                        <div
                          className="absolute top-0 left-0 h-full rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, (1 - days / 365) * 100))}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 w-28">
                    <p className="text-sm font-semibold" style={{ color }}>{isOverdue ? 'Overdue' : `${days} days`}</p>
                    <p className="text-xs text-gray-400">{format(new Date(app.renewalDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right flex-shrink-0 w-24">
                    <p className="text-sm font-semibold text-gray-900">${totalCost.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{app.billingCycle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add App Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New App / License"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddApp}>Add App</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">App Name <span className="text-red-500">*</span></label>
            <input className={clsx('input', formErrors.name && 'border-red-400 ring-1 ring-red-400')} placeholder="e.g. Slack" value={newApp.name || ''} onChange={(e) => { setNewApp(p => ({ ...p, name: e.target.value })); setFormErrors(f => ({ ...f, name: false })); }} />
            {formErrors.name && <p className="text-xs text-red-500 mt-1">App name is required</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Vendor <span className="text-red-500">*</span></label>
            <input className={clsx('input', formErrors.vendor && 'border-red-400 ring-1 ring-red-400')} placeholder="e.g. Salesforce" value={newApp.vendor || ''} onChange={(e) => { setNewApp(p => ({ ...p, vendor: e.target.value })); setFormErrors(f => ({ ...f, vendor: false })); }} />
            {formErrors.vendor && <p className="text-xs text-red-500 mt-1">Vendor is required</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Category</label>
            <select className="select" value={newApp.category} onChange={(e) => setNewApp(p => ({ ...p, category: e.target.value as AppCategory }))}>
              {APP_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">License Type</label>
            <select className="select" value={newApp.licenseType} onChange={(e) => setNewApp(p => ({ ...p, licenseType: e.target.value as LicenseType }))}>
              {(['Per User', 'Per Device', 'Site', 'Enterprise', 'Open Source'] as LicenseType[]).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Total Licenses</label>
            <input type="number" className="input" placeholder="0" value={newApp.totalLicenses || ''} onChange={(e) => setNewApp(p => ({ ...p, totalLicenses: parseInt(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Cost per License</label>
            <input type="number" className="input" placeholder="0.00" value={newApp.costPerLicense || ''} onChange={(e) => setNewApp(p => ({ ...p, costPerLicense: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Billing Cycle</label>
            <select className="select" value={newApp.billingCycle} onChange={(e) => setNewApp(p => ({ ...p, billingCycle: e.target.value as 'monthly' | 'annual' }))}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Renewal Date</label>
            <input type="date" className="input" value={newApp.renewalDate || ''} onChange={(e) => setNewApp(p => ({ ...p, renewalDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Notice Period (days)</label>
            <input type="number" className="input" value={newApp.noticePeriodDays || 30} onChange={(e) => setNewApp(p => ({ ...p, noticePeriodDays: parseInt(e.target.value) }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Admin Owner</label>
            <input className="input" placeholder="Name of admin owner" value={newApp.adminOwner || ''} onChange={(e) => setNewApp(p => ({ ...p, adminOwner: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
            <textarea className="input resize-none" rows={2} value={newApp.description || ''} onChange={(e) => setNewApp(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
