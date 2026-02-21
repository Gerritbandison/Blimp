import { useState } from 'react';
import {
  Building2, Users, SlidersHorizontal, Bell, Tag, Key, CreditCard,
  Plus, Trash2, Copy, RefreshCw
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useStore } from '../store/useStore';
import { mockOrgUsers } from '../data/mockData';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import type { UserRole } from '../types';

const SETTINGS_NAV = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'fields', label: 'Custom Fields', icon: SlidersHorizontal },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'statuses', label: 'Asset Statuses', icon: Tag },
  { id: 'api', label: 'API Access', icon: Key },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const ROLES: UserRole[] = ['Admin', 'IT Manager', 'Finance', 'Read Only', 'Custom'];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  'Admin': 'Full access to all modules, settings, and billing',
  'IT Manager': 'Can manage assets, apps, people. Cannot access billing or user management',
  'Finance': 'Read access to assets and apps with financial data. Can export reports',
  'Read Only': 'Read-only access to all modules',
  'Custom': 'Custom permissions configured per user',
};

export function Settings() {
  const { addToast } = useStore();
  const [activeSection, setActiveSection] = useState('company');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Read Only');
  const [users, setUsers] = useState(mockOrgUsers);

  const [companySettings, setCompanySettings] = useState({
    name: 'Acme Corp',
    domain: 'acme.com',
    currency: 'USD',
    fiscalYearStart: 'January',
    timezone: 'America/New_York',
    plan: 'Business',
  });

  const [notifications, setNotifications] = useState({
    renewalReminder: true,
    renewalDays: 30,
    warrantyExpiry: true,
    warrantyDays: 60,
    lowStock: true,
    onboarding: true,
    offboarding: true,
    shadowIt: true,
  });

  function handleInvite() {
    if (!inviteEmail) return;
    addToast({ type: 'success', message: `Invitation sent to ${inviteEmail}` });
    setShowInviteModal(false);
    setInviteEmail('');
  }

  function handleSave() {
    addToast({ type: 'success', message: 'Settings saved successfully' });
  }

  const apiKey = 'blimp_sk_live_xK9mN2pQ7rT4vW8yZ3cA6bE1dF5hJ0';

  return (
    <div className="flex h-full">
      {/* Settings sidebar nav */}
      <div className="w-56 bg-gray-50 border-r border-gray-200 flex-shrink-0 py-6">
        <div className="px-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</p>
        </div>
        <nav className="px-2 space-y-0.5">
          {SETTINGS_NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                activeSection === id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ── Company Settings ── */}
        {activeSection === 'company' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Company Settings</h2>
              <p className="text-sm text-gray-500">Configure your organization details</p>
            </div>
            <div className="card p-5 space-y-4">
              {[
                { label: 'Company Name', key: 'name', type: 'text' },
                { label: 'Domain', key: 'domain', type: 'text' },
                { label: 'Fiscal Year Start', key: 'fiscalYearStart', type: 'select', options: ['January', 'April', 'July', 'October'] },
                { label: 'Default Currency', key: 'currency', type: 'select', options: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'] },
                { label: 'Timezone', key: 'timezone', type: 'select', options: ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo'] },
              ].map(({ label, key, type, options }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>
                  {type === 'select' ? (
                    <select
                      className="select"
                      value={companySettings[key as keyof typeof companySettings]}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, [key]: e.target.value }))}
                    >
                      {options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className="input"
                      value={companySettings[key as keyof typeof companySettings]}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={handleSave}>Save Changes</button>
            </div>
          </div>
        )}

        {/* ── User Management ── */}
        {activeSection === 'users' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">User Management</h2>
                <p className="text-sm text-gray-500">{users.length} members · manage access and roles</p>
              </div>
              <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
                <Plus size={15} /> Invite User
              </button>
            </div>

            {/* Role cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {ROLES.map((role) => (
                <div key={role} className="card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">{role}</p>
                    <span className="text-xs text-gray-400">{users.filter(u => u.role === role).length}</span>
                  </div>
                  <p className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              ))}
            </div>

            {/* Users table */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <span className="text-xs text-gray-500 hidden lg:block">{user.department}</span>
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={user.role}
                      onChange={(e) => {
                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: e.target.value as UserRole } : u));
                        addToast({ type: 'success', message: `${user.name}'s role updated` });
                      }}
                    >
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    <StatusBadge status={user.status} />
                    {user.lastLogin && (
                      <span className="text-xs text-gray-400 hidden lg:block whitespace-nowrap">
                        {format(new Date(user.lastLogin), 'MMM d')}
                      </span>
                    )}
                    <button className="text-gray-400 hover:text-red-500 transition-colors" onClick={() => addToast({ type: 'success', message: `${user.name} removed` })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Custom Fields ── */}
        {activeSection === 'fields' && (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Custom Fields</h2>
                <p className="text-sm text-gray-500">Add custom data fields to assets, apps, and people</p>
              </div>
              <button className="btn-primary" onClick={() => addToast({ type: 'info', message: 'Custom field creation coming soon' })}>
                <Plus size={15} /> Add Field
              </button>
            </div>

            {['Assets', 'Apps', 'People'].map((module) => (
              <div key={module} className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{module} Fields</h3>
                <div className="space-y-2">
                  {module === 'Assets' && [
                    { name: 'Department', type: 'select', required: true },
                    { name: 'Category', type: 'select', required: false },
                    { name: 'Purchase Order', type: 'text', required: false },
                  ].map((field) => (
                    <div key={field.name} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{field.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{field.type} · {field.required ? 'Required' : 'Optional'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Built-in</span>
                      </div>
                    </div>
                  ))}
                  <div
                    className="flex items-center gap-2 p-3 border border-dashed border-gray-200 rounded-lg text-gray-400 cursor-pointer hover:border-blue-300 hover:text-blue-500 transition-colors"
                    onClick={() => addToast({ type: 'info', message: 'Custom field creation coming soon' })}
                  >
                    <Plus size={14} />
                    <span className="text-sm">Add custom field</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Notifications ── */}
        {activeSection === 'notifications' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Notification Settings</h2>
              <p className="text-sm text-gray-500">Configure when and how you receive alerts</p>
            </div>
            <div className="card p-5 space-y-5">
              {[
                { key: 'renewalReminder', label: 'License Renewal Reminders', desc: 'Get notified before license renewals', hasDays: true, daysKey: 'renewalDays' },
                { key: 'warrantyExpiry', label: 'Warranty Expiry Alerts', desc: 'Get notified before warranty expiration', hasDays: true, daysKey: 'warrantyDays' },
                { key: 'lowStock', label: 'Low Stock Alerts', desc: 'Alert when asset stock drops below threshold' },
                { key: 'onboarding', label: 'Onboarding Tasks', desc: 'Reminders for pending onboarding steps' },
                { key: 'offboarding', label: 'Offboarding Tasks', desc: 'Reminders for pending offboarding steps' },
                { key: 'shadowIt', label: 'Shadow IT Detection', desc: 'Alert when new unregistered apps are detected' },
              ].map(({ key, label, desc, hasDays, daysKey }) => (
                <div key={key} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    {hasDays && notifications[key as keyof typeof notifications] && daysKey && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">Notify</span>
                        <input
                          type="number"
                          className="w-16 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={notifications[daysKey as keyof typeof notifications] as number}
                          onChange={(e) => setNotifications(prev => ({ ...prev, [daysKey]: parseInt(e.target.value) }))}
                        />
                        <span className="text-xs text-gray-500">days before</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof notifications] }))}
                    className={clsx(
                      'relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5',
                      notifications[key as keyof typeof notifications] ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  >
                    <span className={clsx(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      notifications[key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={handleSave}>Save Preferences</button>
            </div>
          </div>
        )}

        {/* ── Asset Statuses ── */}
        {activeSection === 'statuses' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Asset Statuses</h2>
              <p className="text-sm text-gray-500">Customize the lifecycle stages for your assets</p>
            </div>
            <div className="card p-5 space-y-2">
              {[
                { name: 'Deployed', color: '#22c55e', description: 'Asset is actively in use' },
                { name: 'In Stock', color: '#3b82f6', description: 'Asset is available in inventory' },
                { name: 'In Repair', color: '#f59e0b', description: 'Asset is being serviced' },
                { name: 'Retired', color: '#9ca3af', description: 'Asset is no longer in service' },
                { name: 'Lost', color: '#ef4444', description: 'Asset has been lost or stolen' },
              ].map((status) => (
                <div key={status.name} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{status.name}</p>
                    <p className="text-xs text-gray-500">{status.description}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Default</span>
                </div>
              ))}
              <div
                className="flex items-center gap-2 p-3 border border-dashed border-gray-200 rounded-lg text-gray-400 cursor-pointer hover:border-blue-300"
                onClick={() => addToast({ type: 'info', message: 'Custom status creation coming soon' })}
              >
                <Plus size={14} />
                <span className="text-sm">Add custom status</span>
              </div>
            </div>
          </div>
        )}

        {/* ── API Access ── */}
        {activeSection === 'api' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">API Access</h2>
              <p className="text-sm text-gray-500">Manage API keys and webhook endpoints</p>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">API Keys</h3>
                <button className="btn-secondary" onClick={() => addToast({ type: 'success', message: 'New API key generated' })}>
                  <Plus size={14} /> Generate Key
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <Key size={15} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Production Key</p>
                    <p className="font-mono text-xs text-gray-500 truncate">{apiKey}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(apiKey); addToast({ type: 'success', message: 'API key copied to clipboard' }); }}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => addToast({ type: 'warning', message: 'API key rotated — update your integrations' })}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Webhooks</h3>
                <button className="btn-secondary" onClick={() => addToast({ type: 'info', message: 'Webhook configuration coming soon' })}>
                  <Plus size={14} /> Add Webhook
                </button>
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <Key size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No webhooks configured</p>
                <p className="text-xs text-gray-400 mt-0.5">Receive real-time events when data changes</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Billing ── */}
        {activeSection === 'billing' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Billing</h2>
              <p className="text-sm text-gray-500">Manage your subscription and invoices</p>
            </div>

            <div className="card p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-80">Current Plan</p>
                  <p className="text-2xl font-bold mt-1">Business</p>
                  <p className="text-sm opacity-70 mt-0.5">Up to 500 assets · 50 users · All integrations</p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-80">Monthly</p>
                  <p className="text-3xl font-bold mt-0.5">$299</p>
                  <p className="text-xs opacity-70">per month</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className="px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                  Upgrade to Enterprise
                </button>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Usage</h3>
              <div className="space-y-3">
                {[
                  { label: 'Assets', used: 100, limit: 500 },
                  { label: 'Users', used: 6, limit: 50 },
                  { label: 'Apps / Licenses', used: 10, limit: 100 },
                  { label: 'Integrations', used: 5, limit: 20 },
                ].map(({ label, used, limit }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="text-gray-900 font-medium">{used} / {limit}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={clsx('h-2 rounded-full', (used / limit) > 0.8 ? 'bg-red-400' : 'bg-blue-400')}
                        style={{ width: `${(used / limit) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Invoices</h3>
              <div className="divide-y divide-gray-50">
                {[
                  { date: '2024-02-01', amount: 299, status: 'Paid' },
                  { date: '2024-01-01', amount: 299, status: 'Paid' },
                  { date: '2023-12-01', amount: 299, status: 'Paid' },
                ].map((inv, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{format(new Date(inv.date), 'MMMM yyyy')}</p>
                      <p className="text-xs text-gray-500">Business Plan</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">${inv.amount}</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{inv.status}</span>
                      <button className="text-xs text-blue-600 hover:underline">PDF</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleInvite}>Send Invite</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Role</label>
            <select className="select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">{ROLE_DESCRIPTIONS[inviteRole]}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
