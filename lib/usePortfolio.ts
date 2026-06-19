import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import type { PortfolioHealth, OptimizerSuggestion, WatchlistItem } from './portfolio';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

interface PortfolioState {
  health: PortfolioHealth | null;
  suggestions: OptimizerSuggestion[];
  watchlist: WatchlistItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  addToWatchlist: (ticker: string) => Promise<void>;
  removeFromWatchlist: (ticker: string) => Promise<void>;
}

export function usePortfolio(): PortfolioState {
  const { getToken, isSignedIn } = useAuth();
  const [health, setHealth] = useState<PortfolioHealth | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizerSuggestion[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isSignedIn) {
      // Clear previous user's data on sign-out to prevent privacy leaks.
      setHealth(null);
      setSuggestions([]);
      setWatchlist([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('No auth token');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch all three in parallel, then parse JSON in parallel too.
        const [hRes, sRes, wRes] = await Promise.all([
          fetch(`${PORTAL_URL}/api/portfolio/health`, { headers }),
          fetch(`${PORTAL_URL}/api/portfolio/suggestions`, { headers }),
          fetch(`${PORTAL_URL}/api/portfolio/watchlist`, { headers }),
        ]);

        const [hData, sData, wData] = await Promise.all([
          hRes.ok ? hRes.json() : Promise.resolve(null),
          sRes.ok ? sRes.json() : Promise.resolve([]),
          wRes.ok ? wRes.json() : Promise.resolve([]),
        ]);

        if (!cancelled) {
          if (hData) setHealth(hData);
          setSuggestions(Array.isArray(sData) ? sData : []);
          setWatchlist(Array.isArray(wData) ? wData : []);

          // Surface any fetch errors.
          if (!hRes.ok && !sRes.ok && !wRes.ok) {
            setError('Failed to load portfolio data');
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load portfolio');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn, getToken, tick]);

  const addToWatchlist = useCallback(async (ticker: string) => {
    const token = await getToken();
    if (!token) throw new Error('No auth token');
    const res = await fetch(`${PORTAL_URL}/api/portfolio/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticker }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as Record<string, string>).error ?? `HTTP ${res.status}`);
    }
    setTick(t => t + 1);
  }, [getToken]);

  const removeFromWatchlist = useCallback(async (ticker: string) => {
    // Optimistic update: remove immediately, roll back on failure.
    const previous = watchlist;
    setWatchlist(w => w.filter(i => i.ticker !== ticker));
    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');
      const res = await fetch(`${PORTAL_URL}/api/portfolio/watchlist/${ticker}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      setWatchlist(previous); // Roll back on failure.
      throw err;
    }
  }, [getToken, watchlist]);

  return { health, suggestions, watchlist, isLoading, error, refetch: () => setTick(t => t + 1), addToWatchlist, removeFromWatchlist };
}
