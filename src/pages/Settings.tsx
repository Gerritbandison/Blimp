import { useState } from 'react';
import {
  Building2, Users, SlidersHorizontal, Bell, Tag, Key, CreditCard,
  Plus, Trash2, Copy, RefreshCw, Palette, Sun, Moon, Laptop, Edit3, Eye, EyeOff
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import type { UserRole, CustomField } from '../types';

const SETTINGS_NAV = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'fields', label: 'Custom Fields', icon: SlidersHorizontal },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'statuses', label: 'Asset Statuses', icon: Tag },
  { id: 'appearance', label: 'Appearance', icon: Palette },
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
  const {
    addToast, companySettings, updateCompanySettings,
    notificationSettings, updateNotificationSettings,
    orgUsers, updateOrgUser, theme, setTheme,
    customFields, addCustomField, updateCustomField, deleteCustomField,
    currentUserRole, setCurrentUserRole,
  } = useStore();
  const [activeSection, setActiveSection] = useState('company');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Read Only');

  // Custom field modal state
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<CustomField['type']>('text');
  const [fieldModule, setFieldModule] = useState<CustomField['module']>('asset');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);

  function handleInvite() {
    if (!inviteEmail) return;
    addToast({ type: 'success', message: `Invitation sent to ${inviteEmail}` });
    setShowInviteModal(false);
    setInviteEmail('');
  }

  function handleSaveCompany() {
    addToast({ type: 'success', message: 'Company settings saved' });
  }

  function handleSaveNotifications() {
    addToast({ type: 'success', message: 'Notification preferences saved' });
  }

  function openFieldModal(field?: CustomField) {
    if (field) {
      setEditingField(field);
      setFieldName(field.name);
      setFieldType(field.type);
      setFieldModule(field.module);
      setFieldRequired(field.required);
      setFieldOptions(field.options?.join(', ') || '');
    } else {
      setEditingField(null);
      setFieldName('');
      setFieldType('text');
      setFieldModule('asset');
      setFieldRequired(false);
      setFieldOptions('');
    }
    setShowFieldModal(true);
  }

  function handleSaveField() {
    if (!fieldName.trim()) return;
    const opts = fieldType === 'select' ? fieldOptions.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    if (editingField) {
      updateCustomField(editingField.id, { name: fieldName, type: fieldType, module: fieldModule, required: fieldRequired, options: opts });
      addToast({ type: 'success', message: `Field "${fieldName}" updated` });
    } else {
      addCustomField({ id: `cf${Date.now()}`, name: fieldName, type: fieldType, module: fieldModule, required: fieldRequired, options: opts });
      addToast({ type: 'success', message: `Field "${fieldName}" created` });
    }
    setShowFieldModal(false);
  }

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('blimp-api-key') ?? '';
  });
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomPart = Array.from({ length: 32 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    const key = `blimp_sk_live_${randomPart}`;
    setApiKey(key);
    setApiKeyVisible(true);
    localStorage.setItem('blimp-api-key', key);
    addToast({ type: 'success', message: 'New API key generated — save it now, it will not be shown again' });
  }

  return (
    <div className="flex h-full">
      <div className="w-56 bg-gray-50 border-r border-gray-200 flex-shrink-0 py-6">
        <div className="px-4 mb-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</p></div>
        <nav className="px-2 space-y-0.5">
          {SETTINGS_NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)} className={clsx('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left', activeSection === id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')}>
              <Icon size={15} />{label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── Company Settings (persisted) ── */}
        {activeSection === 'company' && (
          <div className="max-w-2xl space-y-6">
            <div><h2 className="text-lg font-bold text-gray-900">Company Settings</h2><p className="text-sm text-gray-500">Configure your organization details</p></div>
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
                    <select className="select" value={companySettings[key as keyof typeof companySettings]} onChange={(e) => updateCompanySettings({ [key]: e.target.value })}>
                      {options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={companySettings[key as keyof typeof companySettings]} onChange={(e) => updateCompanySettings({ [key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end"><button className="btn-primary" onClick={handleSaveCompany}>Save Changes</button></div>
          </div>
        )}

        {/* ── User Management (persisted via orgUsers) ── */}
        {activeSection === 'users' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div><h2 className="text-lg font-bold text-gray-900">User Management</h2><p className="text-sm text-gray-500">{orgUsers.length} members · manage access and roles</p></div>
              <button className="btn-primary" onClick={() => setShowInviteModal(true)}><Plus size={15} /> Invite User</button>
            </div>

            {/* Current user role switcher (demo) */}
            <div className="card p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Your Current Role</p>
                  <p className="text-xs text-gray-500 mt-0.5">Switch roles to preview permission enforcement across the app</p>
                </div>
                <select
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={currentUserRole}
                  onChange={(e) => {
                    setCurrentUserRole(e.target.value as UserRole);
                    addToast({ type: 'info', message: `Switched to ${e.target.value} role` });
                  }}
                >
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-2">{ROLE_DESCRIPTIONS[currentUserRole]}</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {ROLES.map((role) => (
                <div key={role} className="card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">{role}</p>
                    <span className="text-xs text-gray-400">{orgUsers.filter(u => u.role === role).length}</span>
                  </div>
                  <p className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              ))}
            </div>
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-900">Team Members</h3></div>
              <div className="divide-y divide-gray-50">
                {orgUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{user.name.split(' ').map(n => n[0]).join('')}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></div>
                    <span className="text-xs text-gray-500 hidden lg:block">{user.department}</span>
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={user.role}
                      onChange={(e) => {
                        updateOrgUser(user.id, { role: e.target.value as UserRole });
                        addToast({ type: 'success', message: `${user.name}'s role updated to ${e.target.value}` });
                      }}
                    >
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    <StatusBadge status={user.status} />
                    {user.lastLogin && <span className="text-xs text-gray-400 hidden lg:block whitespace-nowrap">{format(new Date(user.lastLogin), 'MMM d')}</span>}
                    <button className="text-gray-400 hover:text-red-500 transition-colors" onClick={() => addToast({ type: 'success', message: `${user.name} removed` })}><Trash2 size={14} /></button>
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
              <div><h2 className="text-lg font-bold text-gray-900">Custom Fields</h2><p className="text-sm text-gray-500">Add custom data fields to assets, apps, and people</p></div>
              <button className="btn-primary" onClick={() => openFieldModal()}><Plus size={15} /> Add Field</button>
            </div>
            {([
              { key: 'asset', label: 'Assets', builtIn: [{ name: 'Department', type: 'select', required: true }, { name: 'Category', type: 'select', required: false }, { name: 'Purchase Order', type: 'text', required: false }] },
              { key: 'app', label: 'Apps', builtIn: [{ name: 'Vendor Contact', type: 'text', required: false }] },
              { key: 'person', label: 'People', builtIn: [{ name: 'Phone', type: 'text', required: false }] },
            ] as const).map(({ key, label, builtIn }) => (
              <div key={key} className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{label} Fields</h3>
                <div className="space-y-2">
                  {builtIn.map((field) => (
                    <div key={field.name} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                      <div><p className="text-sm font-medium text-gray-900">{field.name}</p><p className="text-xs text-gray-500 capitalize">{field.type} · {field.required ? 'Required' : 'Optional'}</p></div>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Built-in</span>
                    </div>
                  ))}
                  {customFields.filter(f => f.module === key).map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg group">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{field.name}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {field.type}{field.type === 'select' && field.options ? ` (${field.options.join(', ')})` : ''} · {field.required ? 'Required' : 'Optional'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Custom</span>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600" onClick={() => openFieldModal(field)}><Edit3 size={14} /></button>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500" onClick={() => setDeleteFieldId(field.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                  <div
                    className="flex items-center gap-2 p-3 border border-dashed border-gray-200 rounded-lg text-gray-400 cursor-pointer hover:border-blue-300 hover:text-blue-500 transition-colors"
                    onClick={() => { setFieldModule(key); openFieldModal(); }}
                  >
                    <Plus size={14} /><span className="text-sm">Add custom field to {label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Notifications (persisted) ── */}
        {activeSection === 'notifications' && (
          <div className="max-w-2xl space-y-6">
            <div><h2 className="text-lg font-bold text-gray-900">Notification Settings</h2><p className="text-sm text-gray-500">Configure when and how you receive alerts</p></div>
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
                    {hasDays && notificationSettings[key as keyof typeof notificationSettings] && daysKey && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">Notify</span>
                        <input type="number" className="w-16 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={notificationSettings[daysKey as keyof typeof notificationSettings] as number}
                          onChange={(e) => updateNotificationSettings({ [daysKey]: parseInt(e.target.value) })}
                        />
                        <span className="text-xs text-gray-500">days before</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => updateNotificationSettings({ [key]: !notificationSettings[key as keyof typeof notificationSettings] })}
                    className={clsx('relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5', notificationSettings[key as keyof typeof notificationSettings] ? 'bg-blue-600' : 'bg-gray-200')}
                  >
                    <span className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', notificationSettings[key as keyof typeof notificationSettings] ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end"><button className="btn-primary" onClick={handleSaveNotifications}>Save Preferences</button></div>
          </div>
        )}

        {/* ── Appearance ── */}
        {activeSection === 'appearance' && (
          <div className="max-w-2xl space-y-6">
            <div><h2 className="text-lg font-bold text-gray-900">Appearance</h2><p className="text-sm text-gray-500">Customize the look and feel of your workspace</p></div>
            <div className="card p-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'light' as const, label: 'Light', icon: Sun, desc: 'Clean light interface' },
                    { value: 'dark' as const, label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
                    { value: 'system' as const, label: 'System', icon: Laptop, desc: 'Follow OS setting' },
                  ]).map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      onClick={() => { setTheme(value); addToast({ type: 'success', message: `Theme set to ${label}` }); }}
                      className={clsx(
                        'p-4 rounded-xl border-2 transition-all text-left',
                        theme === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Icon size={20} className={theme === value ? 'text-blue-600' : 'text-gray-500'} />
                      <p className="text-sm font-medium text-gray-900 mt-2">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Keyboard Shortcuts</h3>
                <div className="space-y-2">
                  {[
                    { keys: navigator.platform.includes('Mac') ? '\u2318 + K' : 'Ctrl + K', action: 'Open global search' },
                    { keys: 'Escape', action: 'Close modals and dropdowns' },
                  ].map(({ keys, action }) => (
                    <div key={keys} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{action}</span>
                      <kbd className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded px-2 py-1 font-mono">{keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Asset Statuses ── */}
        {activeSection === 'statuses' && (
          <div className="max-w-2xl space-y-6">
            <div><h2 className="text-lg font-bold text-gray-900">Asset Statuses</h2><p className="text-sm text-gray-500">Customize the lifecycle stages for your assets</p></div>
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
                  <div className="flex-1"><p className="text-sm font-medium text-gray-900">{status.name}</p><p className="text-xs text-gray-500">{status.description}</p></div>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Default</span>
                </div>
              ))}
              <div className="flex items-center gap-2 p-3 border border-dashed border-gray-200 rounded-lg text-gray-400 cursor-pointer hover:border-blue-300" onClick={() => addToast({ type: 'info', message: 'Custom status creation coming soon' })}>
                <Plus size={14} /><span className="text-sm">Add custom status</span>
              </div>
            </div>
          </div>
        )}

        {/* ── API Access ── */}
        {activeSection === 'api' && (
          <div className="max-w-2xl space-y-6">
            <div><h2 className="text-lg font-bold text-gray-900">API Access</h2><p className="text-sm text-gray-500">Manage API keys and webhook endpoints</p></div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">API Keys</h3>
                <button className="btn-secondary" onClick={generateApiKey}><Plus size={14} /> Generate Key</button>
              </div>
              {apiKey ? (
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <Key size={15} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Production Key</p>
                    <p className="font-mono text-xs text-gray-500 truncate">
                      {apiKeyVisible ? apiKey : `blimp_sk_live_${'•'.repeat(32)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setApiKeyVisible((v) => !v)} aria-label={apiKeyVisible ? 'Hide API key' : 'Show API key'} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs">
                      {apiKeyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => { void navigator.clipboard.writeText(apiKey); addToast({ type: 'success', message: 'API key copied to clipboard' }); }} aria-label="Copy API key" className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"><Copy size={12} /></button>
                    <button onClick={generateApiKey} aria-label="Rotate API key" className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"><RefreshCw size={12} /></button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <Key size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No API key generated yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Click <strong>Generate Key</strong> to create your first key</p>
                </div>
              )}
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Webhooks</h3>
                <button className="btn-secondary" onClick={() => addToast({ type: 'info', message: 'Webhook configuration coming soon' })}><Plus size={14} /> Add Webhook</button>
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <Key size={28} className="text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">No webhooks configured</p><p className="text-xs text-gray-400 mt-0.5">Receive real-time events when data changes</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Billing ── */}
        {activeSection === 'billing' && (
          <div className="max-w-2xl space-y-6">
            <div><h2 className="text-lg font-bold text-gray-900">Billing</h2><p className="text-sm text-gray-500">Manage your subscription and invoices</p></div>
            <div className="card p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium opacity-80">Current Plan</p><p className="text-2xl font-bold mt-1">Business</p><p className="text-sm opacity-70 mt-0.5">Up to 500 assets · 50 users · All integrations</p></div>
                <div className="text-right"><p className="text-sm opacity-80">Monthly</p><p className="text-3xl font-bold mt-0.5">$299</p><p className="text-xs opacity-70">per month</p></div>
              </div>
              <div className="mt-4 flex items-center gap-3"><button className="px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">Upgrade to Enterprise</button></div>
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
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{label}</span><span className="text-gray-900 font-medium">{used} / {limit}</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2"><div className={clsx('h-2 rounded-full', (used / limit) > 0.8 ? 'bg-red-400' : 'bg-blue-400')} style={{ width: `${(used / limit) * 100}%` }} /></div>
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
                    <div><p className="text-sm font-medium text-gray-900">{format(new Date(inv.date), 'MMMM yyyy')}</p><p className="text-xs text-gray-500">Business Plan</p></div>
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

      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite Team Member" size="sm" footer={<><button className="btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button><button className="btn-primary" onClick={handleInvite}>Send Invite</button></>}>
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-gray-700 mb-1 block">Email Address</label><input type="email" className="input" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
          <div><label className="text-xs font-medium text-gray-700 mb-1 block">Role</label><select className="select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}>{ROLES.map(r => <option key={r}>{r}</option>)}</select><p className="text-xs text-gray-400 mt-1">{ROLE_DESCRIPTIONS[inviteRole]}</p></div>
        </div>
      </Modal>

      {/* Custom Field Modal */}
      <Modal
        open={showFieldModal}
        onClose={() => setShowFieldModal(false)}
        title={editingField ? 'Edit Custom Field' : 'Add Custom Field'}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowFieldModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveField}>{editingField ? 'Save Changes' : 'Create Field'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Field Name</label>
            <input className="input" placeholder="e.g. Asset Color" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Type</label>
            <select className="select" value={fieldType} onChange={(e) => setFieldType(e.target.value as CustomField['type'])}>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Select (dropdown)</option>
              <option value="boolean">Yes / No</option>
            </select>
          </div>
          {fieldType === 'select' && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Options (comma-separated)</label>
              <input className="input" placeholder="Option 1, Option 2, Option 3" value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Module</label>
            <select className="select" value={fieldModule} onChange={(e) => setFieldModule(e.target.value as CustomField['module'])}>
              <option value="asset">Assets</option>
              <option value="app">Apps</option>
              <option value="person">People</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fieldRequired} onChange={(e) => setFieldRequired(e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Required field</span>
          </label>
        </div>
      </Modal>

      {/* Delete Custom Field Confirm */}
      <ConfirmDialog
        open={!!deleteFieldId}
        onClose={() => setDeleteFieldId(null)}
        onConfirm={() => {
          if (deleteFieldId) {
            deleteCustomField(deleteFieldId);
            addToast({ type: 'success', message: 'Custom field deleted' });
            setDeleteFieldId(null);
          }
        }}
        title="Delete Custom Field"
        message="Are you sure you want to delete this custom field? Any data stored in this field will be lost."
        confirmLabel="Delete Field"
      />
    </div>
  );
}
