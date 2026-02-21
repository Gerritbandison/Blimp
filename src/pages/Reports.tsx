import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Download, TrendingUp, Shield, Users, Monitor, AppWindow } from 'lucide-react';
import { useStore } from '../store/useStore';
import { spendData, categorySpendData, assetStatusData, departmentSpendData } from '../data/mockData';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

const REPORT_SECTIONS = [
  { id: 'spend', label: 'IT Spend', icon: TrendingUp },
  { id: 'assets', label: 'Assets', icon: Monitor },
  { id: 'licenses', label: 'Licenses', icon: AppWindow },
  { id: 'people', label: 'Employee Costs', icon: Users },
  { id: 'compliance', label: 'Compliance', icon: Shield },
];

const COMPLIANCE_VENDORS = [
  { vendor: 'Slack', soc2: true, iso27001: true, gdpr: true, riskRating: 'Low', dpaStatus: 'Signed' },
  { vendor: 'GitHub', soc2: true, iso27001: true, gdpr: true, riskRating: 'Low', dpaStatus: 'Signed' },
  { vendor: 'Figma', soc2: true, iso27001: false, gdpr: true, riskRating: 'Low', dpaStatus: 'Pending' },
  { vendor: 'Jira', soc2: true, iso27001: true, gdpr: true, riskRating: 'Low', dpaStatus: 'Signed' },
  { vendor: 'Zoom', soc2: true, iso27001: true, gdpr: true, riskRating: 'Medium', dpaStatus: 'Signed' },
  { vendor: 'HubSpot', soc2: true, iso27001: false, gdpr: true, riskRating: 'Medium', dpaStatus: 'Signed' },
  { vendor: 'Asana', soc2: true, iso27001: false, gdpr: true, riskRating: 'Low', dpaStatus: 'Not Required' },
  { vendor: '1Password', soc2: true, iso27001: true, gdpr: true, riskRating: 'Low', dpaStatus: 'Signed' },
];

