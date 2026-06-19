import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import type { StreakState } from './retention';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL;
const FETCH_TIMEOUT_MS = 10_000;

interface StreakHookState {
  streak: StreakState | null;
  isLoading: boolean;
  recordActivity: () => Promise<void>;
}

async function fetchStreak(token: string, method: 'GET' | 'POST'): Promise<StreakState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${PORTAL_URL}/api/retention/streak`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function useStreak(): StreakHookState {
  const { getToken, isSignedIn } = useAuth();
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      setStreak(null);    // clear prior-user state
      setIsLoading(false);
      return;
    }
    if (!PORTAL_URL) {
      console.warn('[useStreak] EXPO_PUBLIC_PORTAL_URL not set');
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const data = await fetchStreak(token, 'GET');
        if (!cancelled) setStreak(data);
      } catch (err) {
        console.warn('[useStreak] fetch failed', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  const recordActivity = useCallback(async () => {
    if (!PORTAL_URL) return;
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchStreak(token, 'POST');
      setStreak(data);
    } catch (err) {
      console.warn('[useStreak] recordActivity failed', err);
    }
  }, [getToken]);

  return { streak, isLoading, recordActivity };
}
