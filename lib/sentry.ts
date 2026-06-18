/**
 * Sentry crash reporting — lazy-loaded so the app runs without the native
 * module in CI or web bundles. Call initSentry() once in App.tsx.
 *
 * Install: npx expo install @sentry/react-native
 * Required env: EXPO_PUBLIC_SENTRY_DSN
 */

let _ready = false;

export function initSentry(): void {
  if (_ready) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn('[sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting disabled');
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn,
      environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
      tracesSampleRate: 0.1,
      // Source maps require release tagging — set via EAS build env.
      release: process.env.EXPO_PUBLIC_RELEASE,
    });
    _ready = true;
  } catch {
    console.warn('[sentry] @sentry/react-native not installed');
  }
}

// Only return the Sentry module if init succeeded — prevents calling uninitialised SDK.
function getSentry() {
  if (!_ready) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native');
  } catch {
    return null;
  }
}

export function captureException(err: unknown, extra?: Record<string, unknown>): void {
  const S = getSentry();
  if (S) S.captureException(err, { extra });
  else console.error('[sentry]', err, extra);
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  const S = getSentry();
  if (S) S.captureMessage(msg, level);
  else console.warn('[sentry]', level, msg);
}

export function setSentryUser(id: string, email?: string): void {
  getSentry()?.setUser({ id, email });
}

export function clearSentryUser(): void {
  getSentry()?.setUser(null);
}
