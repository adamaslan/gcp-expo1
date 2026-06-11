import { useEffect } from 'react';
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

export default function RootLayout() {
  const configResult = validateConfig();

  if (!configResult.isValid) {
    // Config errors are rendered in App.tsx before ClerkProvider mounts.
    // This guard prevents a white screen if _layout is loaded directly.
    return null;
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
