import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1).default('postgresql://localhost:5432/blimp'),
  JWT_SECRET: z.string().min(1).default('dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('[blimp-server] Invalid environment configuration:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const env = result.data;

  // Production hardening — these checks are fatal so misconfigured
  // deployments fail loudly at startup rather than silently at runtime.
  if (env.NODE_ENV === 'production') {
    const INSECURE_DEFAULTS = ['dev-secret-change-me', 'local-dev-secret-change-in-production', 'change-me'];
    if (INSECURE_DEFAULTS.includes(env.JWT_SECRET)) {
      console.error('[blimp-server] FATAL: JWT_SECRET must not be a default value in production');
      process.exit(1);
    }
    if (env.JWT_SECRET.length < 32) {
      console.error('[blimp-server] FATAL: JWT_SECRET must be at least 32 characters in production');
      process.exit(1);
    }
    if (!process.env.DATABASE_URL) {
      console.error('[blimp-server] FATAL: DATABASE_URL is required in production');
      process.exit(1);
    }
  }

  return env;
}

const env = loadConfig();

export const config = {
  port: env.PORT,
  corsOrigin: env.CORS_ORIGIN,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  db: {
    url: env.DATABASE_URL,
  },
} as const;
