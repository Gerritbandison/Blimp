import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, CheckCircle, XCircle,
  Users, DollarSign, Calendar, ExternalLink
} from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { DataTable, type Column } from '../../components/common/DataTable';
import { useStore } from '../../store/useStore';
import { format, differenceInDays } from 'date-fns';
import { clsx } from 'clsx';
import type { License } from '../../types';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'licenses', label: 'Licenses' },
  { id: 'users', label: 'Users' },
  { id: 'financial', label: 'Financial' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'activity', label: 'Activity' },
];

const LICENSE_COLUMNS: Column<License>[] = [
  { key: 'id', label: '#', render: (r) => <span className="text-gray-400">#{r.id.slice(-3)}</span> },
  { key: 'assignedTo', label: 'Assigned To', render: (r) => r.assignedTo ? (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium">
        {r.assignedTo.split(' ').map(n => n[0]).join('')}
      </div>
      <span className="text-sm">{r.assignedTo}</span>
    </div>
  ) : <span className="text-gray-400 text-sm">Unassigned</span> },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'assignedDate', label: 'Assigned Date', render: (r) => r.assignedDate ? format(new Date(r.assignedDate), 'MMM d, yyyy') : '—' },
  { key: 'lastUsed', label: 'Last Used', render: (r) => r.lastUsed ? format(new Date(r.lastUsed), 'MMM d, yyyy') : '—' },
];

