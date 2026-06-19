import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import type { StreakState } from './retention';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

interface StreakHookState {
  streak: StreakState | null;
  isLoading: boolean;
  recordActivity: () => Promise<void>;
}

export function useStreak(): StreakHookState {
  const { getToken, isSignedIn } = useAuth();
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) { setIsLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${PORTAL_URL}/api/retention/streak`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) setStreak(await res.json());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  const recordActivity = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${PORTAL_URL}/api/retention/streak`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setStreak(await res.json());
  }, [getToken]);

  return { streak, isLoading, recordActivity };
}
