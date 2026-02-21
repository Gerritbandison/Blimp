import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plug, CheckCircle, AlertTriangle, RefreshCw, Settings, Clock, Zap, X, ChevronRight,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { IntuneModal } from '../components/integrations/IntuneModal';
import { NinjaOneModal } from '../components/integrations/NinjaOneModal';
import { BlimpAgentModal } from '../components/integrations/BlimpAgentModal';
import { IntegrationSettingsModal } from '../components/integrations/IntegrationSettingsModal';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import type { Integration, AgentReport, SyncResult } from '../types';
import { syncIntuneDevices } from '../utils/intune';
import { syncNinjaOneDevices } from '../utils/ninjaone';
import { buildAssetsFromReport } from '../utils/agentImport';
import type { IntuneConfig } from '../utils/intune';
import type { NinjaOneConfig } from '../utils/ninjaone';

const CATEGORIES = ['All', 'Core', 'MDM/RMM', 'SSO/IAM', 'HR', 'Ticketing', 'Accounting'];

const CATEGORY_COLORS: Record<string, string> = {
  'Core': 'bg-blue-100 text-blue-700',
  'MDM/RMM': 'bg-green-100 text-green-700',
  'SSO/IAM': 'bg-purple-100 text-purple-700',
  'HR': 'bg-pink-100 text-pink-700',
  'Ticketing': 'bg-orange-100 text-orange-700',
  'Accounting': 'bg-yellow-100 text-yellow-700',
};

// Legacy sync payloads for integrations without a dedicated utility
const LEGACY_SYNC_DATA: Record<string, {
  assets?: { name: string; type: string; serial: string; make: string; model: string }[];
  people?: { name: string; email: string; department: string; title: string }[];
  apps?: { name: string; vendor: string; licenses: number }[];
}> = {
  Okta: {
    apps: [
      { name: 'Salesforce (via Okta)', vendor: 'Salesforce', licenses: 25 },
      { name: 'Workday (via Okta)', vendor: 'Workday', licenses: 50 },
    ],
  },
  BambooHR: {
    people: [
      { name: 'Sarah Chen', email: 'sarah.chen@company.com', department: 'Engineering', title: 'Senior Developer' },
      { name: 'Michael Torres', email: 'michael.torres@company.com', department: 'Marketing', title: 'Marketing Manager' },
    ],
  },
  'Jamf Pro': {
    assets: [
      { name: 'MacBook Pro 16" (Jamf)', type: 'Laptop', serial: 'JAMF-MBP-001', make: 'Apple', model: 'MacBook Pro 16"' },
      { name: 'MacBook Air M2 (Jamf)', type: 'Laptop', serial: 'JAMF-MBA-002', make: 'Apple', model: 'MacBook Air M2' },
    ],
  },
};

// ─── Sync result panel ────────────────────────────────────────────────────────

