/**
 * Sample Lenovo ThinkPad E14 Gen 7 Blimp Agent report.
 *
 * Represents a typical employee machine docked at their desk:
 *   • ThinkPad E14 Gen 7 AMD (21JR) — AMD Ryzen 7 7730U, 16 GB DDR5, 512 GB NVMe
 *   • ThinkPad Universal USB-C Dock Gen 2 (40AJ) connected via USB-C
 *   • Lenovo ThinkVision P27h-20 — 27" QHD monitor detected via EDID
 *   • ThinkPad TrackPoint Keyboard II — Bluetooth
 *   • Lenovo Wireless Mouse M300 — USB nano receiver (via dock)
 *
 * This is the exact JSON structure produced by blimp_agent.py v1.1.0.
 * Load it in the Blimp Agent modal → Import Report → "Load ThinkPad E14 Gen 7 Sample"
 * to try the import flow without needing a physical machine.
 */

import type { AgentReport } from '../types';

export const THINKPAD_E14_AGENT_REPORT: AgentReport = {
  version: '1.1.0',
  deviceId: 'tp-e14g7-pf4a3rb1',
  generatedAt: '2026-02-21T08:30:00.000Z',
  platform: 'Windows',
  hostname: 'LENTP-E14-ENG01',

  hardware: {
    make: 'Lenovo',
    model: 'ThinkPad E14 Gen 7',
    serial: 'PF4A3RB1',
    cpu: 'AMD Ryzen 7 7730U with Radeon Graphics',
    ramGB: 16,
    storage: [
      // Primary NVMe — Samsung MZAL4512HBLU-00BL2 (OEM)
      { label: 'C:', totalGB: 512, freeGB: 287 },
    ],
  },

  os: {
    name: 'Windows 11 Pro',
    version: '23H2',
    buildNumber: '22631.3235',
    architecture: 'x64',
  },

  network: {
    hostname: 'LENTP-E14-ENG01',
    ipAddresses: ['192.168.1.45', '192.168.100.45'],
  },

  displays: [
    {
      // Built-in 14" FHD+ (1920×1200) IPS anti-glare — BOE NV140WUM-N61 panel
      name: 'BOE Display',
      isBuiltIn: true,
      manufacturerId: 'BOE',
      productId: '0992',
      serial: '',
      resolution: '1920x1200',
      refreshRate: 60,
      year: 2023,
      week: 12,
      edidVersion: '1.4',
    },
    {
      // Lenovo ThinkVision P27h-20 — 27" QHD IPS USB-C monitor
      // Connected via ThinkPad USB-C Dock Gen 2 DisplayPort output
      name: 'LEN P27h-20',
      isBuiltIn: false,
      manufacturer: 'Lenovo',
      manufacturerId: 'LEN',
      productId: '60D0',
      serial: 'V303K7MB',
      resolution: '2560x1440',
      refreshRate: 75,
      year: 2021,
      week: 33,
      edidVersion: '1.4',
    },
  ],

  peripherals: [
    {
      // ThinkPad Universal USB-C Dock Gen 2 (40AJ0135EU)
      // 3× USB-A 3.1 · 1× USB-C 3.1 · 2× HDMI 2.0 · 1× DP 1.4 · RJ-45 · 90 W PD
      name: 'ThinkPad USB-C Dock Gen 2',
      type: 'Dock',
      isBuiltIn: false,
      manufacturer: 'Lenovo',
      vendorId: '0x17ef',
      productId: '0x3074',
      serial: 'TP00155B',
      connectionType: 'USB',
    },
    {
      // ThinkPad TrackPoint Keyboard II (4Y40X49493)
      // Full-size layout with TrackPoint · paired via Bluetooth 5.0
      name: 'ThinkPad TrackPoint Keyboard II',
      type: 'Keyboard',
      isBuiltIn: false,
      manufacturer: 'Lenovo',
      vendorId: '0x17ef',
      productId: '0x60e1',
      connectionType: 'Bluetooth',
    },
    {
      // Lenovo Wireless Mouse M300 (GX30M39704)
      // Nano USB receiver — plugged into dock USB-A port
      name: 'Lenovo Wireless Mouse M300',
      type: 'Mouse',
      isBuiltIn: false,
      manufacturer: 'Lenovo',
      vendorId: '0x17ef',
      productId: '0x6053',
      connectionType: 'USB',
    },
  ],
};
