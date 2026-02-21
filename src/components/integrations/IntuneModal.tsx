import { useState } from 'react';
import { CheckCircle, RefreshCw, Info, Shield } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { IntuneConfig } from '../../utils/intune';
import { validateIntuneCredentials, INTUNE_FEATURES, INTUNE_REQUIRED_PERMISSIONS } from '../../utils/intune';

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected: (config: IntuneConfig) => void;
}

const STEPS = ['Configure', 'Validate', 'Done'] as const;
type Step = typeof STEPS[number];

export function IntuneModal({ open, onClose, onConnected }: Props) {
  const [step, setStep] = useState<Step>('Configure');
  const [error, setError] = useState('');
  const [config, setConfig] = useState<IntuneConfig>({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    syncFrequency: 'Every 4 hours',
    enabledFeatures: [...INTUNE_FEATURES],
  });

  function updateField(field: keyof IntuneConfig, value: string) {
    setConfig((c) => ({ ...c, [field]: value }));
    setError('');
  }

  function toggleFeature(f: string) {
    setConfig((c) => ({
      ...c,
      enabledFeatures: c.enabledFeatures?.includes(f)
        ? c.enabledFeatures.filter((x) => x !== f)
        : [...(c.enabledFeatures || []), f],
    }));
  }

  const canValidate = config.tenantId.trim() && config.clientId.trim() && config.clientSecret.trim();

  async function handleValidate() {
    setStep('Validate');
    setError('');
    const result = await validateIntuneCredentials(config);
    if (result.ok) {
      setStep('Done');
    } else {
      setStep('Configure');
      setError(result.error || 'Connection failed. Please check your credentials.');
    }
  }

  function handleDone() {
    onConnected(config);
    onClose();
    // Reset for next use
    setTimeout(() => {
      setStep('Configure');
      setError('');
    }, 300);
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep('Configure');
      setError('');
    }, 300);
  }

  const footer = (
    <>
      {step === 'Configure' && (
        <>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleValidate}
            disabled={!canValidate}
          >
            Validate & Connect
          </button>
        </>
      )}
      {step === 'Validate' && (
        <span className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin" /> Connecting to Microsoft Graph…
        </span>
      )}
      {step === 'Done' && (
        <button className="btn-primary" onClick={handleDone}>
          Done — Start Sync
        </button>
      )}
    </>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Connect Microsoft Intune"
      size="lg"
      footer={footer}
    >
      {step === 'Configure' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              IN
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Microsoft Intune via Graph API</p>
              <p className="text-xs text-gray-500">OAuth 2.0 client credentials — requires an Azure AD app registration</p>
            </div>
          </div>

          {/* Setup instructions */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Azure AD App Registration required</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Go to <strong>Azure Portal → App registrations → New registration</strong></li>
                  <li>Add API permissions (see below) and grant Admin Consent</li>
                  <li>Under <strong>Certificates &amp; secrets</strong>, create a new Client Secret</li>
                  <li>Copy the Tenant ID, Client ID, and Secret below</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Required permissions */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Shield size={12} className="text-blue-500" /> Required API permissions
            </p>
            <div className="space-y-1">
              {INTUNE_REQUIRED_PERMISSIONS.map((p) => (
                <div key={p.permission} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <code className="text-gray-700 font-mono">{p.permission}</code>
                  <span className="text-gray-400">({p.type})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Credential fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Azure Tenant ID <span className="text-red-500">*</span>
              </label>
              <input
                className="input font-mono text-xs"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={config.tenantId}
                onChange={(e) => updateField('tenantId', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-0.5">Azure AD → Overview → Tenant ID</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Application (Client) ID <span className="text-red-500">*</span>
              </label>
              <input
                className="input font-mono text-xs"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={config.clientId}
                onChange={(e) => updateField('clientId', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-0.5">App Registrations → Your App → Application ID</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Client Secret <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className="input"
              placeholder="Paste your client secret value"
              value={config.clientSecret}
              onChange={(e) => updateField('clientSecret', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-0.5">
              Certificates &amp; Secrets → New client secret. Copy the <strong>Value</strong>, not the ID.
            </p>
          </div>

          {/* Sync settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Sync Frequency</label>
              <select
                className="select"
                value={config.syncFrequency}
                onChange={(e) => setConfig((c) => ({ ...c, syncFrequency: e.target.value }))}
              >
                <option>Every hour</option>
                <option>Every 4 hours</option>
                <option>Every 12 hours</option>
                <option>Daily</option>
              </select>
            </div>
          </div>

          {/* Feature toggles */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Data to sync</p>
            <div className="grid grid-cols-2 gap-1.5">
              {INTUNE_FEATURES.map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={config.enabledFeatures?.includes(f) ?? true}
                    onChange={() => toggleFeature(f)}
                  />
                  <span className="text-xs text-gray-700">{f}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'Validate' && (
        <div className="flex flex-col items-center py-12">
          <RefreshCw size={40} className="text-blue-500 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-900">Validating credentials…</p>
          <p className="text-xs text-gray-500 mt-1">
            Authenticating with Microsoft identity platform
          </p>
          <div className="mt-6 space-y-2 text-xs text-gray-400 text-left w-64">
            <p>✓ Sending token request to login.microsoftonline.com</p>
            <p className="animate-pulse">◌ Verifying Graph API access…</p>
            <p className="text-gray-300">○ Testing /deviceManagement/managedDevices…</p>
          </div>
        </div>
      )}

      {step === 'Done' && (
        <div className="flex flex-col items-center py-10">
          <CheckCircle size={52} className="text-green-500 mb-4" />
          <p className="text-sm font-semibold text-gray-900">Microsoft Intune connected!</p>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            Blimp has access to your managed devices. Initial sync will start now.
          </p>
          <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 text-xs space-y-1.5">
            <p className="font-semibold text-green-800 mb-2">What happens next</p>
            <p className="text-green-700">• All managed devices will be imported as Assets</p>
            <p className="text-green-700">• Compliance status synced as asset notes</p>
            <p className="text-green-700">• Subsequent syncs will update existing records (no duplicates)</p>
            <p className="text-green-700">• Syncing every {config.syncFrequency?.toLowerCase()}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
