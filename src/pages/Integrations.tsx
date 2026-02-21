import { useState } from 'react';
import { Plug, CheckCircle, AlertTriangle, RefreshCw, Settings, Clock, Zap } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import { format } from 'date-fns';

const CATEGORIES = ['All', 'Core', 'MDM/RMM', 'SSO/IAM', 'HR', 'Ticketing', 'Accounting'];

const CATEGORY_COLORS: Record<string, string> = {
  'Core': 'bg-blue-100 text-blue-700',
  'MDM/RMM': 'bg-green-100 text-green-700',
  'SSO/IAM': 'bg-purple-100 text-purple-700',
  'HR': 'bg-pink-100 text-pink-700',
  'Ticketing': 'bg-orange-100 text-orange-700',
  'Accounting': 'bg-yellow-100 text-yellow-700',
};

// Mock sync data for specific integrations
const SYNC_DATA: Record<string, { assets?: Array<{ name: string; type: string; serial: string; make: string; model: string }>; people?: Array<{ name: string; email: string; department: string; title: string }>; apps?: Array<{ name: string; vendor: string; licenses: number }> }> = {
  'Microsoft Intune': {
    assets: [
      { name: 'Surface Pro 9 (Intune)', type: 'Tablet', serial: 'SRF-INT-001', make: 'Microsoft', model: 'Surface Pro 9' },
      { name: 'Surface Laptop 5 (Intune)', type: 'Laptop', serial: 'SRF-INT-002', make: 'Microsoft', model: 'Surface Laptop 5' },
    ],
  },
  'Okta': {
    apps: [
      { name: 'Salesforce (via Okta)', vendor: 'Salesforce', licenses: 25 },
      { name: 'Workday (via Okta)', vendor: 'Workday', licenses: 50 },
    ],
  },
  'BambooHR': {
    people: [
      { name: 'Sarah Chen', email: 'sarah.chen@company.com', department: 'Engineering', title: 'Senior Developer' },
      { name: 'Michael Torres', email: 'michael.torres@company.com', department: 'Marketing', title: 'Marketing Manager' },
    ],
  },
};

