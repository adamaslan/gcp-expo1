import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { adaptLiveSignals, type DigestPayload } from './digest';

const GCP3_URL = process.env.EXPO_PUBLIC_GCP3_URL ?? 'https://gcp3-backend-cif7ppahzq-uc.a.run.app';

// Last successfully-fetched digest, kept for the life of the app process — a
// fetch failure falls back to this instead of showing a blank error screen
// (graceful degradation, mirroring the portal's globalDigestCache fallback;
// signal-multiplication-analysis.md pillar 6). Does not persist across app
// restarts — that would need AsyncStorage, out of scope for this fallback.
let lastGoodDigest: DigestPayload | null = null;

interface DigestState {
  digest: (DigestPayload & { degraded?: boolean }) | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDigest(): DigestState {
  const { isSignedIn } = useAuth();
  const [digest, setDigest] = useState<(DigestPayload & { degraded?: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isSignedIn) {
      setIsLoading(false);
      setDigest(null);
      setError(null);
      // Clear the in-process fallback cache on sign-out — otherwise a
      // subsequent fetch failure for a *different* signed-in user could
      // fall back to the previous user's cached digest.
      lastGoodDigest = null;
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
        lastGoodDigest = data;
        if (!cancelled) setDigest(data);
      } catch (err) {
        if (cancelled) return;
        if (lastGoodDigest) {
          setDigest({ ...lastGoodDigest, degraded: true });
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load signals');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn, tick]);

  return { digest, isLoading, error, refetch: () => setTick(t => t + 1) };
}
