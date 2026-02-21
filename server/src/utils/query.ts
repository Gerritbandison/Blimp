/**
 * Safely extract a single string from an Express query/params value.
 * Express 5 params and query values can be string | string[] | ParsedQs | ParsedQs[].
 */
export function qstr(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export function qint(value: unknown, fallback: number): number {
  const s = qstr(value);
  if (!s) return fallback;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? fallback : n;
}

/** Extract a route param as a guaranteed string (Express 5 safety). */
export function param(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? '';
  return '';
}
