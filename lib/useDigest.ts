import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import type { DigestPayload } from './digest';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

interface DigestState {
  digest: DigestPayload | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDigest(): DigestState {
  const { getToken, isSignedIn } = useAuth();
  const [digest, setDigest] = useState<DigestPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${PORTAL_URL}/api/signals/digest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DigestPayload = await res.json();
        if (!cancelled) setDigest(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load signals');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn, getToken, tick]);

  return { digest, isLoading, error, refetch: () => setTick(t => t + 1) };
}
