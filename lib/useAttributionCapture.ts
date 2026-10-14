import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useAuth } from '@clerk/clerk-expo';
import { isAllowed } from './shared/consent';
import { getConsent, loadConsent, onConsentChange, useConsent } from './consent-store';
import { persistFirstTouch, reportFirstTouch, touchFromUrl } from './attribution-capture';
import type { AttributionTouch } from './shared/attribution';

/**
 * Mount once at the app root. Default deny: nothing is persisted or sent until
 * consent has loaded and grants `analytics`. See lib/attribution-capture.ts for limits.
 */
export function useAttributionCapture(): void {
  const { getToken, isSignedIn } = useAuth();
  const { consent, loaded } = useConsent();
  const pending = useRef<AttributionTouch | null>(null);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // Collect launch + runtime URLs into memory only; persistence waits for consent.
  useEffect(() => {
    let cancelled = false;
    const handle = async (url: string | null) => {
      const touch = touchFromUrl(url);
      if (!touch || cancelled) return;
      if (!pending.current) pending.current = touch;
      await flush();
    };
    const flush = async () => {
      await loadConsent();
      if (cancelled || !pending.current || !isAllowed(getConsent(), 'analytics')) return;
      const touch = pending.current;
      pending.current = null;
      await persistFirstTouch(touch);
    };
    void Linking.getInitialURL().then(handle).catch(() => undefined);
    const sub = Linking.addEventListener('url', (e) => void handle(e.url));
    const unsubscribe = onConsentChange(() => void flush());
    return () => {
      cancelled = true;
      sub.remove();
      unsubscribe();
    };
  }, []);

  // Report once when signed in AND consent granted.
  useEffect(() => {
    if (!loaded || !isSignedIn || !isAllowed(consent, 'analytics')) return;
    void reportFirstTouch(() => getTokenRef.current(), consent);
  }, [loaded, isSignedIn, consent]);
}