export function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { apps, addToast } = useStore();
  const [activeTab, setActiveTab] = useState('overview');

  const app = apps.find((a) => a.id === id);
  if (!app) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">App not found</p>
        <button onClick={() => navigate('/apps')} className="btn-primary mt-4">Back to Apps</button>
      </div>
    );
  }

  const daysToRenewal = differenceInDays(new Date(app.renewalDate), new Date());
  const totalCost = app.costPerLicense * app.totalLicenses;
  const monthlyCost = app.billingCycle === 'monthly' ? totalCost : totalCost / 12;
  const utilizationPct = app.totalLicenses > 0 ? (app.assignedLicenses / app.totalLicenses * 100) : 0;

  // Generate mock licenses
  const mockLicenses: License[] = Array.from({ length: Math.min(app.totalLicenses, 15) }, (_, i) => ({
    id: `lic-${app.id}-${i}`,
    appId: app.id,
    assignedTo: i < app.assignedLicenses ? ['Alice Johnson', 'Bob Smith', 'Carol White', 'David Lee', 'Eve Davis', 'Frank Brown', 'Grace Kim'][i % 7] : undefined,
    status: i < app.assignedLicenses ? 'Active' : 'Unused',
    assignedDate: i < app.assignedLicenses ? '2023-06-01' : undefined,
    lastUsed: i < app.assignedLicenses ? '2024-02-20' : undefined,
  }));

  const complianceCerts = [
    { label: 'SOC 2', status: app.compliance?.soc2 },
    { label: 'ISO 27001', status: app.compliance?.iso27001 },
    { label: 'GDPR', status: app.compliance?.gdpr },
    { label: 'HIPAA', status: app.compliance?.hipaa },
    { label: 'Cyber Essentials', status: app.compliance?.cyberEssentials },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/apps')} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={16} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            {app.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{app.name}</h1>
              <StatusBadge status={app.status} size="md" />
              {app.url && (
                <a href="#" className="text-sm text-blue-600 flex items-center gap-1 hover:underline">
                  <ExternalLink size={12} /> {app.vendor}
                </a>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-gray-500">
              <span className="flex items-center gap-1"><Users size={13} /> {app.assignedLicenses}/{app.totalLicenses} licenses used</span>
              <span className="flex items-center gap-1"><DollarSign size={13} /> ${monthlyCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/mo</span>
              <span className="flex items-center gap-1"><Calendar size={13} /> Renews {format(new Date(app.renewalDate), 'MMM d, yyyy')} ({daysToRenewal}d)</span>
            </div>
          </div>
          <button className="btn-primary" onClick={() => addToast({ type: 'info', message: 'Edit mode coming soon' })}>
            <Edit2 size={14} /> Edit
          </button>
        </div>

        {/* License utilization bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div
              className={clsx('h-2 rounded-full', utilizationPct > 90 ? 'bg-red-400' : utilizationPct > 70 ? 'bg-yellow-400' : 'bg-blue-400')}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">{utilizationPct.toFixed(0)}% utilization</span>
          <span className="text-sm text-gray-500">{app.totalLicenses - app.assignedLicenses} unused</span>
        </div>

        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">App Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Vendor', value: app.vendor },
                    { label: 'Category', value: app.category },
                    { label: 'License Type', value: app.licenseType },
                    { label: 'Detection Source', value: app.detectionSource },
                    ...(app.adminOwner ? [{ label: 'Admin Owner', value: app.adminOwner }] : []),
                    ...(app.businessOwner ? [{ label: 'Business Owner', value: app.businessOwner }] : []),
                    ...(app.contractStart ? [{ label: 'Contract Start', value: format(new Date(app.contractStart), 'MMM d, yyyy') }] : []),
                    ...(app.vendorContact ? [{ label: 'Vendor Contact', value: app.vendorContact }] : []),
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-gray-500">{label}</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                {app.description && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                    <p className="text-sm text-gray-700">{app.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Renewal</h3>
                <div className={clsx(
                  'p-3 rounded-lg mb-3',
                  daysToRenewal < 0 ? 'bg-red-50' : daysToRenewal < 30 ? 'bg-yellow-50' : 'bg-green-50'
                )}>
                  <p className={clsx('text-lg font-bold', daysToRenewal < 0 ? 'text-red-600' : daysToRenewal < 30 ? 'text-yellow-600' : 'text-green-600')}>
                    {daysToRenewal < 0 ? 'Overdue' : `${daysToRenewal} days`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{format(new Date(app.renewalDate), 'MMMM d, yyyy')}</p>
                </div>
                <p className="text-xs text-gray-500">Notice period: {app.noticePeriodDays} days</p>
                <p className="text-xs text-gray-500 mt-1">Notice deadline: {format(new Date(new Date(app.renewalDate).getTime() - app.noticePeriodDays * 86400000), 'MMM d, yyyy')}</p>
              </div>

              <div className="card p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">License Summary</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Total', value: app.totalLicenses, color: 'text-gray-900' },
                    { label: 'Assigned', value: app.assignedLicenses, color: 'text-blue-600' },
                    { label: 'Available', value: app.totalLicenses - app.assignedLicenses, color: 'text-green-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className={clsx('text-sm font-bold', color)}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'licenses' && (
          <div className="card">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">License Seats</h3>
              <button className="btn-primary" onClick={() => addToast({ type: 'success', message: 'License assigned' })}>
                Assign License
              </button>
            </div>
            <DataTable
              data={mockLicenses}
              columns={LICENSE_COLUMNS}
            />
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: 'Cost per License', value: `$${app.costPerLicense}/seat` },
                  { label: 'Total Licenses', value: app.totalLicenses.toString() },
                  { label: 'Billing Cycle', value: app.billingCycle },
                  { label: 'Monthly Cost', value: `$${monthlyCost.toFixed(2)}` },
                  { label: 'Annual Cost', value: `$${(monthlyCost * 12).toFixed(2)}` },
                  { label: 'Cost per Active User', value: app.assignedLicenses > 0 ? `$${(monthlyCost / app.assignedLicenses).toFixed(2)}/mo` : '—' },
                  { label: 'Unused License Cost', value: `$${((app.totalLicenses - app.assignedLicenses) * (app.billingCycle === 'monthly' ? app.costPerLicense : app.costPerLicense / 12)).toFixed(2)}/mo` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Renewal Timeline</h3>
              <div className="relative pt-6 pb-2">
                {/* Timeline bar */}
                <div className="w-full h-4 bg-gray-100 rounded-full relative overflow-hidden">
                  <div className="absolute left-0 top-0 h-full bg-blue-200 rounded-full" style={{ width: `${Math.max(0, 100 - (daysToRenewal / 365) * 100)}%` }} />
                  <div className="absolute right-0 top-0 h-full bg-yellow-200" style={{ width: `${(app.noticePeriodDays / 365) * 100}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Today</span>
                  <span className="text-yellow-600">Notice: {format(new Date(new Date(app.renewalDate).getTime() - app.noticePeriodDays * 86400000), 'MMM d')}</span>
                  <span className="text-red-600">Renewal: {format(new Date(app.renewalDate), 'MMM d')}</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment History</h4>
                {[
                  { date: '2024-01-01', amount: totalCost, status: 'Paid' },
                  { date: '2023-12-01', amount: totalCost, status: 'Paid' },
                  { date: '2023-11-01', amount: totalCost, status: 'Paid' },
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">{format(new Date(p.date), 'MMM d, yyyy')}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">${p.amount.toLocaleString()}</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Certifications & Compliance</h3>
              <div className="space-y-3">
                {complianceCerts.filter(c => c.status !== undefined).map(({ label, status }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-700">{label}</span>
                    {status ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                        <CheckCircle size={14} className="text-green-500" /> Certified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <XCircle size={14} className="text-gray-400" /> Not certified
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Risk & Legal</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Risk Rating</span>
                  <span className={clsx(
                    'text-sm font-semibold px-2 py-0.5 rounded-full',
                    app.compliance?.riskRating === 'Low' ? 'bg-green-100 text-green-700' :
                    app.compliance?.riskRating === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {app.compliance?.riskRating || 'Not assessed'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-50">
                  <span className="text-sm text-gray-500">DPA Status</span>
                  <StatusBadge status={app.compliance?.dpaStatus || 'Not Required'} />
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-50">
                  <span className="text-sm text-gray-500">Security Questionnaire</span>
                  <span className={clsx(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    app.compliance?.questionnaire === 'Complete' ? 'bg-green-100 text-green-700' :
                    app.compliance?.questionnaire === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {app.compliance?.questionnaire || 'Not Started'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">App Users</h3>
              <span className="text-sm text-gray-500">{app.assignedLicenses} active users</span>
            </div>
            <div className="space-y-2">
              {['Alice Johnson', 'Bob Smith', 'Carol White', 'David Lee', 'Eve Davis'].slice(0, app.assignedLicenses).map((name, i) => (
                <div key={name} className="flex items-center gap-3 py-2 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                    {name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-400">{name.toLowerCase().replace(' ', '.')}@company.com</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>
                  <span className="text-xs text-gray-400">Last login: Feb {i + 15}, 2024</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="card p-5 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity Log</h3>
            <div className="space-y-3">
              {[
                { action: 'License Assigned', user: 'Tom Admin', date: '2024-02-21', details: `License assigned to Bob Smith` },
                { action: 'Status Changed', user: 'Tom Admin', date: '2024-01-15', details: 'Status changed to Active' },
                { action: 'App Added', user: 'Tom Admin', date: app.contractStart || '2023-06-01', details: `${app.name} added to app register` },
              ].map((entry, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50">
                  <CheckCircle size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                    <p className="text-xs text-gray-500">{entry.details}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{entry.user} · {format(new Date(entry.date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
