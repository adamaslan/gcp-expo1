import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useAuth } from '@clerk/clerk-expo';
import { isAllowed } from './shared/consent';
import { getConsent, loadConsent, onConsentChange, useConsent } from './consent-store';
import {
  clearAttributionState,
  persistFirstTouch,
  reportFirstTouch,
  touchFromUrl,
} from './attribution-capture';
import type { AttributionTouch } from './shared/attribution';

/**
 * Mount once at the app root. Default deny: nothing is persisted or sent until
 * consent has loaded and grants `analytics`; revoking it deletes the persisted
 * and in-memory touch. See lib/attribution-capture.ts for limits.
 */
export function useAttributionCapture(): void {
  const { getToken, isSignedIn } = useAuth();
  const { consent, loaded } = useConsent();
  const pending = useRef<AttributionTouch | null>(null);
  const getTokenRef = useRef(getToken);
  const signedInRef = useRef(isSignedIn);
  const inflight = useRef(false);
  getTokenRef.current = getToken;
  signedInRef.current = isSignedIn;

  // Same gates as the effect below; idempotent (inflight guard + server-side sent flag).
  const attemptReport = useRef(async () => {
    if (inflight.current || !signedInRef.current || !isAllowed(getConsent(), 'analytics')) return;
    inflight.current = true;
    try {
      await reportFirstTouch(() => getTokenRef.current());
    } finally {
      inflight.current = false;
    }
  }).current;

  useEffect(() => {
    let cancelled = false;
    const flush = async () => {
      await loadConsent();
      if (cancelled || !pending.current || !isAllowed(getConsent(), 'analytics')) return;
      const touch = pending.current;
      pending.current = null;
      await persistFirstTouch(touch);
      if (!cancelled) await attemptReport();
    };
    const handle = async (url: string | null) => {
      const touch = touchFromUrl(url);
      if (!touch || cancelled) return;
      if (!pending.current) pending.current = touch;
      await flush();
    };
    void Linking.getInitialURL().then(handle).catch(() => undefined);
    const sub = Linking.addEventListener('url', (e) => void handle(e.url));
    const unsubscribe = onConsentChange((record) => {
      // record === null is the store's transient "saving" state, not a revocation.
      if (record && !isAllowed(record, 'analytics')) {
        pending.current = null;
        void clearAttributionState();
        return;
      }
      void flush();
    });
    return () => {
      cancelled = true;
      sub.remove();
      unsubscribe();
    };
  }, [attemptReport]);

  // Consent resolved denied: drop anything persisted under an earlier grant.
  // Consent granted + signed in: report whatever is already stored.
  useEffect(() => {
    if (!loaded) return;
    if (consent && !isAllowed(consent, 'analytics')) {
      pending.current = null;
      void clearAttributionState();
      return;
    }
    if (isSignedIn) void attemptReport();
  }, [loaded, isSignedIn, consent, attemptReport]);
}
