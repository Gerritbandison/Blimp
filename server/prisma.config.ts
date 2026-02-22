/**
 * Prisma 7 config — provides the database URL for Prisma CLI commands
 * (migrate, generate, db push, db seed, etc.).
 *
 * For runtime connections, see src/lib/prisma.ts which uses @prisma/adapter-pg.
 */
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL ?? 'postgresql://blimp:blimp@localhost:5432/blimp',
});
