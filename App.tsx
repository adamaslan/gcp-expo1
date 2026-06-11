import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { AuthProvider } from './lib/auth-provider';
import * as SecureStore from './lib/secure-storage';
import BriefingScreen from './screens/BriefingScreen';
import HoldFoldScreen from './screens/HoldFoldScreen';
import ChatScreen from './screens/ChatScreen';
import SignInScreen from './screens/SignInScreen';
import TabBar, { type TabKey } from './components/TabBar';
import { theme } from './lib/ui/theme';
import { validateConfig } from './lib/config-validator';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable');
}

const SESSION_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour hard cap
const SESSION_STARTED_KEY = 'session_started_at';

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStore error: ', error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Failed to save token:', err);
    }
  },
};

function AppRoot() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const [tab, setTab] = useState<TabKey>('briefing');
  const [sessionExpired, setSessionExpired] = useState(false);
  const insets = useSafeAreaInsets();

  // Track sign-in timestamp and enforce a 1-hour hard cap. Defense-in-depth
  // alongside Clerk Dashboard session-lifetime config (see PRODUCTION_CLERK.md).
  useEffect(() => {
    if (!isSignedIn) {
      setSessionExpired(false);
      SecureStore.deleteItemAsync(SESSION_STARTED_KEY).catch(() => {});
      return;
    }

    let cancelled = false;

    async function ensureSessionTimestamp() {
      const existing = await SecureStore.getItemAsync(SESSION_STARTED_KEY);
      if (!existing) {
        await SecureStore.setItemAsync(SESSION_STARTED_KEY, String(Date.now()));
      }
    }
    ensureSessionTimestamp();

    async function checkExpiry() {
      if (cancelled) return;
      const startedRaw = await SecureStore.getItemAsync(SESSION_STARTED_KEY);
      if (!startedRaw) return;
      const started = parseInt(startedRaw, 10);
      if (Number.isFinite(started) && Date.now() - started > SESSION_MAX_AGE_MS) {
        setSessionExpired(true);
        await SecureStore.deleteItemAsync(SESSION_STARTED_KEY);
        try {
          await signOut();
        } catch (err) {
          console.warn('Sign-out on expiry failed:', err);
        }
      }
    }

    checkExpiry();
    const interval = setInterval(checkExpiry, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isSignedIn, signOut]);

  if (!isLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={theme.accent.indigo} />
      </View>
    );
  }

  const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

  if (!isSignedIn && !demoMode) {
    return (
      <View style={styles.shell}>
        {sessionExpired && (
          <View style={[styles.expiryBanner, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.expiryText}>Session expired after 1 hour — please sign in again.</Text>
          </View>
        )}
        <SignInScreen />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.screenWrap}>
        {tab === 'briefing' && <BriefingScreen />}
        {tab === 'trade' && <HoldFoldScreen />}
        {tab === 'chat' && <ChatScreen />}
      </View>
      <TabBar active={tab} onChange={setTab} />
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

function ConfigErrorScreen({ errors }: { errors: string[] }) {
  return (
    <SafeAreaView style={styles.configErrorShell}>
      <ScrollView contentContainerStyle={styles.configErrorContent}>
        <Text style={styles.configErrorTitle}>Configuration Error</Text>
        <Text style={styles.configErrorSubtitle}>
          The app cannot start because required environment variables are missing.
        </Text>
        {errors.map((err, i) => (
          <View key={i} style={styles.configErrorRow}>
            <Text style={styles.configErrorBullet}>•</Text>
            <Text style={styles.configErrorMsg}>{err}</Text>
          </View>
        ))}
        <Text style={styles.configErrorHint}>
          Set these variables in .env.local and restart the dev server.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const configResult = validateConfig();

  if (!configResult.isValid) {
    return (
      <SafeAreaProvider>
        <ConfigErrorScreen errors={configResult.errors} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <AuthProvider>
          <AppRoot />
        </AuthProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  screenWrap: {
    flex: 1,
  },
  splash: {
    flex: 1,
    backgroundColor: theme.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  splashTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text.primary,
  },
  splashSubtitle: {
    fontSize: 13,
    color: theme.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  expiryBanner: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251,191,36,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  expiryText: {
    color: theme.accent.yellow,
    fontSize: 12,
    textAlign: 'center',
  },
  configErrorShell: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  configErrorContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  configErrorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f43f5e',
    marginBottom: 8,
  },
  configErrorSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 20,
    lineHeight: 20,
  },
  configErrorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  configErrorBullet: {
    color: '#f43f5e',
    fontSize: 14,
  },
  configErrorMsg: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  configErrorHint: {
    marginTop: 24,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
