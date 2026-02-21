import { useState } from 'react';
import {
  RefreshCw, AlertTriangle, CheckCircle, Clock, Key,
  ToggleRight, Calendar, ChevronRight,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import type { Integration } from '../../types';

const CATEGORY_COLORS: Record<string, string> = {
  'Core': 'bg-blue-100 text-blue-700',
  'MDM/RMM': 'bg-green-100 text-green-700',
  'SSO/IAM': 'bg-purple-100 text-purple-700',
  'HR': 'bg-pink-100 text-pink-700',
  'Ticketing': 'bg-orange-100 text-orange-700',
  'Accounting': 'bg-yellow-100 text-yellow-700',
};

function mask(value: string, keepChars = 8): string {
  if (!value || value === '***') return '••••••••••••';
  return value.substring(0, keepChars) + '…';
}

interface Props {
  open: boolean;
  integration: Integration;
  onClose: () => void;
  onSyncNow: () => void;
  onDisconnect: () => void;
  onViewAssets: () => void;
}

export function IntegrationSettingsModal({
  open,
  integration,
  onClose,
  onSyncNow,
  onDisconnect,
  onViewAssets,
}: Props) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const isIntune = integration.name === 'Microsoft Intune';
  const isNinja = integration.name === 'NinjaOne';
  const isAgent = integration.name === 'Blimp Agent';
  const cfg = integration.config;
  const result = integration.lastSyncResult;

  function handleClose() {
    onClose();
    setConfirmDisconnect(false);
  }

  const footer = confirmDisconnect ? (
    <div className="flex items-center gap-3 w-full">
      <div className="flex items-center gap-2 text-xs text-red-700 flex-1">
        <AlertTriangle size={13} />
        <span>This will remove saved credentials and stop auto-sync.</span>
      </div>
      <button className="btn-secondary" onClick={() => setConfirmDisconnect(false)}>
        Cancel
      </button>
      <button
        className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        onClick={() => { onDisconnect(); handleClose(); }}
      >
        Yes, Disconnect
      </button>
    </div>
  ) : (
    <>
      <button
        className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        onClick={() => setConfirmDisconnect(true)}
      >
        Disconnect
      </button>
      <div className="flex-1" />
      {!isAgent && (
        <button
          className="btn-secondary text-xs py-1.5"
          onClick={() => { onSyncNow(); handleClose(); }}
        >
          <RefreshCw size={12} /> Sync Now
        </button>
      )}
      <button className="btn-primary text-xs py-1.5" onClick={handleClose}>
        Done
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${integration.name} — Settings`}
      size="lg"
      footer={footer}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
              isIntune
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                : isNinja
                ? 'bg-gradient-to-br from-orange-500 to-red-600'
                : isAgent
                ? 'bg-gradient-to-br from-teal-500 to-cyan-600'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            )}
          >
            {integration.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={clsx(
                  'text-xs px-1.5 py-0.5 rounded font-medium',
                  CATEGORY_COLORS[integration.category] || 'bg-gray-100 text-gray-600'
                )}
              >
                {integration.category}
              </span>
              <span className="flex items-center gap-0.5 text-xs text-green-600">
                <CheckCircle size={11} /> Connected
              </span>
            </div>
          </div>
        </div>

        {/* Connection summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: Calendar,
              label: 'Connected',
              value: integration.connectedAt
                ? format(parseISO(integration.connectedAt), 'MMM d, yyyy')
                : 'Unknown',
            },
            {
              icon: Clock,
              label: 'Last Sync',
              value: integration.lastSync
                ? format(parseISO(integration.lastSync), 'MMM d, h:mm a')
                : 'Never',
            },
            {
              icon: RefreshCw,
              label: 'Records Synced',
              value: (integration.syncCount ?? 0).toLocaleString(),
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <Icon size={14} className="text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Credentials */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Key size={12} className="text-gray-400" /> Credentials
          </p>
          <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {isIntune && cfg && (
              <>
                <CredRow label="Tenant ID" value={mask(cfg.tenantId || '', 8)} mono />
                <CredRow label="Client ID" value={mask(cfg.clientId || '', 8)} mono />
                <CredRow label="Client Secret" value="••••••••••••••••" mono />
                <CredRow
                  label="Scopes"
                  value="DeviceManagementManagedDevices.Read.All · DeviceManagementConfiguration.Read.All"
                />
              </>
            )}
            {isNinja && cfg && (
              <>
                <CredRow label="Instance" value={cfg.instanceUrl || 'app.ninjarmm.com'} mono />
                <CredRow label="Client ID" value={mask(cfg.clientId || '', 8)} mono />
                <CredRow label="Client Secret" value="••••••••••••••••" mono />
              </>
            )}
            {isAgent && (
              <>
                <CredRow label="Agent Port" value="51723" mono />
                <CredRow label="Auth" value="Local — no credentials required" />
                <CredRow label="Import method" value="JSON file upload or auto-discover" />
              </>
            )}
            {!isIntune && !isNinja && !isAgent && (
              <CredRow label="API Key" value="••••••••••••••••" mono />
            )}
          </div>
        </div>

        {/* Sync frequency */}
        {!isAgent && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2">
              <RefreshCw size={13} className="text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-700">Sync Frequency</p>
                <p className="text-xs text-gray-400">How often Blimp pulls from {integration.name}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
              {integration.syncFrequency || 'Daily'}
            </span>
          </div>
        )}

        {/* Features */}
        {(cfg?.enabledFeatures?.length || integration.features.length > 0) && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <ToggleRight size={12} className="text-gray-400" /> Active Features
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(cfg?.enabledFeatures || integration.features).map((f) => (
                <span
                  key={f}
                  className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full flex items-center gap-1"
                >
                  <CheckCircle size={9} /> {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Last sync result */}
        {result && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-700">Last Sync Results</p>
              <span className="text-xs text-gray-400">{format(parseISO(result.at), 'MMM d, h:mm a')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Assets added', v: result.assetsAdded, color: 'text-green-600' },
                { label: 'Updated', v: result.assetsUpdated, color: 'text-blue-600' },
                { label: 'Skipped', v: result.skipped, color: 'text-gray-500' },
                { label: 'People added', v: result.peopleAdded, color: 'text-purple-600' },
                { label: 'Apps added', v: result.appsAdded, color: 'text-orange-600' },
              ].map(({ label, v, color }) => (
                <div key={label} className="text-center">
                  <p className={clsx('text-lg font-bold', color)}>{v}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            {result.assetsAdded > 0 && (
              <button
                onClick={() => { onViewAssets(); handleClose(); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-2 bg-white border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
              >
                View synced assets in Asset Register <ChevronRight size={12} />
              </button>
            )}
            {result.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-700 space-y-0.5">
                {result.errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function CredRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-white">
      <span className="text-xs text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className={clsx('text-xs text-gray-800 truncate', mono && 'font-mono')}>{value}</span>
    </div>
  );
}
