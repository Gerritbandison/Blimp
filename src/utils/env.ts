/**
 * Frontend environment variable validation.
 *
 * Validates VITE_* env vars at startup and logs warnings for missing
 * or misconfigured values. Does not throw — the app will still boot,
 * but operators get clear console warnings.
 */

interface EnvVar {
  key: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
}

const ENV_VARS: EnvVar[] = [
  {
    key: 'VITE_API_BASE_URL',
    required: false,
    description: 'Backend API URL (e.g. http://localhost:4000). When unset, the app runs in demo/offline mode.',
    validate: (v) => v.startsWith('http://') || v.startsWith('https://'),
  },
  {
    key: 'VITE_DEMO_MODE',
    required: false,
    description: 'Set to "true" to enable demo login credentials.',
  },
  {
    key: 'VITE_APP_NAME',
    required: false,
    description: 'Application display name (default: Blimp).',
  },
  {
    key: 'VITE_AGENT_PORT',
    required: false,
    description: 'Blimp agent listener port (default: 51723).',
    validate: (v) => /^\d+$/.test(v) && Number(v) > 0 && Number(v) < 65536,
  },
  {
    key: 'VITE_VITALS_ENDPOINT',
    required: false,
    description: 'URL to send Core Web Vitals RUM data (e.g. /api/vitals).',
    validate: (v) => v.startsWith('/') || v.startsWith('http'),
  },
];

export function validateEnv(): void {
  if (import.meta.env.PROD) {
    const warnings: string[] = [];

    for (const envVar of ENV_VARS) {
      const value = import.meta.env[envVar.key] as string | undefined;

      if (!value && envVar.required) {
        warnings.push(`Missing required env var: ${envVar.key} — ${envVar.description}`);
      }

      if (value && envVar.validate && !envVar.validate(value)) {
        warnings.push(`Invalid value for ${envVar.key}="${value}" — ${envVar.description}`);
      }
    }

    if (!import.meta.env.VITE_API_BASE_URL) {
      warnings.push('VITE_API_BASE_URL is not set — running in demo/offline mode. Set it to connect to the backend API.');
    }

    if (warnings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Blimp] Environment validation warnings:\n${warnings.map((w) => `  • ${w}`).join('\n')}`
      );
    }
  }
}