export function Integrations() {
  const { integrations, addToast, addAsset, addApp, addPerson, updateIntegration, addActivity } = useStore();
  const [activeCategory, setActiveCategory] = useState('All');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<typeof integrations[0] | null>(null);
  const [connectStep, setConnectStep] = useState<'config' | 'validate' | 'done'>('config');
  const [apiKey, setApiKey] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);

  const filtered = integrations.filter((i) => activeCategory === 'All' || i.category === activeCategory);
  const connected = integrations.filter((i) => i.status === 'Connected');
  const errors = integrations.filter((i) => i.status === 'Error');

  function handleConnect(integration: typeof integrations[0]) {
    setSelectedIntegration(integration);
    setConnectStep('config');
    setApiKey('');
    setShowConnectModal(true);
  }

  function handleValidate() {
    setConnectStep('validate');
    setTimeout(() => {
      setConnectStep('done');
      if (selectedIntegration) {
        updateIntegration(selectedIntegration.id, {
          status: 'Connected',
          lastSync: new Date().toISOString(),
        });
      }
    }, 1500);
  }

  function handleSync(integration: typeof integrations[0]) {
    const syncData = SYNC_DATA[integration.name];
    setSyncing(integration.id);
    addToast({ type: 'info', message: `Syncing ${integration.name}...` });

    setTimeout(() => {
      let itemsAdded = 0;

      if (syncData?.assets) {
        syncData.assets.forEach((a) => {
          addAsset({
            id: `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: a.name,
            tag: `SYNC-${a.serial}`,
            serial: a.serial,
            type: a.type as import('../types').AssetType,
            make: a.make,
            model: a.model,
            status: 'Deployed',
            location: 'Auto-synced',
            purchaseDate: new Date().toISOString().split('T')[0],
            warrantyExpiry: new Date(Date.now() + 365 * 3 * 86400000).toISOString().split('T')[0],
            cost: 0,
            currency: 'USD',
            detectionSource: integration.name,
          });
          itemsAdded++;
        });
      }

      if (syncData?.apps) {
        syncData.apps.forEach((a) => {
          addApp({
            id: `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: a.name,
            vendor: a.vendor,
            category: 'Business',
            status: 'Active',
            licenseType: 'Per User',
            totalLicenses: a.licenses,
            assignedLicenses: Math.floor(a.licenses * 0.7),
            costPerLicense: 15,
            billingCycle: 'monthly',
            renewalDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
            noticePeriodDays: 30,
            currency: 'USD',
            detectionSource: integration.name,
          });
          itemsAdded++;
        });
      }

      if (syncData?.people) {
        syncData.people.forEach((p) => {
          addPerson({
            id: `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: p.name,
            email: p.email,
            department: p.department,
            title: p.title,
            status: 'Active',
            location: 'Auto-synced',
            startDate: new Date().toISOString().split('T')[0],
            assetsAssigned: 0,
            licensesAssigned: 0,
            totalItCost: 0,
          });
          itemsAdded++;
        });
      }

      updateIntegration(integration.id, {
        lastSync: new Date().toISOString(),
        syncCount: (integration.syncCount || 0) + itemsAdded,
      });

      addActivity({
        action: 'Integration Synced',
        user: 'System',
        details: `${integration.name} synced — ${itemsAdded} record${itemsAdded !== 1 ? 's' : ''} added`,
        module: 'Integrations',
        entityId: integration.id,
        entityName: integration.name,
      });

      setSyncing(null);

      if (itemsAdded > 0) {
        addToast({ type: 'success', message: `${integration.name} synced — ${itemsAdded} records imported` });
      } else {
        addToast({ type: 'success', message: `${integration.name} sync completed (no new records)` });
      }
    }, 2000);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{connected.length} connected · {integrations.length - connected.length} available</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Connected', value: connected.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Syncs', value: integrations.reduce((s, i) => s + (i.syncCount || 0), 0).toLocaleString(), icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Errors', value: errors.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Available', value: integrations.filter(i => i.status === 'Disconnected').length, icon: Plug, color: 'text-gray-600', bg: 'bg-gray-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5 flex items-start gap-3">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', bg)}><Icon size={18} className={color} /></div>
            <div><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Integration Errors</p>
            {errors.map((e) => (<p key={e.id} className="text-sm text-red-700 mt-0.5">{e.name}: {e.errorMessage}</p>))}
          </div>
          <button className="btn-secondary border-red-200 text-red-700 hover:bg-red-100">Fix Issues</button>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', activeCategory === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => {
          const isConnected = integration.status === 'Connected';
          const isError = integration.status === 'Error';
          const isSyncing = syncing === integration.id;
          const hasSyncData = !!SYNC_DATA[integration.name];
          return (
            <div key={integration.id} className={clsx('card p-5 flex flex-col gap-4 transition-shadow hover:shadow-md', isError && 'border-red-200')}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0', isConnected ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-200')}>
                    {integration.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', CATEGORY_COLORS[integration.category] || 'bg-gray-100 text-gray-600')}>{integration.category}</span>
                      {hasSyncData && isConnected && <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">Live Sync</span>}
                    </div>
                  </div>
                </div>
                <StatusBadge status={integration.status} />
              </div>

              <p className="text-xs text-gray-500">{integration.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {integration.features.slice(0, 3).map((f) => (
                  <span key={f} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{f}</span>
                ))}
                {integration.features.length > 3 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">+{integration.features.length - 3} more</span>
                )}
              </div>

              {isConnected && integration.lastSync && (
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={11} />{format(new Date(integration.lastSync), 'MMM d, h:mm a')}</span>
                  {integration.syncFrequency && <span>{integration.syncFrequency}</span>}
                  {integration.syncCount != null && <span>{integration.syncCount.toLocaleString()} records</span>}
                </div>
              )}

              {isError && integration.errorMessage && (
                <div className="bg-red-50 rounded-lg p-2 text-xs text-red-700">{integration.errorMessage}</div>
              )}

              <div className="flex items-center gap-2 mt-auto">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => handleSync(integration)}
                      disabled={isSyncing}
                      className={clsx('btn-secondary flex-1 justify-center text-xs py-1.5', isSyncing && 'opacity-60 cursor-not-allowed')}
                    >
                      <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"><Settings size={14} /></button>
                  </>
                ) : isError ? (
                  <button onClick={() => handleConnect(integration)} className="btn-primary flex-1 justify-center text-xs py-1.5"><Zap size={12} /> Reconnect</button>
                ) : (
                  <button onClick={() => handleConnect(integration)} className="btn-primary flex-1 justify-center text-xs py-1.5"><Plug size={12} /> Connect</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={showConnectModal} onClose={() => setShowConnectModal(false)} title={`Connect ${selectedIntegration?.name}`} size="md"
        footer={
          connectStep === 'done' ? (
            <button className="btn-primary" onClick={() => { setShowConnectModal(false); addToast({ type: 'success', message: `${selectedIntegration?.name} connected successfully!` }); }}>Done</button>
          ) : connectStep === 'validate' ? (
            <span className="text-sm text-gray-500 flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Validating credentials...</span>
          ) : (
            <><button className="btn-secondary" onClick={() => setShowConnectModal(false)}>Cancel</button><button className="btn-primary" onClick={handleValidate} disabled={!apiKey}>Validate & Connect</button></>
          )
        }
      >
        {connectStep === 'config' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">{selectedIntegration?.name.substring(0, 2).toUpperCase()}</div>
              <div><p className="text-sm font-semibold text-gray-900">{selectedIntegration?.name}</p><p className="text-xs text-gray-500">{selectedIntegration?.description}</p></div>
            </div>
            <div><label className="text-xs font-medium text-gray-700 mb-1 block">API Key / Token</label><input type="password" className="input" placeholder="Paste your API key here" value={apiKey} onChange={(e) => setApiKey(e.target.value)} /><p className="text-xs text-gray-400 mt-1">You can find this in your {selectedIntegration?.name} settings under API / Integrations</p></div>
            <div><label className="text-xs font-medium text-gray-700 mb-1 block">Sync Frequency</label><select className="select"><option>Every hour</option><option>Every 4 hours</option><option>Daily</option><option>Real-time (webhooks)</option></select></div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Features to enable</p>
              <div className="space-y-2">{selectedIntegration?.features.map((f) => (<label key={f} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /><span className="text-sm text-gray-700">{f}</span></label>))}</div>
            </div>
          </div>
        )}
        {connectStep === 'validate' && (
          <div className="flex flex-col items-center py-8">
            <RefreshCw size={36} className="text-blue-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-gray-900">Validating your credentials...</p>
            <p className="text-xs text-gray-500 mt-1">Testing connection to {selectedIntegration?.name}</p>
          </div>
        )}
        {connectStep === 'done' && (
          <div className="flex flex-col items-center py-8">
            <CheckCircle size={48} className="text-green-500 mb-4" />
            <p className="text-sm font-semibold text-gray-900">{selectedIntegration?.name} connected successfully!</p>
            <p className="text-xs text-gray-500 mt-1">Initial sync will begin shortly</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
