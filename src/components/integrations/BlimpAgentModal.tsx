import { useState, useRef } from 'react';
import {
  CheckCircle, Download, Upload, Monitor, Cpu, HardDrive, Wifi,
  AlertCircle, RefreshCw, Usb, Keyboard, Mouse, Server,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { clsx } from 'clsx';
import type { AgentReport, AgentPeripheral } from '../../types';
import { parseAgentReport, buildAssetsFromReport } from '../../utils/agentImport';

interface Props {
  open: boolean;
  integrationId: string;
  onClose: () => void;
  onImport: (report: AgentReport) => void;
}

type Tab = 'install' | 'import' | 'discover';

const INSTALL_TABS = [
  { id: 'macos', label: 'macOS' },
  { id: 'windows', label: 'Windows' },
  { id: 'linux', label: 'Linux' },
] as const;
type OS = typeof INSTALL_TABS[number]['id'];

const INSTALL_COMMANDS: Record<OS, { run: string; service: string }> = {
  macos: {
    run: 'python3 blimp_agent.py -o report.json',
    service: 'sudo bash install-macos.sh',
  },
  windows: {
    run: 'python blimp_agent.py -o report.json',
    service: 'powershell -File install-windows.ps1',
  },
  linux: {
    run: 'python3 blimp_agent.py -o report.json',
    service: 'python3 blimp_agent.py --server',
  },
};

type PeripheralIconMap = Record<
  AgentPeripheral['type'],
  React.ComponentType<{ size?: number; className?: string }>
>;

const PERIPHERAL_ICONS: PeripheralIconMap = {
  Keyboard,
  Mouse,
  Dock: Server,
  Hub: Usb,
  Webcam: Monitor,
  Headset: Usb,
  Other: Usb,
};

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono">
        {code}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export function BlimpAgentModal({ open, integrationId, onClose, onImport }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('install');
  const [installOs, setInstallOs] = useState<OS>('macos');
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof buildAssetsFromReport> | null>(null);
  const [parsedReport, setParsedReport] = useState<AgentReport | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<'found' | 'not-found' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleJsonChange(val: string) {
    setJsonText(val);
    setParseError('');
    setPreview(null);
    setParsedReport(null);
    if (!val.trim()) return;
    try {
      const report = parseAgentReport(val);
      setParsedReport(report);
      setPreview(buildAssetsFromReport(report, integrationId));
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleJsonChange(ev.target?.result as string);
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleJsonChange(ev.target?.result as string);
    reader.readAsText(file);
  }

  function handleImport() {
    if (!jsonText.trim()) return;
    try {
      const report = parseAgentReport(jsonText);
      onImport(report);
      onClose();
      setJsonText('');
      setPreview(null);
      setParsedReport(null);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Invalid report');
    }
  }

  function handleDiscover() {
    setDiscovering(true);
    setDiscoverResult(null);
    fetch('http://localhost:51723/report', { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json())
      .then((data) => {
        setDiscovering(false);
        setDiscoverResult('found');
        setActiveTab('import');
        handleJsonChange(JSON.stringify(data, null, 2));
      })
      .catch(() => {
        setDiscovering(false);
        setDiscoverResult('not-found');
      });
  }

  const cmds = INSTALL_COMMANDS[installOs];

  const footer = (
    <>
      <button className="btn-secondary" onClick={onClose}>Close</button>
      {activeTab === 'import' && preview && !parseError && (
        <button className="btn-primary" onClick={handleImport}>
          Import {preview.totalAssets} asset{preview.totalAssets !== 1 ? 's' : ''}
        </button>
      )}
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Blimp Agent" size="lg" footer={footer}>
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          {([['install', 'Install Agent'], ['import', 'Import Report'], ['discover', 'Auto-Discover']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Install tab */}
        {activeTab === 'install' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Install the Blimp Agent on each machine to collect hardware specs, serial numbers, EDID display data, and connected peripherals (keyboards, mice, docks, hubs). The agent runs as a background service and exposes a local HTTP API.
            </p>

            {/* OS selector */}
            <div className="flex gap-2">
              {INSTALL_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setInstallOs(t.id)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                    installOs === t.id
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Download */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-gray-800">blimp_agent.py</p>
                <p className="text-xs text-gray-500">Python 3.9+ · No external dependencies · ~14 KB</p>
              </div>
              <a
                href="/blimp_agent.py"
                download="blimp_agent.py"
                className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
              >
                <Download size={12} /> Download
              </a>
            </div>

            {/* One-shot run */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">
                Option A — Run once, import the JSON
              </p>
              <CodeBlock code={cmds.run} />
              <p className="text-xs text-gray-400 mt-1">
                Generates <code>report.json</code>. Upload it in the <strong>Import Report</strong> tab.
              </p>
            </div>

            {/* Always-on service */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">
                Option B — Install as a background service (recommended)
              </p>
              <CodeBlock code={cmds.service} />
              <p className="text-xs text-gray-400 mt-1">
                Runs on port 51723. Use <strong>Auto-Discover</strong> to pull data automatically when the machine is on the same network.
              </p>
            </div>

            {/* What's collected */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Cpu, label: 'Hardware', items: ['Make, model, serial', 'CPU & RAM', 'Storage volumes'] },
                { icon: Monitor, label: 'Displays (EDID)', items: ['Manufacturer & model', 'Serial number', 'Resolution & year'] },
                { icon: HardDrive, label: 'OS', items: ['Name & version', 'Build number', 'Architecture'] },
                { icon: Wifi, label: 'Network', items: ['Hostname', 'IP addresses'] },
                { icon: Keyboard, label: 'Keyboards & Mice', items: ['USB & Bluetooth', 'Manufacturer', 'Vendor / Product ID'] },
                { icon: Usb, label: 'Docks & Peripherals', items: ['USB & Thunderbolt docks', 'Webcams & headsets', 'Hubs & adapters'] },
              ].map(({ icon: Icon, label, items }) => (
                <div key={label} className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={12} className="text-blue-500" />
                    <span className="text-xs font-semibold text-gray-700">{label}</span>
                  </div>
                  {items.map((i) => (
                    <p key={i} className="text-xs text-gray-500">• {i}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import tab */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Run <code className="bg-gray-100 px-1 rounded">python3 blimp_agent.py -o report.json</code> on the target machine, then upload or paste the resulting file below.
            </p>

            {/* Drag & drop zone */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">Drop report.json here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">JSON files generated by blimp_agent.py</p>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileUpload} />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400">or paste JSON</span></div>
            </div>

            <textarea
              className="w-full h-36 border border-gray-300 rounded-xl p-3 font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder='{"version": "1.1.0", "deviceId": "...", ...}'
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
            />

            {parseError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle size={13} /> {parseError}
              </div>
            )}

            {/* Preview */}
            {preview && !parseError && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-green-800">
                  Ready to import — {preview.totalAssets} asset{preview.totalAssets !== 1 ? 's' : ''} detected
                </p>

                {/* Device */}
                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-green-100">
                  <Cpu size={14} className="text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">{preview.deviceAsset.name}</p>
                    <p className="text-xs text-gray-500">
                      {preview.deviceAsset.serial} · {preview.deviceAsset.os} · {preview.deviceAsset.ram}
                    </p>
                  </div>
                </div>

                {/* Monitors */}
                {preview.monitorAssets.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-green-100">
                    <Monitor size={14} className="text-purple-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.serial} · via EDID</p>
                    </div>
                  </div>
                ))}

                {preview.displayCount > preview.externalDisplayCount && (
                  <p className="text-xs text-green-700">
                    + {preview.displayCount - preview.externalDisplayCount} built-in display(s) detected (not imported as separate assets)
                  </p>
                )}

                {/* Peripherals */}
                {preview.peripheralAssets.length > 0 && (
                  <>
                    {preview.peripheralAssets.map((p, idx) => {
                      const rawPeripheral = parsedReport?.peripherals?.filter((r) => !r.isBuiltIn)[idx];
                      const pType = rawPeripheral?.type ?? 'Other';
                      const Icon = PERIPHERAL_ICONS[pType];
                      const connLabel = rawPeripheral?.connectionType ?? 'USB';
                      return (
                        <div key={p.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-green-100">
                          <Icon size={14} className="text-orange-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-800">{p.name}</p>
                            <p className="text-xs text-gray-500">
                              {pType} · {connLabel}{p.make !== 'Unknown' ? ` · ${p.make}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {preview.peripheralCount === 0 && (
                  <p className="text-xs text-green-700 italic">
                    No external peripherals detected (requires agent v1.1.0+)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Auto-discover tab */}
        {activeTab === 'discover' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              If the Blimp Agent is running in server mode on this machine, Blimp can pull the report automatically without file upload.
            </p>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-gray-700">How it works</p>
              <p className="text-xs text-gray-500">1. Install the agent in server mode: <code className="bg-gray-100 px-1 rounded">python3 blimp_agent.py --server</code></p>
              <p className="text-xs text-gray-500">2. Click <strong>Check Now</strong> — Blimp will query <code className="bg-gray-100 px-1 rounded">http://localhost:51723/report</code></p>
              <p className="text-xs text-gray-500">3. If found, the report loads automatically into the Import tab</p>
            </div>

            <div className="flex justify-center">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleDiscover}
                disabled={discovering}
              >
                {discovering ? <RefreshCw size={14} className="animate-spin" /> : <Wifi size={14} />}
                {discovering ? 'Checking…' : 'Check Now'}
              </button>
            </div>

            {discoverResult === 'found' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
                <CheckCircle size={14} />
                Agent found! Report loaded in the Import tab.
              </div>
            )}

            {discoverResult === 'not-found' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Agent not detected on localhost:51723</p>
                  <p className="mt-0.5">Make sure the agent is running in server mode. See the <button className="underline" onClick={() => setActiveTab('install')}>Install</button> tab for instructions.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
