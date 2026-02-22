/**
 * Prisma client singleton — Prisma 7 with @prisma/adapter-pg.
 *
 * In Prisma 7 the database URL is no longer read from schema.prisma at runtime.
 * Instead it must be passed via a driver adapter. This module creates a single
 * PrismaClient instance shared across all route handlers.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://blimp:blimp@localhost:5432/blimp';

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
