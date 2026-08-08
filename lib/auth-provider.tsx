import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from './secure-storage';
import { useAuth as useClerkAuth, useUser, useSession } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { SESSION_CACHE_KEY, TOKEN_CACHE_KEY } from './auth-constants';

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean | null;
  userId: string | null;
  userEmail: string | null;
  sessionToken: string | null;
  signOut: () => Promise<void>;
  retry: (fn: () => Promise<void>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, sessionId, signOut: clerkSignOut } = useClerkAuth();
  const { user } = useUser();
  const { session } = useSession();
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const prevSessionStatus = useRef<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        const cachedToken = await SecureStore.getItemAsync(TOKEN_CACHE_KEY);
        if (cachedToken) {
          setSessionToken(cachedToken);
        }

        if (sessionId) {
          await SecureStore.setItemAsync(SESSION_CACHE_KEY, JSON.stringify({ sessionId, timestamp: Date.now() }));
        }
      } catch (err) {
        console.warn('Failed to initialize auth cache:', err);
      } finally {
        setIsInitialized(true);
      }
    }

    initialize();
  }, [sessionId]);

  // Refresh the short-lived JWT and persist it whenever the Clerk session changes.
  useEffect(() => {
    if (!session) {
      setSessionToken(null);
      SecureStore.deleteItemAsync(TOKEN_CACHE_KEY).catch(() => {});
      return;
    }

    async function refreshToken() {
      try {
        const token = await session!.getToken();
        if (token) {
          setSessionToken(token);
          await SecureStore.setItemAsync(TOKEN_CACHE_KEY, token);
        }
      } catch (err) {
        console.warn('Failed to refresh session token:', err);
      }
    }

    refreshToken();
  }, [session]);

  // Detect session expiry: when status transitions away from 'active', clear cache and redirect.
  useEffect(() => {
    const currentStatus = session?.status ?? null;
    const prev = prevSessionStatus.current;

    if (prev === 'active' && currentStatus !== 'active') {
      SecureStore.deleteItemAsync(SESSION_CACHE_KEY).catch(() => {});
      SecureStore.deleteItemAsync(TOKEN_CACHE_KEY).catch(() => {});
      setSessionToken(null);
      router.replace('/sign-in');
    }

    prevSessionStatus.current = currentStatus;
  }, [session?.status]);

  // Re-validate on app foreground to catch expiry before the next API call.
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState !== 'active' || !session) return;
      try {
        const token = await session.getToken();
        if (token) {
          setSessionToken(token);
          await SecureStore.setItemAsync(TOKEN_CACHE_KEY, token);
        }
      } catch {
        // Token fetch failed — session may be expired; the status effect above will catch it.
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [session]);

  async function signOut() {
    try {
      await clerkSignOut();
    } finally {
      await Promise.allSettled([
        SecureStore.deleteItemAsync(SESSION_CACHE_KEY),
        SecureStore.deleteItemAsync(TOKEN_CACHE_KEY),
      ]);
      setSessionToken(null);
    }
  }

  async function retry(fn: () => Promise<void>) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await fn();
        return;
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  const value: AuthContextType = {
    isLoaded: isLoaded && isInitialized,
    isSignedIn: isSignedIn ?? null,
    userId: user?.id || null,
    userEmail: user?.emailAddresses?.[0]?.emailAddress || null,
    sessionToken,
    signOut,
    retry,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
