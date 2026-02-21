import { useNavigate } from 'react-router-dom';
import {
  Monitor, AppWindow, Users, DollarSign, AlertTriangle,
  Clock, CheckCircle, TrendingUp, BarChart2, Activity,
  RefreshCw, ChevronRight, Bell
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { useStore } from '../store/useStore';
import { spendData, assetStatusData, categorySpendData } from '../data/mockData';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import type { Asset, App, Person } from '../types';

const RADIAN = Math.PI / 180;
function renderCustomizedLabel(props: PieLabelRenderProps) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
  if (percent < 0.05) return null;
  const inner = Number(innerRadius);
  const outer = Number(outerRadius);
  const radius = inner + (outer - inner) * 0.5;
  const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
  const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(Number(percent) * 100).toFixed(0)}%`}
    </text>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const assets = useStore((s) => s.assets);
  const apps = useStore((s) => s.apps);
  const people = useStore((s) => s.people);

  const activeAssets = assets.filter((a: Asset) => a.status === 'Deployed').length;
  const totalPeople = people.filter((p: Person) => p.status === 'Active').length;
  const monthlySoftwareCost = apps.reduce((sum: number, app: App) => {
    const monthly = app.billingCycle === 'annual' ? app.costPerLicense * app.totalLicenses / 12 : app.costPerLicense * app.totalLicenses;
    return sum + monthly;
  }, 0);
  const needAction = assets.filter((a: Asset) => a.status === 'In Repair' || a.status === 'Lost').length;

  const upcomingRenewals = apps
    .filter((app: App) => {
      const days = Math.ceil((new Date(app.renewalDate).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 60;
    })
    .sort((a: App, b: App) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());

  const warrantyExpiring = assets
    .filter((a: Asset) => {
      const days = Math.ceil((new Date(a.warrantyExpiry).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 60;
    })
    .sort((a: Asset, b: Asset) => new Date(a.warrantyExpiry).getTime() - new Date(b.warrantyExpiry).getTime());

  const onboarding = people.filter((p: Person) => p.status === 'Onboarding');
  const offboarding = people.filter((p: Person) => p.status === 'Offboarding');

  const recentActivity = [
    { id: 'act1', timestamp: '2024-02-21T09:15:00Z', action: 'Asset Created', user: 'Tom Admin', details: 'Dell Latitude 5540 added to inventory', module: 'Assets' },
    { id: 'act2', timestamp: '2024-02-21T09:00:00Z', action: 'License Assigned', user: 'Tom Admin', details: 'Slack license assigned to Bob Smith', module: 'Apps' },
    { id: 'act3', timestamp: '2024-02-21T08:45:00Z', action: 'Person Onboarding', user: 'Grace Kim', details: 'Henry Wilson set to Onboarding', module: 'People' },
    { id: 'act4', timestamp: '2024-02-20T16:30:00Z', action: 'Status Changed', user: 'Tom Admin', details: 'ThinkPad X1 Carbon moved to In Repair', module: 'Assets' },
    { id: 'act5', timestamp: '2024-02-20T14:00:00Z', action: 'Integration Error', user: 'System', details: 'Xero integration authentication failed', module: 'Integrations' },
    { id: 'act6', timestamp: '2024-02-20T11:20:00Z', action: 'Person Offboarding', user: 'Grace Kim', details: 'Irene Chen set to Offboarding', module: 'People' },
    { id: 'act7', timestamp: '2024-02-19T15:45:00Z', action: 'Shadow IT Detected', user: 'System', details: 'Asana detected via SSO — 12 users', module: 'Apps' },
  ];

  const moduleColors: Record<string, string> = {
    Assets: 'bg-blue-100 text-blue-700',
    Apps: 'bg-purple-100 text-purple-700',
    People: 'bg-green-100 text-green-700',
    Integrations: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, Tom. Here's your IT overview.</p>
        </div>
        <button className="btn-secondary text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Assets" value={assets.length} icon={Monitor} iconColor="text-blue-600" iconBg="bg-blue-50" subtitle={`${activeAssets} deployed`} onClick={() => navigate('/assets')} />
        <StatCard title="Apps & Licenses" value={apps.length} icon={AppWindow} iconColor="text-purple-600" iconBg="bg-purple-50" subtitle={`${apps.filter((a: App) => a.status === 'Active').length} active`} onClick={() => navigate('/apps')} />
        <StatCard title="Total People" value={people.length} icon={Users} iconColor="text-green-600" iconBg="bg-green-50" subtitle={`${totalPeople} active`} onClick={() => navigate('/people')} />
        <StatCard title="Monthly IT Spend" value={`$${(monthlySoftwareCost + 11200).toLocaleString('en-US', { maximumFractionDigits: 0 })}`} icon={DollarSign} iconColor="text-yellow-600" iconBg="bg-yellow-50" trend={{ value: 3.2, label: 'vs last month', positive: false }} />
        <StatCard title="Needs Action" value={needAction + upcomingRenewals.length} icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-50" subtitle="Repairs, renewals, warnings" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">IT Spend Over Time</h3>
              <p className="text-xs text-gray-500">Hardware vs Software (last 7 months)</p>
            </div>
            <TrendingUp size={16} className="text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={spendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: unknown) => [`$${Number(value || 0).toLocaleString()}`, '']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="hardware" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Hardware" />
              <Line type="monotone" dataKey="software" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Software" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Asset Status</h3>
              <p className="text-xs text-gray-500">Distribution by status</p>
            </div>
            <BarChart2 size={16} className="text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={assetStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} labelLine={false} label={renderCustomizedLabel} dataKey="value">
                {assetStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Assets']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {assetStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600 truncate">{item.name}</span>
                <span className="text-xs font-medium text-gray-900 ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Spend by Category</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categorySpendData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: unknown) => [`$${Number(value || 0).toLocaleString()}`, 'Spend']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Action Required</h3>
              <p className="text-xs text-gray-500">Items needing attention</p>
            </div>
            <Bell size={15} className="text-gray-400" />
          </div>
          <div className="space-y-2 overflow-y-auto max-h-64">
            {upcomingRenewals.slice(0, 3).map((app: App) => {
              const days = Math.ceil((new Date(app.renewalDate).getTime() - Date.now()) / 86400000);
              return (
                <div key={app.id} onClick={() => navigate(`/apps/${app.id}`)} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-yellow-50 cursor-pointer transition-colors border border-gray-100">
                  <Clock size={14} className={clsx('mt-0.5 flex-shrink-0', days <= 14 ? 'text-red-500' : 'text-yellow-500')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">{app.name} renewal</p>
                    <p className="text-xs text-gray-500">{days <= 0 ? 'Overdue' : `${days} days`} · ${(app.costPerLicense * app.totalLicenses).toLocaleString()}/yr</p>
                  </div>
                  <ChevronRight size={12} className="text-gray-300 flex-shrink-0 mt-0.5" />
                </div>
              );
            })}
            {warrantyExpiring.slice(0, 2).map((asset: Asset) => {
              const days = Math.ceil((new Date(asset.warrantyExpiry).getTime() - Date.now()) / 86400000);
              return (
                <div key={asset.id} onClick={() => navigate(`/assets/${asset.id}`)} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-orange-50 cursor-pointer transition-colors border border-gray-100">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-orange-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">{asset.name} warranty</p>
                    <p className="text-xs text-gray-500">{days} days · {asset.tag}</p>
                  </div>
                  <ChevronRight size={12} className="text-gray-300 flex-shrink-0 mt-0.5" />
                </div>
              );
            })}
            {onboarding.map((p: Person) => (
              <div key={p.id} onClick={() => navigate(`/people/${p.id}`)} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors border border-blue-100">
                <Users size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">{p.name} onboarding</p>
                  <p className="text-xs text-gray-500">{p.onboardingTasks?.filter(t => !t.completed).length} tasks pending</p>
                </div>
                <ChevronRight size={12} className="text-gray-300 flex-shrink-0 mt-0.5" />
              </div>
            ))}
            {offboarding.map((p: Person) => (
              <div key={p.id} onClick={() => navigate(`/people/${p.id}`)} className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 cursor-pointer transition-colors border border-orange-100">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-orange-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">{p.name} offboarding</p>
                  <p className="text-xs text-gray-500">{p.offboardingTasks?.filter(t => !t.completed).length} tasks pending</p>
                </div>
                <ChevronRight size={12} className="text-gray-300 flex-shrink-0 mt-0.5" />
              </div>
            ))}
            {upcomingRenewals.length === 0 && warrantyExpiring.length === 0 && onboarding.length === 0 && offboarding.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                <p className="text-sm">All clear! No immediate actions needed.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
              <p className="text-xs text-gray-500">Latest platform changes</p>
            </div>
            <Activity size={15} className="text-gray-400" />
          </div>
          <div className="space-y-3 overflow-y-auto max-h-72">
            {recentActivity.map((entry, i) => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <CheckCircle size={12} className="text-gray-500" />
                  </div>
                  {i < recentActivity.length - 1 && (<div className="absolute left-3.5 top-7 w-px h-3 bg-gray-200" />)}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-medium text-gray-900">{entry.action}</p>
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', moduleColors[entry.module] || 'bg-gray-100 text-gray-600')}>{entry.module}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.details}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{entry.user} · {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