export function Reports() {
  const navigate = useNavigate();
  const { assets, apps, people } = useStore();
  const [activeSection, setActiveSection] = useState('spend');

  const totalAssetCost = assets.reduce((s, a) => s + a.cost, 0);
  const totalSoftwareCostAnnual = apps.reduce((s, a) => {
    return s + (a.billingCycle === 'annual' ? a.costPerLicense * a.totalLicenses : a.costPerLicense * a.totalLicenses * 12);
  }, 0);

  const licenseUtilData = apps.map((a) => ({
    name: a.name,
    utilized: a.assignedLicenses,
    unused: a.totalLicenses - a.assignedLicenses,
    utilPct: Math.round((a.assignedLicenses / a.totalLicenses) * 100),
  }));

  const warrantyExpiringAssets = assets.filter((a) => {
    const days = Math.ceil((new Date(a.warrantyExpiry).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 90;
  });

  const employeeCostData = people.filter(p => p.status === 'Active').map((p) => ({
    name: p.name.split(' ')[0],
    cost: p.totalItCost || 0,
    assets: p.assetsAssigned,
    licenses: p.licensesAssigned,
  })).sort((a, b) => b.cost - a.cost);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Analytics and insights across your IT estate</p>
        </div>
        <button className="btn-secondary" onClick={() => {}}>
          <Download size={15} /> Export All
        </button>
      </div>

      {/* Section Nav */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {REPORT_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeSection === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── IT Spend ── */}
      {activeSection === 'spend' && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Hardware Cost', value: `$${totalAssetCost.toLocaleString()}`, sub: 'Lifetime asset spend' },
              { label: 'Annual Software Cost', value: `$${totalSoftwareCostAnnual.toLocaleString()}`, sub: 'All active subscriptions' },
              { label: 'Monthly IT Spend', value: `$${Math.round((totalSoftwareCostAnnual / 12 + 11200)).toLocaleString()}`, sub: 'Hardware + Software' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="card p-5">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly IT Spend (7 months)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={spendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: unknown) => [`$${Number(v ?? 0).toLocaleString()}`, '']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="hardware" fill="#3b82f6" name="Hardware" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="software" fill="#8b5cf6" name="Software" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Spend by Department</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={departmentSpendData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="department" width={80} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: unknown) => [`$${Number(v ?? 0).toLocaleString()}`, '']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Spend by Category</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categorySpendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: unknown) => [`$${Number(v ?? 0).toLocaleString()}`, 'Spend']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Spend Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={spendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: unknown) => [`$${Number(v ?? 0).toLocaleString()}`, '']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Total Spend" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Assets ── */}
      {activeSection === 'assets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Assets', value: assets.length },
              { label: 'Deployed', value: assets.filter(a => a.status === 'Deployed').length },
              { label: 'In Stock', value: assets.filter(a => a.status === 'In Stock').length },
              { label: 'Warranty Expiring (90d)', value: warrantyExpiringAssets.length },
            ].map(({ label, value }) => (
              <div key={label} className="card p-5">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Asset Status Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={assetStatusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                    {assetStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, 'Assets']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Assets by Type</h3>
              <div className="space-y-2">
                {['Laptop', 'Monitor', 'Phone', 'Tablet', 'Printer', 'Peripheral'].map((type) => {
                  const count = assets.filter(a => a.type === type).length;
                  const pct = Math.round((count / assets.length) * 100);
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-20">{type}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Warranty expiring table */}
          {warrantyExpiringAssets.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Warranty Expiring in 90 Days</h3>
              <div className="divide-y divide-gray-50">
                {warrantyExpiringAssets.map((asset) => {
                  const days = Math.ceil((new Date(asset.warrantyExpiry).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={asset.id} className="flex items-center gap-4 py-2.5 hover:bg-gray-50 cursor-pointer" onClick={() => { void navigate(`/assets/${asset.id}`); }}>
                      <Monitor size={15} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                        <p className="text-xs text-gray-500">{asset.tag} · {asset.assignedTo || 'Unassigned'}</p>
                      </div>
                      <span className={clsx('text-sm font-medium', days <= 30 ? 'text-red-600' : 'text-yellow-600')}>
                        {days} days
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Licenses ── */}
      {activeSection === 'licenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Licenses', value: apps.reduce((s, a) => s + a.totalLicenses, 0) },
              { label: 'Assigned', value: apps.reduce((s, a) => s + a.assignedLicenses, 0) },
              {
                label: 'Unused (wasted cost)',
                value: `$${apps.reduce((s, a) => {
                  const unused = a.totalLicenses - a.assignedLicenses;
                  const monthly = a.billingCycle === 'monthly' ? a.costPerLicense : a.costPerLicense / 12;
                  return s + unused * monthly;
                }, 0).toFixed(0)}/mo`
              },
            ].map(({ label, value }) => (
              <div key={label} className="card p-5">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight">{value}</p>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">License Utilization by App</h3>
            <div className="space-y-3">
              {licenseUtilData.map((d) => (
                <div key={d.name} className="flex items-center gap-4">
                  <span className="text-sm text-gray-700 w-28 truncate">{d.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={clsx('h-3 rounded-full', d.utilPct > 90 ? 'bg-red-400' : d.utilPct < 50 ? 'bg-yellow-400' : 'bg-blue-400')}
                      style={{ width: `${d.utilPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{d.utilized}/{d.utilized + d.unused}</span>
                  <span className={clsx('text-xs font-medium w-10 text-right', d.utilPct < 50 ? 'text-yellow-600' : 'text-gray-600')}>{d.utilPct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Upcoming Renewals (Next 6 Months)</h3>
            <div className="divide-y divide-gray-50">
              {apps.filter(a => {
                const days = Math.ceil((new Date(a.renewalDate).getTime() - Date.now()) / 86400000);
                return days >= 0 && days <= 180;
              }).sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime()).map((app) => {
                const days = Math.ceil((new Date(app.renewalDate).getTime() - Date.now()) / 86400000);
                return (
                  <div key={app.id} className="flex items-center gap-4 py-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {app.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{app.name}</p>
                      <p className="text-xs text-gray-500">{app.vendor} · {app.totalLicenses} seats</p>
                    </div>
                    <span className={clsx('text-sm font-medium', days <= 30 ? 'text-red-600' : 'text-yellow-600')}>{days}d</span>
                    <span className="text-sm font-semibold text-gray-900">${(app.costPerLicense * app.totalLicenses).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Costs ── */}
      {activeSection === 'people' && (
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">IT Cost per Employee</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={employeeCostData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => [`$${Number(v ?? 0).toLocaleString()}`, 'Annual IT Cost']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Cost by Department</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentSpendData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="department" width={80} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: unknown) => [`$${Number(v ?? 0).toLocaleString()}`, '']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="hardware" name="Hardware" fill="#3b82f6" stackId="a" />
                <Bar dataKey="software" name="Software" fill="#8b5cf6" stackId="a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Compliance ── */}
      {activeSection === 'compliance' && (
        <div className="space-y-6">
          <div className="card p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Vendor Compliance Matrix</h3>
              <button className="btn-secondary" onClick={() => {}}>
                <Download size={14} /> Export
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">SOC 2</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">ISO 27001</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">GDPR</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Risk</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">DPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {COMPLIANCE_VENDORS.map((v) => (
                  <tr key={v.vendor} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{v.vendor}</td>
                    {[v.soc2, v.iso27001, v.gdpr].map((cert, i) => (
                      <td key={i} className="py-2.5 px-3 text-center">
                        {cert
                          ? <span className="text-green-500 text-base">✓</span>
                          : <span className="text-gray-300 text-base">✗</span>
                        }
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                        v.riskRating === 'Low' ? 'bg-green-100 text-green-700' :
                        v.riskRating === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {v.riskRating}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full',
                        v.dpaStatus === 'Signed' ? 'bg-green-100 text-green-700' :
                        v.dpaStatus === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      )}>
                        {v.dpaStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
