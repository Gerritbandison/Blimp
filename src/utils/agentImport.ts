/**
 * Blimp Agent report parser and asset importer.
 *
 * Takes a raw AgentReport JSON (from blimp_agent.py) and converts it into
 * Blimp Asset records:
 *   - One Asset for the host device (Laptop / Desktop / Server)
 *   - One Monitor Asset per external display detected via EDID
 */

import type { Asset, AssetType, AgentReport, AgentDisplay } from '../types';

// ─── EDID vendor ID → manufacturer name map ──────────────────────────────────
const EDID_VENDORS: Record<string, string> = {
  DEL: 'Dell',
  GSM: 'LG',
  SAM: 'Samsung',
  ACI: 'ASUS',
  ACR: 'Acer',
  HPN: 'HP',
  HWP: 'HP',
  LEN: 'Lenovo',
  PHL: 'Philips',
  BNQ: 'BenQ',
  AOC: 'AOC',
  APP: 'Apple',
  NEC: 'NEC',
  SNY: 'Sony',
  CMO: 'Innolux',
  BOE: 'BOE',
  AUO: 'AU Optronics',
  SDC: 'Samsung Display',
  LGD: 'LG Display',
  CPT: 'Chunghwa Picture Tubes',
  IVO: 'InfoVision',
  SHP: 'Sharp',
  MSI: 'MSI',
  VIZ: 'Vizio',
  ENC: 'Eizo',
  DWE: 'Daewoo',
  HEI: 'Hyundai',
};

function resolveManufacturer(display: AgentDisplay): string {
  if (display.manufacturer && !display.manufacturer.match(/^[A-Z]{3}$/)) {
    return display.manufacturer;
  }
  const id = display.manufacturerId?.toUpperCase();
  if (id && EDID_VENDORS[id]) return EDID_VENDORS[id];
  if (display.manufacturer) return display.manufacturer;
  return 'Unknown';
}

function platformToAssetType(_platform: string): AssetType {
  // Simple heuristic — the agent could be extended to detect desktops vs laptops
  // via chassis type (DMI type 3 on Linux, Win32_SystemEnclosure on Windows)
  return 'Laptop';
}

function makeTag(prefix: string, serial: string): string {
  const clean = serial.replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase();
  return `${prefix}-${clean}`;
}

/** Parse a raw string or JSON-string AgentReport */
export function parseAgentReport(raw: string): AgentReport {
  const data = JSON.parse(raw) as AgentReport;
  if (!data.version || !data.deviceId || !data.hardware) {
    throw new Error('Invalid Blimp Agent report — missing required fields.');
  }
  return data;
}

export interface ImportPreview {
  deviceAsset: Asset;
  monitorAssets: Asset[];
  totalAssets: number;
  displayCount: number;
  externalDisplayCount: number;
}

/** Convert an AgentReport into a list of Blimp Asset objects (preview — not yet saved). */
export function buildAssetsFromReport(report: AgentReport, integrationId: string): ImportPreview {
  const { hardware, os, displays, deviceId, generatedAt } = report;

  const storageStr = hardware.storage
    .map((s) => `${s.totalGB} GB (${s.label})`)
    .join(', ') || 'Unknown';

  const deviceAsset: Asset = {
    id: `agent-${integrationId}-${deviceId}`,
    tag: makeTag('AGENT', hardware.serial),
    name: `${hardware.make} ${hardware.model}`,
    type: platformToAssetType(report.platform),
    make: hardware.make,
    model: hardware.model,
    serial: hardware.serial,
    status: 'Deployed',
    location: `${report.hostname} (Agent)`,
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyExpiry: new Date(Date.now() + 3 * 365 * 86400000).toISOString().split('T')[0],
    cost: 0,
    currency: 'USD',
    os: `${os.name} ${os.version}${os.buildNumber ? ` (${os.buildNumber})` : ''}`.trim(),
    ram: hardware.ramGB ? `${hardware.ramGB} GB` : undefined,
    storage: storageStr,
    detectionSource: 'Blimp Agent',
    notes: [
      `CPU: ${hardware.cpu}`,
      `Architecture: ${os.architecture}`,
      `Hostname: ${report.network.hostname}`,
      `IPs: ${report.network.ipAddresses.join(', ')}`,
      `Agent v${report.version}`,
      `Report: ${new Date(generatedAt).toLocaleString()}`,
    ].join(' · '),
  };

  const externalDisplays = displays.filter((d) => !d.isBuiltIn);

  const monitorAssets: Asset[] = externalDisplays.map((d, idx) => {
    const mfr = resolveManufacturer(d);
    const monName = d.name && d.name !== 'Unknown Display' ? d.name : `${mfr} Monitor`;
    return {
      id: `agent-${integrationId}-${deviceId}-mon${idx}`,
      tag: makeTag('MON', d.serial || `${deviceId}-M${idx}`),
      name: monName,
      type: 'Monitor' as AssetType,
      make: mfr,
      model: d.name || 'Unknown',
      serial: d.serial || 'N/A',
      status: 'Deployed',
      location: `${report.hostname} (Agent)`,
      purchaseDate: d.year
        ? `${d.year}-01-01`
        : new Date().toISOString().split('T')[0],
      warrantyExpiry: d.year
        ? `${d.year + 3}-01-01`
        : new Date(Date.now() + 3 * 365 * 86400000).toISOString().split('T')[0],
      cost: 0,
      currency: 'USD',
      detectionSource: 'Blimp Agent (EDID)',
      notes: [
        d.manufacturerId ? `EDID Vendor: ${d.manufacturerId}` : null,
        d.productId ? `Product ID: ${d.productId}` : null,
        d.resolution ? `Resolution: ${d.resolution}` : null,
        d.refreshRate ? `Refresh: ${d.refreshRate} Hz` : null,
        d.year ? `Manufactured: ${d.year}${d.week ? ` wk${d.week}` : ''}` : null,
        d.edidVersion ? `EDID: v${d.edidVersion}` : null,
        `Connected to: ${hardware.make} ${hardware.model} (${hardware.serial})`,
      ].filter(Boolean).join(' · '),
    };
  });

  return {
    deviceAsset,
    monitorAssets,
    totalAssets: 1 + monitorAssets.length,
    displayCount: displays.length,
    externalDisplayCount: externalDisplays.length,
  };
}
