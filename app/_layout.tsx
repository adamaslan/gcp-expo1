import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider } from '@/lib/auth-provider';
import { validateConfig } from '@/lib/config-validator';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
}

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
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

function AuthGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inAuthFlow = segments[0] === 'sign-in' || segments[0] === 'sign-up' || segments[0] === 'sign-in-2fa';

    if (!isSignedIn && inTabsGroup) {
      router.replace('/sign-in');
    } else if (isSignedIn && inAuthFlow) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, segments]);

  return <Slot />;
}

function ConfigErrorScreen({ errors }: { errors: string[] }) {
  return (
    <SafeAreaView style={styles.errorShell}>
      <ScrollView contentContainerStyle={styles.errorContent}>
        <Text style={styles.errorTitle}>Configuration Error</Text>
        <Text style={styles.errorSubtitle}>
          The app cannot start — required environment variables are missing.
        </Text>
        {errors.map((err, i) => (
          <View key={i} style={styles.errorRow}>
            <Text style={styles.errorBullet}>•</Text>
            <Text style={styles.errorMsg}>{err}</Text>
          </View>
        ))}
        <Text style={styles.errorHint}>
          Set these in .env.local and restart the dev server.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function RootLayout() {
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
          <AuthGuard />
        </AuthProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorShell: { flex: 1, backgroundColor: '#0f0f0f' },
  errorContent: { flexGrow: 1, padding: 24, paddingTop: 60 },
  errorTitle: { fontSize: 22, fontWeight: '800', color: '#f43f5e', marginBottom: 8 },
  errorSubtitle: { fontSize: 14, color: '#aaa', marginBottom: 20, lineHeight: 20 },
  errorRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  errorBullet: { color: '#f43f5e', fontSize: 14 },
  errorMsg: { color: '#fff', fontSize: 13, flex: 1, lineHeight: 19 },
  errorHint: { marginTop: 24, fontSize: 12, color: '#666', lineHeight: 18 },
});
