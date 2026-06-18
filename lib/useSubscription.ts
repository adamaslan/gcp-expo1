import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import type { SubscriptionState, Feature } from './subscription';
import { DEFAULT_SUBSCRIPTION_STATE, hasEntitlement } from './subscription';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

/**
 * Fetches the current user's subscription state from the portal API.
 * Drives from Clerk's `trial_end` server-side, so state survives reinstalls.
 */
export function useSubscription(): SubscriptionState {
  const { getToken, isSignedIn } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    ...DEFAULT_SUBSCRIPTION_STATE,
    isLoading: true,
  });

  useEffect(() => {
    if (!isSignedIn) {
      setState({ ...DEFAULT_SUBSCRIPTION_STATE, isLoading: false });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${PORTAL_URL}/api/stripe/subscription`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SubscriptionState = await res.json();
        if (!cancelled) setState({ ...data, isLoading: false });
      } catch (err) {
        console.error('useSubscription fetch error', err);
        if (!cancelled) setState({ ...DEFAULT_SUBSCRIPTION_STATE, isLoading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  return state;
}

/**
 * Convenience hook — returns a pre-bound entitlement checker for the current user.
 */
export function useEntitlement() {
  const { tier } = useSubscription();
  return (feature: Feature) => hasEntitlement(feature, tier);
}
