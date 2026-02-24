import { useState, useRef, useEffect, useCallback } from 'react';
import {
  CheckCircle, Download, Upload, Monitor, Cpu, HardDrive, Wifi,
  AlertCircle, RefreshCw, Usb, Keyboard, Mouse, Server, FlaskConical,
  Key, Plus, Trash2, Copy, Shield,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { clsx } from 'clsx';
import type { AgentReport, AgentPeripheral, AgentDeviceRecord } from '../../types';
import { parseAgentReport, buildAssetsFromReport } from '../../utils/agentImport';
import { THINKPAD_E14_AGENT_REPORT } from '../../data/lenovoScenario';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_ENABLED = !!API_BASE;

interface Props {
  open: boolean;
  integrationId: string;
  onClose: () => void;
  onImport: (report: AgentReport) => void;
}

type Tab = 'install' | 'import' | 'discover' | 'devices';

const INSTALL_TABS = [
  { id: 'macos', label: 'macOS' },
  { id: 'windows', label: 'Windows' },
  { id: 'linux', label: 'Linux' },
] as const;
type OS = typeof INSTALL_TABS[number]['id'];

const INSTALL_COMMANDS: Record<OS, { run: string; push: string; service: string }> = {
  macos: {
    run:     'python3 blimp_agent.py -o report.json',
    push:    'python3 blimp_agent.py --push --blimp-url https://YOUR-SERVER --blimp-token YOUR_TOKEN',
    service: 'sudo bash install-macos.sh',
  },
  windows: {
    run:     'python blimp_agent.py -o report.json',
    push:    'python blimp_agent.py --push --blimp-url https://YOUR-SERVER --blimp-token YOUR_TOKEN',
    service: 'powershell -File install-windows.ps1',
  },
  linux: {
    run:     'python3 blimp_agent.py -o report.json',
    push:    'python3 blimp_agent.py --push --blimp-url https://YOUR-SERVER --blimp-token YOUR_TOKEN',
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
        onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

// Configurable via VITE_AGENT_PORT env var; defaults to the standard agent port
const AGENT_PORT = (import.meta.env.VITE_AGENT_PORT as string | undefined) ?? '51723';
const AGENT_URL = `http://localhost:${AGENT_PORT}/report`;

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function healthDot(lastSeen: string | null): string {
  if (!lastSeen) return 'bg-gray-300';
  const ms = Date.now() - new Date(lastSeen).getTime();
  if (ms < 86400000) return 'bg-green-500';      // < 24 h — active
  if (ms < 7 * 86400000) return 'bg-yellow-400'; // < 7 d — recent
  return 'bg-red-400';                            // ≥ 7 d — stale
}

const MOCK_DEMO_DEVICES: AgentDeviceRecord[] = [
  { id: 'mock-1', name: "Alice's ThinkPad E14", tokenPrefix: 'blt_a4x', platform: 'Linux', hostname: 'alice-thinkpad', lastSeen: new Date(Date.now() - 2 * 3600000).toISOString(), lastReport: new Date(Date.now() - 2 * 3600000).toISOString(), reportCount: 12, isActive: true, createdAt: '2026-01-15T09:00:00Z' },
  { id: 'mock-2', name: "Carol's MacBook Pro", tokenPrefix: 'blt_c8y', platform: 'macOS', hostname: 'Carols-MacBook-Pro.local', lastSeen: new Date(Date.now() - 18 * 3600000).toISOString(), lastReport: new Date(Date.now() - 18 * 3600000).toISOString(), reportCount: 5, isActive: true, createdAt: '2026-02-01T14:30:00Z' },
  { id: 'mock-3', name: "Frank's Dell OptiPlex", tokenPrefix: 'blt_f2m', platform: 'Windows', hostname: 'FRANK-PC', lastSeen: new Date(Date.now() - 8 * 86400000).toISOString(), lastReport: new Date(Date.now() - 8 * 86400000).toISOString(), reportCount: 3, isActive: true, createdAt: '2026-02-10T11:00:00Z' },
];

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

  // ── Devices tab state ────────────────────────────────────────────────────
  const [devices, setDevices] = useState<AgentDeviceRecord[]>([]);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [generatedToken, setGeneratedToken] = useState<{ id: string; name: string; token: string } | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const fetchDevices = useCallback(async () => {
    if (!API_ENABLED) return;
    setDevicesLoading(true);
    setDevicesError('');
    try {
      const res = await fetch(`${API_BASE}/agent/devices`, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}`);
      setDevices(await res.json() as AgentDeviceRecord[]);
    } catch {
      setDevicesError('Could not load devices. Check server connection.');
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'devices' && API_ENABLED) {
      void fetchDevices();
    }
  }, [activeTab, fetchDevices]);

  async function generateDeviceToken() {
    if (!newDeviceName.trim() || !API_ENABLED) return;
    setDevicesLoading(true);
    setDevicesError('');
    try {
      const res = await fetch(`${API_BASE}/agent/devices`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeviceName.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { id: string; name: string; token: string };
      setGeneratedToken(data);
      setNewDeviceName('');
      void fetchDevices();
    } catch {
      setDevicesError('Could not create token. Check server connection.');
    } finally {
      setDevicesLoading(false);
    }
  }

  async function revokeDevice(id: string) {
    if (!API_ENABLED) return;
    setRevoking(id);
    try {
      await fetch(`${API_BASE}/agent/devices/${id}`, { method: 'DELETE', credentials: 'include' });
      setDevices((ds) => ds.filter((d) => d.id !== id));
      if (generatedToken?.id === id) setGeneratedToken(null);
    } catch {
      // silently ignore — user can retry
    } finally {
      setRevoking(null);
    }
  }

  function copyToken(token: string) {
    void navigator.clipboard.writeText(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

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
    fetch(AGENT_URL, { signal: AbortSignal.timeout(4000) })
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
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit flex-wrap">
          {([
            ['install', 'Install Agent'],
            ['import', 'Import Report'],
            ['discover', 'Auto-Discover'],
            ['devices', 'Devices & Tokens'],
          ] as const).map(([id, label]) => (
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
                Option B — Install as a background service
              </p>
              <CodeBlock code={cmds.service} />
              <p className="text-xs text-gray-400 mt-1">
                Runs on port {AGENT_PORT}. Use <strong>Auto-Discover</strong> to pull data automatically when the machine is on the same network.
              </p>
            </div>

            {/* Push to server */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">
                Option C — Push directly to this Blimp server <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">recommended</span>
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Generate a device token in the <button className="underline text-blue-600 hover:text-blue-800" onClick={() => setActiveTab('devices')}>Devices & Tokens</button> tab, then run:
              </p>
              <CodeBlock code={cmds.push} />
              <p className="text-xs text-gray-400 mt-1">
                Reports push automatically to this Blimp instance. No file upload needed. Token is stored in <code>~/.blimp/agent.conf</code> for future runs.
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
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-gray-500">
                Run <code className="bg-gray-100 px-1 rounded">python3 blimp_agent.py -o report.json</code> on the target machine, then upload or paste the resulting file below.
              </p>
              <button
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                onClick={() => handleJsonChange(JSON.stringify(THINKPAD_E14_AGENT_REPORT, null, 2))}
                title="Load a realistic ThinkPad E14 Gen 7 report to try the import flow"
              >
                <FlaskConical size={12} />
                Load ThinkPad E14 Gen 7 Sample
              </button>
            </div>

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

        {/* Devices & Tokens tab */}
        {activeTab === 'devices' && (() => {
          const displayDevices = API_ENABLED ? devices : MOCK_DEMO_DEVICES;
          const activeToday = displayDevices.filter(
            (d) => d.lastSeen && Date.now() - new Date(d.lastSeen).getTime() < 86400000
          ).length;
          return (
            <div className="space-y-4">
              {!API_ENABLED && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <Shield size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                  <p>
                    Live token management requires a running Blimp server — set <code className="bg-amber-100 px-1 rounded">VITE_API_BASE_URL</code>. Showing demo data below.
                  </p>
                </div>
              )}

              {API_ENABLED && (
                <>
                  <p className="text-xs text-gray-500">
                    Generate per-device API tokens so agents can push reports directly to this server. Each token is shown only once — store it securely or save it with <code className="bg-gray-100 px-1 rounded">--save-config</code>.
                  </p>

                  {/* Generate token form */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Key size={12} className="text-blue-500" /> Generate New Device Token
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Device name (e.g. Alice's ThinkPad)"
                        value={newDeviceName}
                        onChange={(e) => setNewDeviceName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void generateDeviceToken(); }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={100}
                      />
                      <button
                        className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                        onClick={() => void generateDeviceToken()}
                        disabled={!newDeviceName.trim() || devicesLoading}
                      >
                        <Plus size={12} /> Generate
                      </button>
                    </div>
                  </div>

                  {devicesError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      <AlertCircle size={13} /> {devicesError}
                    </div>
                  )}

                  {/* Newly generated token — shown once */}
                  {generatedToken && (
                    <div className="p-4 bg-green-50 border border-green-300 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                        <p className="text-xs font-semibold text-green-800">
                          Token generated for <strong>{generatedToken.name}</strong> — copy it now, it won't be shown again
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white border border-green-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 overflow-x-auto">
                          {generatedToken.token}
                        </code>
                        <button
                          onClick={() => copyToken(generatedToken.token)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <Copy size={11} /> {tokenCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-green-800">Quick setup (on the target machine):</p>
                        <CodeBlock code={`python3 blimp_agent.py --save-config --blimp-url ${API_BASE ?? 'https://YOUR-SERVER'} --blimp-token ${generatedToken.token}`} />
                        <p className="text-xs text-green-700 mt-1">
                          After saving, future runs just need: <code className="bg-green-100 px-1 rounded">python3 blimp_agent.py --push</code>
                        </p>
                      </div>
                      <button className="text-xs text-green-700 underline" onClick={() => setGeneratedToken(null)}>
                        Dismiss
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Device list — shown in both API and demo mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                    Registered Devices
                    {displayDevices.length > 0 && (
                      <span className="font-normal text-gray-400">
                        {displayDevices.length} total · <span className="text-green-600 font-medium">{activeToday} active today</span>
                      </span>
                    )}
                  </p>
                  {API_ENABLED && (
                    <button
                      onClick={() => void fetchDevices()}
                      disabled={devicesLoading}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={11} className={devicesLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  )}
                </div>

                {API_ENABLED && devicesLoading && displayDevices.length === 0 && (
                  <div className="flex justify-center py-6">
                    <RefreshCw size={16} className="animate-spin text-gray-400" />
                  </div>
                )}

                {API_ENABLED && !devicesLoading && displayDevices.length === 0 && (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No devices registered yet. Generate a token above to add the first one.
                  </div>
                )}

                {displayDevices.map((device) => (
                  <div key={device.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <div className="relative w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Server size={14} className="text-blue-500" />
                      <span className={clsx('absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white', healthDot(device.lastSeen))} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-800">{device.name}</p>
                        {device.platform && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">{device.platform}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {device.hostname ?? 'Unknown hostname'}
                        {' · '}
                        {device.lastSeen ? relativeTime(device.lastSeen) : 'Never connected'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {device.reportCount} report{device.reportCount !== 1 ? 's' : ''} · token: <code className="font-mono">{device.tokenPrefix}…</code>
                      </p>
                    </div>
                    {API_ENABLED && (
                      <button
                        onClick={() => void revokeDevice(device.id)}
                        disabled={revoking === device.id}
                        className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Revoke token"
                      >
                        {revoking === device.id
                          ? <RefreshCw size={11} className="animate-spin" />
                          : <Trash2 size={11} />
                        }
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Auto-discover tab */}
        {activeTab === 'discover' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              If the Blimp Agent is running in server mode on this machine, Blimp can pull the report automatically without file upload.
            </p>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-gray-700">How it works</p>
              <p className="text-xs text-gray-500">1. Install the agent in server mode: <code className="bg-gray-100 px-1 rounded">python3 blimp_agent.py --server</code></p>
              <p className="text-xs text-gray-500">2. Click <strong>Check Now</strong> — Blimp will query <code className="bg-gray-100 px-1 rounded">{AGENT_URL}</code></p>
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
                  <p className="font-semibold">Agent not detected on localhost:{AGENT_PORT}</p>
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
