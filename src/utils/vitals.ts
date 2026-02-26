import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

type VitalsReporter = (metric: Metric) => void;

/**
 * Reports Core Web Vitals to the configured endpoint.
 *
 * In production, sends metrics as JSON beacons to a custom analytics endpoint
 * set via VITE_VITALS_ENDPOINT.
 *
 * In development, logs to console for debugging.
 */
export function reportWebVitals(onReport?: VitalsReporter) {
  const reporter: VitalsReporter = onReport ?? defaultReporter;

  onCLS(reporter);
  onINP(reporter);
  onLCP(reporter);
  onFCP(reporter);
  onTTFB(reporter);
}

function defaultReporter(metric: Metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,    // 'good' | 'needs-improvement' | 'poor'
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now(),
  };

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[web-vitals]', metric.name, metric.value.toFixed(1), metric.rating);
    return;
  }

  const endpoint = import.meta.env.VITE_VITALS_ENDPOINT;
  if (!endpoint) return;

  // Use sendBeacon for reliability (doesn't block unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, JSON.stringify(body));
  } else {
    fetch(endpoint, { method: 'POST', body: JSON.stringify(body), keepalive: true });
  }
}
