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
    if (!isSignedIn) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true); setError(null);

    (async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [hRes, sRes, wRes] = await Promise.all([
          fetch(`${PORTAL_URL}/api/portfolio/health`, { headers }),
          fetch(`${PORTAL_URL}/api/portfolio/suggestions`, { headers }),
          fetch(`${PORTAL_URL}/api/portfolio/watchlist`, { headers }),
        ]);
        if (!cancelled) {
          if (hRes.ok) setHealth(await hRes.json());
          if (sRes.ok) setSuggestions(await sRes.json());
          if (wRes.ok) setWatchlist(await wRes.json());
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
    const res = await fetch(`${PORTAL_URL}/api/portfolio/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticker }),
    });
    if (res.ok) setTick(t => t + 1);
  }, [getToken]);

  const removeFromWatchlist = useCallback(async (ticker: string) => {
    const token = await getToken();
    const res = await fetch(`${PORTAL_URL}/api/portfolio/watchlist/${ticker}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setWatchlist(w => w.filter(i => i.ticker !== ticker));
  }, [getToken]);

  return { health, suggestions, watchlist, isLoading, error, refetch: () => setTick(t => t + 1), addToWatchlist, removeFromWatchlist };
}
