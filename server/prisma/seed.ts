/**
 * Database seed script.
 * Creates a default admin user and the demo integration records.
 *
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Default admin user ──
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@blimp.io' },
    update: {},
    create: {
      email: 'admin@blimp.io',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: 'Admin',
      status: 'Active',
    },
  });

  // ── Demo users matching the frontend ──
  const financePassword = await bcrypt.hash('finance123', 12);
  await prisma.user.upsert({
    where: { email: 'finance@blimp.io' },
    update: {},
    create: {
      email: 'finance@blimp.io',
      name: 'Finance User',
      passwordHash: financePassword,
      role: 'Finance',
      status: 'Active',
    },
  });

  const readonlyPassword = await bcrypt.hash('readonly123', 12);
  await prisma.user.upsert({
    where: { email: 'readonly@blimp.io' },
    update: {},
    create: {
      email: 'readonly@blimp.io',
      name: 'Read Only User',
      passwordHash: readonlyPassword,
      role: 'ReadOnly',
      status: 'Active',
    },
  });

  // ── Integration placeholders ──
  await prisma.integration.upsert({
    where: { id: 'intune' },
    update: {},
    create: {
      id: 'intune',
      name: 'Microsoft Intune',
      category: 'MDM / Endpoint Management',
      description: 'Sync managed devices, compliance status, and Entra ID users from Microsoft Intune.',
      status: 'Disconnected',
      features: [
        'Device inventory sync',
        'Compliance status',
        'OS version & patch level',
        'Hardware specs (RAM, CPU, Storage)',
        'App deployment tracking',
        'Entra ID user assignment',
      ],
    },
  });

  await prisma.integration.upsert({
    where: { id: 'ninjaone' },
    update: {},
    create: {
      id: 'ninjaone',
      name: 'NinjaOne',
      category: 'RMM / Endpoint Management',
      description: 'Sync endpoint inventory, patch compliance, and monitoring alerts from NinjaOne.',
      status: 'Disconnected',
      features: [
        'Endpoint inventory sync',
        'OS patch compliance',
        'Hardware specs (CPU, RAM, Disk)',
        'Software inventory',
        'Online / offline status',
        'Alert & monitoring sync',
      ],
    },
  });

  await prisma.integration.upsert({
    where: { id: 'blimp-agent' },
    update: {},
    create: {
      id: 'blimp-agent',
      name: 'Blimp Agent',
      category: 'Direct / Agent',
      description: 'Lightweight Python agent that reports hardware inventory directly from endpoints.',
      status: 'Disconnected',
      features: [
        'Hardware inventory',
        'Display detection (EDID)',
        'Peripheral detection (USB/Bluetooth)',
        'Cross-platform (macOS, Windows, Linux)',
      ],
    },
  });

  // ── Default settings ──
  await prisma.companySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Blimp Demo',
      domain: 'blimp.io',
      currency: 'USD',
      fiscalYearStart: 'January',
      timezone: 'America/New_York',
      plan: 'Business',
    },
  });

  await prisma.notificationSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
