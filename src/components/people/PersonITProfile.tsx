/**
 * PersonITProfile – unified view of a person's IT footprint.
 *
 * Merges device records from multiple detection sources (Microsoft Intune,
 * NinjaOne, Blimp Agent) identified by the same serial number, then displays
 * monitors, peripherals, software licences and a cost breakdown.
 *
 * Works in both modes:
 *  - API mode (VITE_API_BASE_URL set): fetches GET /people/:id/profile
 *  - Local mode: derives the profile from the Zustand store
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor, Cpu, MemoryStick, Wifi, WifiOff, ShieldCheck, ShieldAlert,
  AppWindow, DollarSign, Tag, ExternalLink, Loader2, AlertCircle,
  Laptop, Smartphone, Server, Printer, Network, Package, Usb,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';
import { api, API_ENABLED } from '../../services/api';
import type { Person, Asset, App } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MergedDevice {
  serial: string;
  name: string;
  type: string;
  make: string;
  model: string;
  os?: string;
  ram?: string;
  storage?: string;
  cost: number;
  currency: string;
  location: string;
  purchaseDate: string;
  warrantyExpiry: string;
  status: string;
  sources: string[];
  compliance?: string;
  patchStatus?: string;
  online?: boolean;
  cpu?: string;
  lastSync?: string;
  bitlocker?: string;
  entraId?: string;
  freeDisk?: string;
  assetIds: { id: string; tag: string; detectionSource?: string | null }[];
}

interface ProfileMonitor {
  id: string;
  name: string;
  make: string;
  model: string;
  serial: string;
  screenSize?: string | null;
  cost: number;
  currency: string;
  location: string;
  detectionSource?: string | null;
}

interface ProfilePeripheral {
  id: string;
  name: string;
  type: string;
  make: string;
  model: string;
  serial: string;
  cost: number;
  currency: string;
  detectionSource?: string | null;
}

interface ProfileLicense {
  appId: string;
  appName: string;
  vendor: string;
  logo?: string | null;
  category: string;
  licenseType: string;
  costPerLicense: number;
  billingCycle: string;
  currency: string;
  status: string;
  licenseCount: number;
}

interface ITProfile {
  devices: MergedDevice[];
  monitors: ProfileMonitor[];
  peripherals: ProfilePeripheral[];
  licenses: ProfileLicense[];
  costSummary: { hardware: number; softwareAnnual: number; total: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNote(notes: string | undefined, prefix: string): string | undefined {
  if (!notes) return undefined;
  const part = notes.split(' | ').find((p) => p.startsWith(prefix));
  return part ? part.slice(prefix.length).trim() : undefined;
}

function sourceColor(src: string): string {
  if (src.includes('Intune') || src.includes('Microsoft')) return 'bg-blue-100 text-blue-700';
  if (src.includes('Ninja')) return 'bg-purple-100 text-purple-700';
  if (src.includes('Agent') || src.includes('Blimp')) return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-600';
}

function deviceIcon(type: string) {
  const cls = 'text-blue-500';
  switch (type) {
    case 'Laptop':  return <Laptop size={18} className={cls} />;
    case 'Desktop': return <Monitor size={18} className={cls} />;
    case 'Server':  return <Server size={18} className={cls} />;
    case 'Phone':
    case 'Tablet':  return <Smartphone size={18} className={cls} />;
    case 'Printer': return <Printer size={18} className={cls} />;
    case 'Network': return <Network size={18} className={cls} />;
    default:        return <Package size={18} className={cls} />;
  }
}

function fmt(n: number, currency = 'USD'): string {
  return n.toLocaleString('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
}

// ─── Derive profile from Zustand store (local mode) ──────────────────────────

function deriveLocalProfile(person: Person, assets: Asset[], apps: App[]): ITProfile {
  const assigned = assets.filter((a) => a.assignedToId === person.id);

  const computingTypes = ['Laptop', 'Desktop', 'Server', 'Phone', 'Tablet', 'Other', 'Network', 'Printer'];
  const computingAssets = assigned.filter((a) => computingTypes.includes(a.type));
  const monitors = assigned.filter((a) => a.type === 'Monitor');
  const peripherals = assigned.filter((a) => a.type === 'Peripheral');

  // Group by serial
  const bySerial = new Map<string, Asset[]>();
  for (const a of computingAssets) {
    const key = a.serial || a.id;
    if (!bySerial.has(key)) bySerial.set(key, []);
    bySerial.get(key)!.push(a);
  }

  const devices: MergedDevice[] = Array.from(bySerial.entries()).map(([serial, records]) => {
    const primary = records[0];
    const sources = [...new Set(records.map((r) => r.detectionSource).filter(Boolean))] as string[];

    let compliance: string | undefined;
    let patchStatus: string | undefined;
    let online: boolean | undefined;
    let cpu: string | undefined;
    let lastSync: string | undefined;
    let bitlocker: string | undefined;
    let entraId: string | undefined;
    let freeDisk: string | undefined;

    for (const r of records) {
      compliance  ??= parseNote(r.notes, 'Compliance: ');
      patchStatus ??= parseNote(r.notes, 'Patches: ');
      cpu         ??= parseNote(r.notes, 'CPU: ');
      lastSync    ??= parseNote(r.notes, 'Last Sync: ');
      bitlocker   ??= parseNote(r.notes, 'BitLocker: ');
      entraId     ??= parseNote(r.notes, 'Entra ID: ');
      freeDisk    ??= parseNote(r.notes, 'Free Disk: ') ?? parseNote(r.notes, 'Free Storage: ');
      if (online === undefined) {
        const s = parseNote(r.notes, 'Status: ');
        if (s !== undefined) online = s === 'Online';
      }
    }

    return {
      serial,
      name: primary.name,
      type: primary.type,
      make: primary.make,
      model: primary.model,
      os: records.map((r) => r.os).find(Boolean),
      ram: records.map((r) => r.ram).find(Boolean),
      storage: records.map((r) => r.storage).find(Boolean),
      cost: Math.max(...records.map((r) => r.cost)),
      currency: primary.currency,
      location: primary.location,
      purchaseDate: primary.purchaseDate,
      warrantyExpiry: primary.warrantyExpiry,
      status: primary.status,
      sources,
      compliance,
      patchStatus,
      online,
      cpu,
      lastSync,
      bitlocker,
      entraId,
      freeDisk,
      assetIds: records.map((r) => ({ id: r.id, tag: r.tag, detectionSource: r.detectionSource })),
    };
  });

  // Licenses: apps with licenses matching this person
  const personLicenses: ProfileLicense[] = [];
  for (const app of apps) {
    const matched = (app.licenses || []).filter(
      (l) => l.assignedToId === person.id || l.assignedTo === person.email
    );
    if (matched.length > 0) {
      personLicenses.push({
        appId: app.id,
        appName: app.name,
        vendor: app.vendor,
        logo: app.logo,
        category: app.category,
        licenseType: app.licenseType,
        costPerLicense: app.costPerLicense,
        billingCycle: app.billingCycle,
        currency: app.currency,
        status: app.status,
        licenseCount: matched.length,
      });
    }
  }

  const hardwareCost = assigned.reduce((s, a) => s + a.cost, 0);
  const softwareAnnual = personLicenses.reduce((s, l) => {
    const annual = l.billingCycle === 'annual' ? l.costPerLicense : l.costPerLicense * 12;
    return s + annual * l.licenseCount;
  }, 0);

  return {
    devices,
    monitors: monitors.map((m) => ({
      id: m.id, name: m.name, make: m.make, model: m.model,
      serial: m.serial, screenSize: m.screenSize, cost: m.cost,
      currency: m.currency, location: m.location, detectionSource: m.detectionSource,
    })),
    peripherals: peripherals.map((p) => ({
      id: p.id, name: p.name, type: p.type, make: p.make, model: p.model,
      serial: p.serial, cost: p.cost, currency: p.currency, detectionSource: p.detectionSource,
    })),
    licenses: personLicenses,
    costSummary: { hardware: hardwareCost, softwareAnnual, total: hardwareCost + softwareAnnual },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function sourceShortLabel(src: string): string {
  if (src === 'Blimp Agent (EDID)') return 'Agent · EDID';
  if (src === 'Blimp Agent (USB)') return 'Agent · USB';
  if (src.startsWith('Blimp Agent')) return 'Blimp Agent';
  return src;
}

function SourceBadge({ src }: { src: string }) {
  return (
    <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide', sourceColor(src))}>
      {sourceShortLabel(src)}
    </span>
  );
}

function SpecRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-gray-700 font-medium break-all">{value}</span>
    </div>
  );
}

function DeviceCard({ device, onNavigate }: { device: MergedDevice; onNavigate: (id: string) => void }) {
  const isCompliant = device.compliance?.toLowerCase().includes('compliant') && !device.compliance?.toLowerCase().includes('non');
  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          {deviceIcon(device.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{device.name}</p>
            {device.online !== undefined && (
              device.online
                ? <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold"><Wifi size={10} />Online</span>
                : <span className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold"><WifiOff size={10} />Offline</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{device.make} {device.model} · {device.serial}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {device.sources.map((s) => <SourceBadge key={s} src={s} />)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">{fmt(device.cost, device.currency)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">purchase price</p>
        </div>
      </div>

      {/* Specs grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 bg-gray-50 rounded-lg p-3">
        <SpecRow label="OS" value={device.os} />
        <SpecRow label="CPU" value={device.cpu} />
        <SpecRow label="RAM" value={device.ram} />
        <SpecRow label="Storage" value={device.storage} />
        <SpecRow label="Free disk" value={device.freeDisk} />
        <SpecRow label="Location" value={device.location} />
        <SpecRow label="Patches" value={device.patchStatus} />
        <SpecRow label="BitLocker" value={device.bitlocker} />
      </div>

      {/* Compliance + actions row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {device.compliance ? (
            <span className={clsx(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
              isCompliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            )}>
              {isCompliant ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
              {device.compliance}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {device.assetIds.map((a) => (
            <button
              key={a.id}
              onClick={() => onNavigate(a.id)}
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
            >
              <Tag size={10} />
              {a.tag}
              <ExternalLink size={9} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { person: Person }

export function PersonITProfile({ person }: Props) {
  const navigate = useNavigate();
  const { assets, apps } = useStore();

  const [profile, setProfile] = useState<ITProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (API_ENABLED) {
      setLoading(true);
      api.get<{ person: Person } & ITProfile>(`/people/${person.id}/profile`)
        .then((data) => {
          setProfile({
            devices: data.devices,
            monitors: data.monitors,
            peripherals: data.peripherals,
            licenses: data.licenses,
            costSummary: data.costSummary,
          });
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setProfile(deriveLocalProfile(person, assets, apps));
    }
  }, [person, assets, apps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading IT profile…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-10 text-red-500">
        <AlertCircle size={16} />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!profile) return null;

  const { devices, monitors, peripherals, licenses, costSummary } = profile;
  const totalAssets = devices.length + monitors.length + peripherals.length;

  return (
    <div className="space-y-6">
      {/* Cost summary banner */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Hardware Assets', value: costSummary.hardware, icon: Monitor, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Software (annual)', value: costSummary.softwareAnnual, icon: AppWindow, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Total Annual IT Cost', value: costSummary.total, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-base font-bold text-gray-900">{fmt(value)}</p>
            </div>
          </div>
        ))}
      </div>

      {totalAssets === 0 && licenses.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Monitor size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No IT data found for this person</p>
          <p className="text-xs mt-1">Run an Intune or NinjaOne sync to populate device data, or assign assets directly.</p>
        </div>
      ) : null}

      {/* Devices */}
      {devices.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Laptop size={13} /> Devices ({devices.length})
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {devices.map((d) => (
              <DeviceCard
                key={d.serial}
                device={d}
                onNavigate={(id) => { void navigate(`/assets/${id}`); }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Monitors */}
      {monitors.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Monitor size={13} /> Monitors ({monitors.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {monitors.map((m) => {
              const isEdid = m.detectionSource?.includes('EDID');
              return (
                <div key={m.id} className={clsx('card p-4', isEdid && 'border-green-200/80')}>
                  <div className="flex items-start gap-3">
                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', isEdid ? 'bg-green-50' : 'bg-indigo-50')}>
                      <Monitor size={14} className={isEdid ? 'text-green-600' : 'text-indigo-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.make} {m.model}</p>
                      {m.screenSize && <p className="text-xs text-gray-400 mt-0.5">{m.screenSize}</p>}
                      {m.detectionSource && (
                        <div className="mt-1">
                          <SourceBadge src={m.detectionSource} />
                        </div>
                      )}
                    </div>
                    {m.cost > 0 && (
                      <span className="text-xs font-semibold text-gray-700 shrink-0">{fmt(m.cost, m.currency)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Peripherals */}
      {peripherals.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <MemoryStick size={13} /> Peripherals ({peripherals.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {peripherals.map((p) => {
              const isAgent = p.detectionSource?.includes('Agent') || p.detectionSource?.includes('Blimp');
              const isUsb = p.detectionSource?.includes('USB');
              return (
                <div key={p.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', isAgent ? 'bg-green-50' : 'bg-amber-50')}>
                      {isUsb
                        ? <Usb size={14} className="text-green-600" />
                        : <Package size={14} className={isAgent ? 'text-green-600' : 'text-amber-500'} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.make} {p.model}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.type}</p>
                      {p.detectionSource && (
                        <div className="mt-1">
                          <SourceBadge src={p.detectionSource} />
                        </div>
                      )}
                    </div>
                    {p.cost > 0 && (
                      <span className="text-xs font-semibold text-gray-700 shrink-0">{fmt(p.cost, p.currency)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Software Licenses */}
      {licenses.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AppWindow size={13} /> Software & Licenses ({licenses.length})
          </h3>
          <div className="card divide-y divide-gray-50">
            {licenses.map((l) => (
              <div key={l.appId} className="flex items-center gap-4 py-3 px-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {l.appName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{l.appName}</p>
                  <p className="text-xs text-gray-500">{l.vendor} · {l.licenseType}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {fmt(l.costPerLicense, l.currency)}
                    <span className="text-[10px] text-gray-400 font-normal">/{l.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </p>
                  <p className="text-[10px] text-gray-400">{l.licenseCount} licence{l.licenseCount !== 1 ? 's' : ''}</p>
                </div>
                <span className={clsx(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase',
                  l.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                )}>{l.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Technical metadata */}
      {devices.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Cpu size={13} /> Technical Detail
          </h3>
          <div className="card divide-y divide-gray-50">
            {devices.map((d) => (
              d.entraId || d.lastSync ? (
                <div key={d.serial} className="py-3 px-4 text-xs text-gray-500 space-y-1">
                  <p className="font-medium text-gray-700">{d.name}</p>
                  {d.entraId && <p>Entra ID: <span className="font-mono text-gray-600">{d.entraId}</span></p>}
                  {d.lastSync && <p>Last Intune sync: {new Date(d.lastSync).toLocaleString()}</p>}
                </div>
              ) : null
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
