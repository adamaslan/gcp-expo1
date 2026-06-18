/**
 * Analytics event definitions — single-sourced for app and web.
 * Standardized names and properties so app and web report into one funnel.
 *
 * Usage:
 *   import { track } from 'lib/analytics';
 *   track('signup', { method: 'google' });
 *
 * Backend: wire to PostHog or Amplitude by implementing the `_send` function.
 * EXPO_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_KEY selects the project.
 */

export type AnalyticsEvent =
  | { name: 'signup';             props: { method: 'email' | 'google' | 'apple' } }
  | { name: 'account_connected';  props: { provider: 'schwab' | 'other' } }
  | { name: 'first_value';        props: { feature: 'signal' | 'score' | 'briefing' } }
  | { name: 'paywall_view';       props: { source: string } }
  | { name: 'checkout_started';   props: { plan: 'monthly' | 'annual' } }
  | { name: 'subscribe';          props: { plan: 'monthly' | 'annual'; trial: boolean } }
  | { name: 'trial_started';      props: { plan: 'monthly' | 'annual' } }
  | { name: 'trial_expired';      props: Record<string, never> }
  | { name: 'cancel_started';     props: { reason?: string } }
  | { name: 'referral_sent';      props: Record<string, never> }
  | { name: 'referral_converted'; props: Record<string, never> }
  | { name: 'feedback_sent';      props: { source: 'in_app' | 'email' } };

type EventName = AnalyticsEvent['name'];
type EventProps<N extends EventName> = Extract<AnalyticsEvent, { name: N }>['props'];

// null = tried and failed/unavailable; undefined = not yet attempted
let _posthog: unknown | null = undefined;

function getPosthog() {
  if (_posthog !== undefined) return _posthog;  // return cached result (even null)
  try {
    const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
    if (!key) { _posthog = null; return null; }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostHog } = require('posthog-react-native');
    _posthog = new PostHog(key, { host: 'https://app.posthog.com' });
    return _posthog;
  } catch {
    _posthog = null;
    return null;
  }
}

/** Track an analytics event. Typed — wrong event names or missing props are compile errors. */
export function track<N extends EventName>(name: N, props: EventProps<N>): void {
  const ph = getPosthog() as { capture: (n: string, p: unknown) => void } | null;
  if (ph) {
    ph.capture(name, props);
  } else {
    // Dev fallback: log to console so events are visible without PostHog.
    console.log('[analytics]', name, props);
  }
}

/** Identify the current user for analytics. Call after sign-in. */
export function identify(userId: string, traits?: Record<string, unknown>): void {
  const ph = getPosthog() as { identify: (id: string, traits?: unknown) => void } | null;
  ph?.identify(userId, traits);
}

/** Reset identity on sign-out. */
export function reset(): void {
  const ph = getPosthog() as { reset: () => void } | null;
  ph?.reset();
}