function SyncResultPanel({
  result,
  integrationName,
  onClose,
  onViewAssets,
}: {
  result: SyncResult;
  integrationName: string;
  onClose: () => void;
  onViewAssets: () => void;
}) {
  const totalAdded = result.assetsAdded + result.peopleAdded + result.appsAdded;
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm font-semibold text-green-800">{integrationName} Synced</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Assets added', value: result.assetsAdded, color: 'text-green-600' },
            { label: 'Updated', value: result.assetsUpdated, color: 'text-blue-600' },
            { label: 'People added', value: result.peopleAdded, color: 'text-purple-600' },
            { label: 'Apps added', value: result.appsAdded, color: 'text-orange-600' },
            { label: 'Duplicates skipped', value: result.skipped, color: 'text-gray-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-2 bg-gray-50 rounded-lg">
              <p className={clsx('text-lg font-bold', color)}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
        {result.errors.length > 0 && (
          <div className="p-2 bg-red-50 rounded-lg text-xs text-red-700 space-y-0.5">
            {result.errors.map((e, i) => (
              <p key={i} className="flex items-center gap-1">
                <AlertTriangle size={10} /> {e}
              </p>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{format(new Date(result.at), 'MMM d, h:mm a')}</p>
          {totalAdded > 0 && (
            <button
              onClick={() => { onViewAssets(); onClose(); }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
            >
              View records <ChevronRight size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Generic connect modal ────────────────────────────────────────────────────

function GenericConnectModal({
  open,
  integration,
  onClose,
  onConnected,
}: {
  open: boolean;
  integration: Integration | null;
  onClose: () => void;
  onConnected: (syncFrequency: string) => void;
}) {
  const [step, setStep] = useState<'config' | 'validate' | 'done'>('config');
  const [apiKey, setApiKey] = useState('');
  const [syncFreq, setSyncFreq] = useState('Every 4 hours');

  function handleValidate() {
    setStep('validate');
    setTimeout(() => setStep('done'), 1500);
  }

  function handleDone() {
    onConnected(syncFreq);
    onClose();
    setTimeout(() => { setStep('config'); setApiKey(''); setSyncFreq('Every 4 hours'); }, 300);
  }

  function handleClose() {
    onClose();
    setTimeout(() => { setStep('config'); setApiKey(''); setSyncFreq('Every 4 hours'); }, 300);
  }

  const footer = step === 'done' ? (
    <button className="btn-primary" onClick={handleDone}>Done</button>
  ) : step === 'validate' ? (
    <span className="text-sm text-gray-500 flex items-center gap-2">
      <RefreshCw size={14} className="animate-spin" /> Validating credentials…
    </span>
  ) : (
    <>
      <button className="btn-secondary" onClick={handleClose}>Cancel</button>
      <button className="btn-primary" onClick={handleValidate} disabled={!apiKey}>
        Validate & Connect
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={handleClose} title={`Connect ${integration?.name}`} size="md" footer={footer}>
      {step === 'config' && integration && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {integration.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
              <p className="text-xs text-gray-500">{integration.description}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">API Key / Token</label>
            <input
              type="password"
              className="input"
              placeholder="Paste your API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Find this in your {integration.name} settings under API / Integrations
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Sync Frequency</label>
            <select
              className="select"
              value={syncFreq}
              onChange={(e) => setSyncFreq(e.target.value)}
            >
              <option>Every hour</option>
              <option>Every 4 hours</option>
              <option>Daily</option>
              <option>Real-time (webhooks)</option>
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Features to enable</p>
            <div className="space-y-2">
              {integration.features.map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-gray-700">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
      {step === 'validate' && (
        <div className="flex flex-col items-center py-8">
          <RefreshCw size={36} className="text-blue-500 animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-900">Validating your credentials…</p>
          <p className="text-xs text-gray-500 mt-1">Testing connection to {integration?.name}</p>
        </div>
      )}
      {step === 'done' && (
        <div className="flex flex-col items-center py-8">
          <CheckCircle size={48} className="text-green-500 mb-4" />
          <p className="text-sm font-semibold text-gray-900">{integration?.name} connected!</p>
          <p className="text-xs text-gray-500 mt-1">Initial sync will begin shortly</p>
        </div>
      )}
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Integrations() {
  const {
    integrations,
    assets,
    addToast,
    addAsset,
    addApp,
    addPerson,
    updateIntegration,
    addActivity,
  } = useStore();

  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState('All');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncResultName, setSyncResultName] = useState('');

  const [showIntune, setShowIntune] = useState(false);
  const [showNinja, setShowNinja] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [showGeneric, setShowGeneric] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [settingsIntegration, setSettingsIntegration] = useState<Integration | null>(null);

  const filtered = integrations.filter(
    (i) => activeCategory === 'All' || i.category === activeCategory
  );
  const connected = integrations.filter((i) => i.status === 'Connected');
  const errors = integrations.filter((i) => i.status === 'Error');
  const agentIntegration = integrations.find((i) => i.name === 'Blimp Agent');
  const intuneIntegration = integrations.find((i) => i.name === 'Microsoft Intune');
  const ninjaIntegration = integrations.find((i) => i.name === 'NinjaOne');

  function handleConnect(integration: Integration) {
    setSelectedIntegration(integration);
    if (integration.name === 'Microsoft Intune') setShowIntune(true);
    else if (integration.name === 'NinjaOne') setShowNinja(true);
    else if (integration.name === 'Blimp Agent') setShowAgent(true);
    else setShowGeneric(true);
  }

  function handleSettings(integration: Integration) {
    setSettingsIntegration(integration);
    setShowSettings(true);
  }

  function handleDisconnect(integration: Integration) {
    updateIntegration(integration.id, {
      status: 'Disconnected',
      config: undefined,
      connectedAt: undefined,
      lastSyncResult: undefined,
    });
    addActivity({
      action: 'Integration Disconnected',
      user: 'Current User',
      details: `${integration.name} disconnected and credentials removed`,
      module: 'Integrations',
      entityId: integration.id,
      entityName: integration.name,
    });
    addToast({ type: 'info', message: `${integration.name} disconnected` });
  }

  function handleIntuneConnected(config: IntuneConfig) {
    if (!intuneIntegration) return;
    updateIntegration(intuneIntegration.id, {
      status: 'Connected',
      lastSync: new Date().toISOString(),
      connectedAt: new Date().toISOString().split('T')[0],
      syncFrequency: config.syncFrequency,
      config: {
        tenantId: config.tenantId,
        clientId: config.clientId,
        clientSecret: '***',
        syncFrequency: config.syncFrequency,
        enabledFeatures: config.enabledFeatures,
      },
    });
    addToast({ type: 'success', message: 'Microsoft Intune connected — starting initial sync…' });
    setTimeout(() => handleSync({ ...intuneIntegration, status: 'Connected' }), 600);
  }

  function handleNinjaConnected(config: NinjaOneConfig) {
    if (!ninjaIntegration) return;
    updateIntegration(ninjaIntegration.id, {
      status: 'Connected',
      lastSync: new Date().toISOString(),
      connectedAt: new Date().toISOString().split('T')[0],
      syncFrequency: config.syncFrequency,
      config: {
        instanceUrl: config.instanceUrl,
        clientId: config.clientId,
        clientSecret: '***',
        syncFrequency: config.syncFrequency,
        enabledFeatures: config.enabledFeatures,
      },
    });
    addToast({ type: 'success', message: 'NinjaOne connected — starting initial sync…' });
    setTimeout(() => handleSync({ ...ninjaIntegration, status: 'Connected' }), 600);
  }

  function handleGenericConnected(syncFrequency: string) {
    if (!selectedIntegration) return;
    updateIntegration(selectedIntegration.id, {
      status: 'Connected',
      lastSync: new Date().toISOString(),
      connectedAt: new Date().toISOString().split('T')[0],
      syncFrequency,
    });
    addToast({ type: 'success', message: `${selectedIntegration.name} connected!` });
  }

  function handleAgentImport(report: AgentReport) {
    if (!agentIntegration) return;
    const preview = buildAssetsFromReport(report, agentIntegration.id);
    const existingIds = new Set(assets.map((a) => a.id));

    let added = 0;
    let skipped = 0;
    [preview.deviceAsset, ...preview.monitorAssets].forEach((a) => {
      if (existingIds.has(a.id)) { skipped++; return; }
      addAsset(a);
      added++;
    });

    const result: SyncResult = {
      at: new Date().toISOString(),
      assetsAdded: added,
      assetsUpdated: 0,
      peopleAdded: 0,
      appsAdded: 0,
      skipped,
      errors: [],
    };

    updateIntegration(agentIntegration.id, {
      status: 'Connected',
      lastSync: new Date().toISOString(),
      syncCount: (agentIntegration.syncCount || 0) + added,
      lastSyncResult: result,
      connectedAt: agentIntegration.connectedAt || new Date().toISOString().split('T')[0],
    });

    addActivity({
      action: 'Agent Report Imported',
      user: 'System',
      details: `Blimp Agent — ${report.hardware.make} ${report.hardware.model} (${report.hardware.serial}) — ${added} asset(s) imported`,
      module: 'Integrations',
      entityId: agentIntegration.id,
      entityName: 'Blimp Agent',
    });

    setSyncResult(result);
    setSyncResultName('Blimp Agent');
    addToast({ type: 'success', message: `Agent report imported — ${added} asset(s) added` });
  }

  async function handleSync(integration: Integration) {
    if (syncing) return;
    setSyncing(integration.id);
    addToast({ type: 'info', message: `Syncing ${integration.name}…` });

    try {
      let assetsAdded = 0;
      let assetsUpdated = 0;
      let peopleAdded = 0;
      let appsAdded = 0;
      let skipped = 0;
      const errors: string[] = [];
      const existingIds = new Set(assets.map((a) => a.id));

      if (integration.name === 'Microsoft Intune') {
        const synced = await syncIntuneDevices(integration.id);
        synced.forEach((a) => {
          if (existingIds.has(a.id)) { skipped++; return; }
          addAsset(a);
          assetsAdded++;
        });
      } else if (integration.name === 'NinjaOne') {
        const synced = await syncNinjaOneDevices(integration.id);
        synced.forEach((a) => {
          if (existingIds.has(a.id)) { skipped++; return; }
          addAsset(a);
          assetsAdded++;
        });
      } else {
        const syncData = LEGACY_SYNC_DATA[integration.name];
        if (syncData?.assets) {
          syncData.assets.forEach((a) => {
            const id = `sync-${integration.id}-${a.serial}`;
            if (existingIds.has(id)) { skipped++; return; }
            addAsset({
              id,
              name: a.name,
              tag: `SYNC-${a.serial}`,
              serial: a.serial,
              type: a.type as import('../types').AssetType,
              make: a.make,
              model: a.model,
              status: 'Deployed',
              location: 'Auto-synced',
              purchaseDate: new Date().toISOString().split('T')[0],
              warrantyExpiry: new Date(Date.now() + 3 * 365 * 86400000).toISOString().split('T')[0],
              cost: 0,
              currency: 'USD',
              detectionSource: integration.name,
            });
            assetsAdded++;
          });
        }
        if (syncData?.apps) {
          syncData.apps.forEach((a) => {
            addApp({
              id: `sync-${integration.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
            appsAdded++;
          });
        }
        if (syncData?.people) {
          syncData.people.forEach((p) => {
            addPerson({
              id: `sync-${integration.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
            peopleAdded++;
          });
        }
      }

      const totalAdded = assetsAdded + appsAdded + peopleAdded;
      const result: SyncResult = {
        at: new Date().toISOString(),
        assetsAdded,
        assetsUpdated,
        peopleAdded,
        appsAdded,
        skipped,
        errors,
      };

      updateIntegration(integration.id, {
        lastSync: new Date().toISOString(),
        syncCount: (integration.syncCount || 0) + totalAdded,
        lastSyncResult: result,
      });

      addActivity({
        action: 'Integration Synced',
        user: 'System',
        details: `${integration.name} — ${totalAdded} record(s) added, ${skipped} skipped`,
        module: 'Integrations',
        entityId: integration.id,
        entityName: integration.name,
      });

      setSyncResult(result);
      setSyncResultName(integration.name);

      if (totalAdded > 0) {
        addToast({ type: 'success', message: `${integration.name} synced — ${totalAdded} records imported` });
      } else {
        addToast({ type: 'success', message: `${integration.name} sync complete (no new records)` });
      }
    } catch {
      addToast({ type: 'error', message: `${integration.name} sync failed` });
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {connected.length} connected · {integrations.length - connected.length} available
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2 text-sm"
          onClick={() => setShowAgent(true)}
        >
          <Plug size={14} />
          Import Agent Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Connected', value: connected.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Records Synced', value: integrations.reduce((s, i) => s + (i.syncCount || 0), 0).toLocaleString(), icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Errors', value: errors.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Available', value: integrations.filter((i) => i.status === 'Disconnected').length, icon: Plug, color: 'text-gray-600', bg: 'bg-gray-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5 flex items-start gap-3">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-800">
              {errors.length} integration {errors.length === 1 ? 'error' : 'errors'} need attention
            </p>
          </div>
          {errors.map((e) => (
            <div key={e.id} className="flex items-center justify-between pl-5">
              <div>
                <span className="text-sm font-medium text-red-700">{e.name}</span>
                {e.errorMessage && (
                  <span className="text-xs text-red-500 ml-2">— {e.errorMessage}</span>
                )}
              </div>
              <button
                onClick={() => handleConnect(e)}
                className="text-xs font-semibold text-red-700 border border-red-300 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                <Zap size={11} /> Reconnect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeCategory === cat
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => {
          const isConnected = integration.status === 'Connected';
          const isError = integration.status === 'Error';
          const isSyncing = syncing === integration.id;
          const isAgent = integration.name === 'Blimp Agent';
          const isIntune = integration.name === 'Microsoft Intune';
          const isNinja = integration.name === 'NinjaOne';
          const hasRealSync = isIntune || isNinja;

          let accentClass = 'bg-gradient-to-br from-blue-500 to-indigo-600';
          if (isNinja) accentClass = 'bg-gradient-to-br from-orange-500 to-red-600';
          if (isAgent) accentClass = 'bg-gradient-to-br from-teal-500 to-cyan-600';

          return (
            <div
              key={integration.id}
              className={clsx(
                'card p-5 flex flex-col gap-4 transition-shadow hover:shadow-md',
                isError && 'border-red-200'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                      isConnected ? accentClass : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {integration.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span
                        className={clsx(
                          'text-xs px-1.5 py-0.5 rounded font-medium',
                          CATEGORY_COLORS[integration.category] || 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {integration.category}
                      </span>
                      {isConnected && hasRealSync && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">
                          Live Sync
                        </span>
                      )}
                      {isConnected && isAgent && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-teal-100 text-teal-700">
                          EDID
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <StatusBadge status={integration.status} />
              </div>

              <p className="text-xs text-gray-500">{integration.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {integration.features.slice(0, 3).map((f) => (
                  <span key={f} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {f}
                  </span>
                ))}
                {integration.features.length > 3 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                    +{integration.features.length - 3} more
                  </span>
                )}
              </div>

              {isConnected && integration.lastSync && (
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {format(new Date(integration.lastSync), 'MMM d, h:mm a')}
                    </span>
                    {integration.syncFrequency && <span>{integration.syncFrequency}</span>}
                    {integration.syncCount != null && (
                      <span>{integration.syncCount.toLocaleString()} records</span>
                    )}
                  </div>
                  {/* Credential summary */}
                  {isIntune && integration.config?.tenantId && (
                    <p className="text-xs text-gray-400 font-mono">
                      Tenant: {integration.config.tenantId.substring(0, 8)}…
                    </p>
                  )}
                  {isNinja && integration.config?.instanceUrl && (
                    <p className="text-xs text-gray-400 font-mono">
                      {integration.config.instanceUrl}
                    </p>
                  )}
                  {/* Last sync summary */}
                  {integration.lastSyncResult && (
                    <div className="flex items-center gap-3 text-xs">
                      {integration.lastSyncResult.assetsAdded > 0 && (
                        <span className="text-green-600">+{integration.lastSyncResult.assetsAdded} assets</span>
                      )}
                      {integration.lastSyncResult.appsAdded > 0 && (
                        <span className="text-orange-600">+{integration.lastSyncResult.appsAdded} apps</span>
                      )}
                      {integration.lastSyncResult.peopleAdded > 0 && (
                        <span className="text-purple-600">+{integration.lastSyncResult.peopleAdded} people</span>
                      )}
                      {integration.lastSyncResult.skipped > 0 && (
                        <span className="text-gray-400">{integration.lastSyncResult.skipped} skipped</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isError && integration.errorMessage && (
                <div className="bg-red-50 rounded-lg p-2 text-xs text-red-700">
                  {integration.errorMessage}
                </div>
              )}

              <div className="flex items-center gap-2 mt-auto">
                {isConnected ? (
                  <>
                    {isAgent ? (
                      <button
                        onClick={() => setShowAgent(true)}
                        className="btn-secondary flex-1 justify-center text-xs py-1.5"
                      >
                        <Plug size={12} /> Import Report
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSync(integration)}
                        disabled={!!isSyncing}
                        className={clsx(
                          'btn-secondary flex-1 justify-center text-xs py-1.5',
                          isSyncing && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing…' : 'Sync Now'}
                      </button>
                    )}
                    <button
                      onClick={() => handleSettings(integration)}
                      title="Integration settings"
                      className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Settings size={14} />
                    </button>
                  </>
                ) : isError ? (
                  <button onClick={() => handleConnect(integration)} className="btn-primary flex-1 justify-center text-xs py-1.5">
                    <Zap size={12} /> Reconnect
                  </button>
                ) : (
                  <button onClick={() => handleConnect(integration)} className="btn-primary flex-1 justify-center text-xs py-1.5">
                    <Plug size={12} />
                    {isAgent ? 'Set Up Agent' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <IntuneModal
        open={showIntune}
        onClose={() => setShowIntune(false)}
        onConnected={handleIntuneConnected}
      />

      <NinjaOneModal
        open={showNinja}
        onClose={() => setShowNinja(false)}
        onConnected={handleNinjaConnected}
      />

      <BlimpAgentModal
        open={showAgent}
        integrationId={agentIntegration?.id ?? 'int-agent'}
        onClose={() => setShowAgent(false)}
        onImport={handleAgentImport}
      />

      <GenericConnectModal
        open={showGeneric}
        integration={selectedIntegration}
        onClose={() => setShowGeneric(false)}
        onConnected={handleGenericConnected}
      />

      {settingsIntegration && (
        <IntegrationSettingsModal
          open={showSettings}
          integration={settingsIntegration}
          onClose={() => { setShowSettings(false); setSettingsIntegration(null); }}
          onSyncNow={() => handleSync(settingsIntegration)}
          onDisconnect={() => handleDisconnect(settingsIntegration)}
          onViewAssets={() => navigate('/assets')}
        />
      )}

      {syncResult && (
        <SyncResultPanel
          result={syncResult}
          integrationName={syncResultName}
          onClose={() => setSyncResult(null)}
          onViewAssets={() => {
            setSyncResult(null);
            // Navigate based on what was synced
            navigate('/assets');
          }}
        />
      )}
    </div>
  );
}
