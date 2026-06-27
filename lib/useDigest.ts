import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { adaptLiveSignals, type DigestPayload } from './digest';

const GCP3_URL = process.env.EXPO_PUBLIC_GCP3_URL ?? 'https://gcp3-backend-cif7ppahzq-uc.a.run.app';

interface DigestState {
  digest: DigestPayload | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDigest(): DigestState {
  const { isSignedIn } = useAuth();
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
        const res = await fetch(`${GCP3_URL}/signals`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const data = adaptLiveSignals(raw);
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
