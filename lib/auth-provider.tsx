import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from './secure-storage';
import { useAuth as useClerkAuth, useUser, useSession } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { SESSION_CACHE_KEY, TOKEN_CACHE_KEY } from './auth-constants';
import { readPendingSignOutFlag, writePendingSignOutFlag } from './pending-signout-flag';

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean | null;
  userId: string | null;
  userEmail: string | null;
  sessionToken: string | null;
  signOut: () => Promise<void>;
  /**
   * True once account erasure succeeded but sign-out failed. Lives here (not in a
   * screen) so it survives dismissing/remounting the privacy modal; cleared only
   * when signOut succeeds.
   */
  accountDeletedPendingSignOut: boolean;
  /** Resolves once persistence has been attempted; the in-memory block applies immediately. */
  setAccountDeletedPendingSignOut: (pending: boolean) => Promise<void>;
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
  const [accountDeletedPendingSignOut, setPendingState] = useState(false);
  // Unknown until the persisted flag is read; keeps the signed-in shell from flashing.
  const [pendingFlagLoaded, setPendingFlagLoaded] = useState(false);

  const pendingRef = useRef(false);
  const flagPersisted = useRef(false);

  async function persistFlag(pending: boolean): Promise<void> {
    try {
      await writePendingSignOutFlag(pending);
      flagPersisted.current = true;
    } catch (err) {
      // The in-memory block still holds for this session; the write is retried on the next signOut().
      flagPersisted.current = false;
      console.warn('Failed to persist deletion sign-out flag:', err);
    }
  }

  async function setAccountDeletedPendingSignOut(pending: boolean): Promise<void> {
    pendingRef.current = pending;
    setPendingState(pending); // block THIS session immediately, before persistence resolves
    await persistFlag(pending);
  }

  useEffect(() => {
    readPendingSignOutFlag()
      .then((value) => {
        pendingRef.current = value;
        flagPersisted.current = value;
        setPendingState(value);
      })
      .catch((err) => {
        // Read FAILURE is deliberately treated as "not pending". Trapping a normal user whose
        // storage is flaky is worse: the portal deletes the Clerk user last, so a retained
        // session of a deleted account is already invalid server-side and every API call 401s.
        console.warn('Failed to read deletion sign-out flag; treating as not pending:', err);
      })
      .finally(() => setPendingFlagLoaded(true));
  }, []);
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
    // Retry pressed after a failed persist: try to record the flag again before signing out.
    if (pendingRef.current && !flagPersisted.current) await persistFlag(true);
    try {
      await clerkSignOut();
      await setAccountDeletedPendingSignOut(false);
    } finally {
      // If Clerk's signOut throws after an account deletion, the Clerk session is
      // already invalid server-side (the portal deletes the Clerk user last, after
      // the DB cascade), so re-populated cached tokens cannot authenticate.
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
    isLoaded: isLoaded && isInitialized && pendingFlagLoaded,
    isSignedIn: isSignedIn ?? null,
    userId: user?.id || null,
    userEmail: user?.emailAddresses?.[0]?.emailAddress || null,
    sessionToken,
    signOut,
    accountDeletedPendingSignOut,
    setAccountDeletedPendingSignOut,
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
