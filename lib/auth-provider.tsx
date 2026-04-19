import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean | null;
  userId: string | null;
  userEmail: string | null;
  sessionToken: string | null;
  retry: (fn: () => Promise<void>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_CACHE_KEY = 'auth_session_cache';
const TOKEN_CACHE_KEY = 'auth_token_cache';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user, sessionId } = useClerkAuth();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        // Try to restore cached session
        const cachedToken = await SecureStore.getItemAsync(TOKEN_CACHE_KEY);
        if (cachedToken) {
          setSessionToken(cachedToken);
        }

        // Cache current session when available
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
    isSignedIn,
    userId: user?.id || null,
    userEmail: user?.emailAddresses?.[0]?.emailAddress || null,
    sessionToken,
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
