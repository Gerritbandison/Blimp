import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts';
import {
  DollarSign, TrendingDown, TrendingUp, Calendar,
  Download, Building2, Monitor, AppWindow,
  Users,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { exportToCSV } from '../utils/csvExport';
import type { Asset, App } from '../types';

const RADIAN = Math.PI / 180;
function renderPieLabel(props: PieLabelRenderProps) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
  if (Number(percent) < 0.05) return null;
  const r = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
  const x = Number(cx) + r * Math.cos(-Number(midAngle) * RADIAN);
  const y = Number(cy) + r * Math.sin(-Number(midAngle) * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(Number(percent) * 100).toFixed(0)}%`}
    </text>
  );
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function Spend() {
  const navigate = useNavigate();
  const { assets, apps, people } = useStore();
  const [period, setPeriod] = useState<'monthly' | 'annual'>('annual');

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalHardware = assets.reduce((s, a: Asset) => s + a.cost, 0);
  const totalSoftwareAnnual = apps.reduce((s, a: App) => {
    return s + (a.billingCycle === 'annual' ? a.costPerLicense * a.totalLicenses : a.costPerLicense * a.totalLicenses * 12);
  }, 0);
  const totalSoftwareMonthly = totalSoftwareAnnual / 12;
  const totalAnnual = totalHardware + totalSoftwareAnnual;
  const totalMonthly = totalHardware / 36 + totalSoftwareMonthly;
  const activePeople = people.filter((p) => p.status === 'Active').length;
  const costPerEmployee = activePeople > 0 ? totalAnnual / activePeople : 0;
  const unusedLicenses = apps.reduce((s, a: App) => s + (a.totalLicenses - a.assignedLicenses), 0);
  const wastedSpend = apps.reduce((s, a: App) => {
    const unused = a.totalLicenses - a.assignedLicenses;
    const annual = a.billingCycle === 'annual' ? a.costPerLicense : a.costPerLicense * 12;
    return s + unused * annual;
  }, 0);

  // ── Vendor breakdown ────────────────────────────────────────────────────────
  const vendorData = useMemo(() => {
    const vendors: Record<string, { hardware: number; software: number; count: number }> = {};
    assets.forEach((a: Asset) => {
      const v = a.vendor || a.make || 'Unknown';
      if (!vendors[v]) vendors[v] = { hardware: 0, software: 0, count: 0 };
      vendors[v].hardware += a.cost;
      vendors[v].count++;
    });
    apps.forEach((a: App) => {
      const v = a.vendor || 'Unknown';
      if (!vendors[v]) vendors[v] = { hardware: 0, software: 0, count: 0 };
      const annual = a.billingCycle === 'annual' ? a.costPerLicense * a.totalLicenses : a.costPerLicense * a.totalLicenses * 12;
      vendors[v].software += annual;
      vendors[v].count++;
    });
    return Object.entries(vendors)
      .map(([vendor, data]) => ({ vendor, total: data.hardware + data.software, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [assets, apps]);

  // ── Department breakdown ─────────────────────────────────────────────────────
  const departmentData = useMemo(() => {
    const depts: Record<string, { hardware: number; software: number; people: number }> = {};
    assets.forEach((a: Asset) => {
      const dept = a.department || 'Unassigned';
      if (!depts[dept]) depts[dept] = { hardware: 0, software: 0, people: 0 };
      depts[dept].hardware += a.cost;
    });
    people.forEach((p) => {
      if (p.status !== 'Active') return;
      const dept = p.department || 'Unassigned';
      if (!depts[dept]) depts[dept] = { hardware: 0, software: 0, people: 0 };
      depts[dept].people++;
    });
    return Object.entries(depts)
      .map(([department, data]) => ({ department, total: data.hardware + data.software, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [assets, people]);

  // ── Category pie ──────────────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    assets.forEach((a: Asset) => {
      const cat = a.category || a.type || 'Other';
      cats[cat] = (cats[cat] || 0) + a.cost;
    });
    cats['Software / SaaS'] = totalSoftwareAnnual;
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [assets, totalSoftwareAnnual]);

  // ── Monthly spend trend ───────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const months: Record<string, { hardware: number; software: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[format(d, 'MMM yy')] = { hardware: 0, software: 0 };
    }
    assets.forEach((a: Asset) => {
      const key = format(new Date(a.purchaseDate), 'MMM yy');
      if (months[key]) months[key].hardware += a.cost;
    });
    Object.keys(months).forEach((k) => { months[k].software = Math.round(totalSoftwareMonthly); });
    return Object.entries(months).map(([month, data]) => ({
      month,
      hardware: data.hardware,
      software: data.software,
      total: data.hardware + data.software,
    }));
  }, [assets, totalSoftwareMonthly]);

  // ── Upcoming renewals ─────────────────────────────────────────────────────────
  const renewals = apps
    .filter((a: App) => {
      const days = Math.ceil((new Date(a.renewalDate).getTime() - Date.now()) / 86400000);
      return days >= -30 && days <= 90;
    })
    .sort((a: App, b: App) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">IT Spend</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Cost analysis across hardware, software, and vendors</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setPeriod('monthly')} className={clsx('px-3 py-1.5 text-xs font-medium transition-colors', period === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>Monthly</button>
            <button onClick={() => setPeriod('annual')} className={clsx('px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200', period === 'annual' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>Annual</button>
          </div>
          <button className="btn-secondary" onClick={() => {
            exportToCSV(
              vendorData as unknown as Record<string, unknown>[],
              [
                { key: 'vendor', label: 'Vendor' },
                { key: 'hardware', label: 'Hardware Spend' },
                { key: 'software', label: 'Software Spend' },
                { key: 'total', label: 'Total' },
                { key: 'count', label: 'Items' },
              ],
              'spend-by-vendor'
            );
          }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><DollarSign size={15} className="text-blue-600" /></div>
            <span className="text-xs text-gray-500">Total IT Spend</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{fmt(period === 'annual' ? totalAnnual : totalMonthly)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{period === 'annual' ? 'per year' : 'per month'}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><Monitor size={15} className="text-indigo-600" /></div>
            <span className="text-xs text-gray-500">Hardware</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{fmt(totalHardware)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{assets.length} assets total</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><AppWindow size={15} className="text-purple-600" /></div>
            <span className="text-xs text-gray-500">Software</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{fmt(period === 'annual' ? totalSoftwareAnnual : totalSoftwareMonthly)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{apps.length} subscriptions</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><Users size={15} className="text-green-600" /></div>
            <span className="text-xs text-gray-500">Cost / Employee</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{fmt(period === 'annual' ? costPerEmployee : costPerEmployee / 12)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{activePeople} active employees</p>
        </div>
        <div className="card p-4 border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><TrendingDown size={15} className="text-red-500" /></div>
            <span className="text-xs text-gray-500">Wasted Spend</span>
          </div>
          <p className="text-xl font-bold text-red-600">{fmt(period === 'annual' ? wastedSpend : wastedSpend / 12)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{unusedLicenses} unused licences</p>
        </div>
      </div>

      {/* Charts Row 1: Trend + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Spend Trend</h3>
              <p className="text-xs text-gray-500">Hardware vs Software (12 months)</p>
            </div>
            <TrendingUp size={16} className="text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: unknown) => [fmt(Number(v || 0)), '']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
              <Line type="monotone" dataKey="hardware" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} name="Hardware" />
              <Line type="monotone" dataKey="software" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2.5 }} name="Software" />
              <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="4 2" name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Spend by Category</h3>
              <p className="text-xs text-gray-500">Hardware + Software</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} labelLine={false} label={renderPieLabel} dataKey="value">
                {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => [fmt(Number(v || 0)), '']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {categoryData.slice(0, 6).map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[10px] text-gray-600 truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Vendor table + Department + Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Breakdown */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Vendor Breakdown</h3>
              <p className="text-xs text-gray-500">{vendorData.length} vendors · Top spenders</p>
            </div>
            <Building2 size={16} className="text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-500">Vendor</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Hardware</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Software</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Total</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Items</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">% of Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vendorData.slice(0, 10).map((v) => (
                  <tr key={v.vendor} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 font-medium text-gray-900">{v.vendor}</td>
                    <td className="py-2.5 text-right text-gray-600">{v.hardware > 0 ? fmt(v.hardware) : '-'}</td>
                    <td className="py-2.5 text-right text-gray-600">{v.software > 0 ? fmt(v.software) : '-'}</td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">{fmt(v.total)}</td>
                    <td className="py-2.5 text-right text-gray-500">{v.count}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(100, totalAnnual > 0 ? (v.total / totalAnnual) * 100 : 0)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{totalAnnual > 0 ? ((v.total / totalAnnual) * 100).toFixed(0) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Upcoming Renewals</h3>
              <p className="text-xs text-gray-500">Next 90 days</p>
            </div>
            <Calendar size={16} className="text-gray-400" />
          </div>
          <div className="space-y-2 overflow-y-auto max-h-80">
            {renewals.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No upcoming renewals</p>
            ) : renewals.map((app: App) => {
              const days = Math.ceil((new Date(app.renewalDate).getTime() - Date.now()) / 86400000);
              const cost = app.billingCycle === 'annual' ? app.costPerLicense * app.totalLicenses : app.costPerLicense * app.totalLicenses * 12;
              return (
                <div key={app.id} onClick={() => { void navigate(`/apps/${app.id}`); }} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0', days <= 0 ? 'bg-red-500' : days <= 14 ? 'bg-orange-500' : days <= 30 ? 'bg-yellow-500' : 'bg-blue-500')}>
                    {days <= 0 ? '!' : days}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{app.name}</p>
                    <p className="text-[10px] text-gray-500">{format(new Date(app.renewalDate), 'MMM d, yyyy')} · {app.vendor}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{fmt(cost)}</p>
                    <p className="text-[10px] text-gray-400">annual</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Department Spend Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Spend by Department</h3>
            <p className="text-xs text-gray-500">Hardware allocation across teams</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={departmentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: unknown) => [fmt(Number(v || 0)), '']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
            <Bar dataKey="hardware" fill="#3b82f6" name="Hardware" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
