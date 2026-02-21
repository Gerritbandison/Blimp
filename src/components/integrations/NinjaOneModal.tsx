import { useState } from 'react';
import { CheckCircle, RefreshCw, Info } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { NinjaOneConfig } from '../../utils/ninjaone';
import { validateNinjaOneCredentials, NINJAONE_FEATURES } from '../../utils/ninjaone';

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected: (config: NinjaOneConfig) => void;
}

type Step = 'Configure' | 'Validate' | 'Done';

export function NinjaOneModal({ open, onClose, onConnected }: Props) {
  const [step, setStep] = useState<Step>('Configure');
  const [error, setError] = useState('');
  const [config, setConfig] = useState<NinjaOneConfig>({
    instanceUrl: 'app.ninjarmm.com',
    clientId: '',
    clientSecret: '',
    syncFrequency: 'Every 4 hours',
    enabledFeatures: [...NINJAONE_FEATURES],
  });

  function updateField(field: keyof NinjaOneConfig, value: string) {
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

  const canValidate = config.instanceUrl.trim() && config.clientId.trim() && config.clientSecret.trim();

  async function handleValidate() {
    setStep('Validate');
    setError('');
    const result = await validateNinjaOneCredentials(config);
    if (result.ok) {
      setStep('Done');
    } else {
      setStep('Configure');
      setError(result.error || 'Connection failed. Check your credentials and instance URL.');
    }
  }

  function handleDone() {
    onConnected(config);
    onClose();
    setTimeout(() => { setStep('Configure'); setError(''); }, 300);
  }

  function handleClose() {
    onClose();
    setTimeout(() => { setStep('Configure'); setError(''); }, 300);
  }

  const footer = (
    <>
      {step === 'Configure' && (
        <>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { void handleValidate(); }} disabled={!canValidate}>
            Validate & Connect
          </button>
        </>
      )}
      {step === 'Validate' && (
        <span className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin" /> Connecting to NinjaOne API…
        </span>
      )}
      {step === 'Done' && (
        <button className="btn-primary" onClick={handleDone}>Done — Start Sync</button>
      )}
    </>
  );

  return (
    <Modal open={open} onClose={handleClose} title="Connect NinjaOne" size="lg" footer={footer}>
      {step === 'Configure' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              NJ
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">NinjaOne RMM via REST API v2</p>
              <p className="text-xs text-gray-500">OAuth 2.0 client credentials — requires API application in NinjaOne</p>
            </div>
          </div>

          {/* Setup instructions */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">NinjaOne API credentials required</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Log into NinjaOne → <strong>Administration → Apps → API</strong></li>
                  <li>Click <strong>Add</strong> and select <strong>Client App (Machine-to-Machine)</strong></li>
                  <li>Set Allowed Scopes: <code className="bg-amber-100 px-1 rounded">monitoring management control</code></li>
                  <li>Copy the Client ID and Client Secret shown</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Connection fields */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Instance URL <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-0">
              <span className="flex items-center px-3 h-9 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-xs text-gray-500">
                https://
              </span>
              <input
                className="input rounded-l-none flex-1 font-mono text-xs"
                placeholder="app.ninjarmm.com"
                value={config.instanceUrl}
                onChange={(e) => updateField('instanceUrl', e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Your NinjaOne instance URL — check your browser when logged in. EU instances use <code>eu.ninjarmm.com</code>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Client ID <span className="text-red-500">*</span>
              </label>
              <input
                className="input font-mono text-xs"
                placeholder="Paste client ID"
                value={config.clientId}
                onChange={(e) => updateField('clientId', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Client Secret <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="Paste client secret"
                value={config.clientSecret}
                onChange={(e) => updateField('clientSecret', e.target.value)}
              />
            </div>
          </div>

          {/* Sync frequency */}
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
              {NINJAONE_FEATURES.map((f) => (
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
          <RefreshCw size={40} className="text-orange-500 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-900">Validating credentials…</p>
          <p className="text-xs text-gray-500 mt-1">
            Authenticating with {config.instanceUrl}
          </p>
          <div className="mt-6 space-y-2 text-xs text-gray-400 text-left w-64">
            <p>✓ Sending token request to OAuth endpoint</p>
            <p className="animate-pulse">◌ Testing /v2/devices access…</p>
            <p className="text-gray-300">○ Fetching organisation structure…</p>
          </div>
        </div>
      )}

      {step === 'Done' && (
        <div className="flex flex-col items-center py-10">
          <CheckCircle size={52} className="text-green-500 mb-4" />
          <p className="text-sm font-semibold text-gray-900">NinjaOne connected!</p>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            Blimp can now read your managed endpoints. Initial sync will start now.
          </p>
          <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 text-xs space-y-1.5">
            <p className="font-semibold text-green-800 mb-2">What happens next</p>
            <p className="text-green-700">• All managed endpoints imported as Assets</p>
            <p className="text-green-700">• Patch status and online state synced as notes</p>
            <p className="text-green-700">• Hardware specs (CPU, RAM, Disk) captured</p>
            <p className="text-green-700">• Syncing every {config.syncFrequency?.toLowerCase()}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
