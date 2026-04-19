import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { ClerkProvider } from '@clerk/clerk-expo';
import { AuthProvider } from '@/lib/auth-provider';
import * as SecureStore from 'expo-secure-store';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable');
}

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log('No values stored under key: ' + key);
      }
      return item;
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

function AppContent() {
  const [clerkStatus, setClerkStatus] = useState('checking...');

  useEffect(() => {
    if (publishableKey) {
      setClerkStatus('✅ Clerk credentials loaded');
    } else {
      setClerkStatus('❌ Missing Clerk publishable key');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Phase 3: Auth Integration</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Clerk Configuration</Text>
          <Text style={styles.status}>{clerkStatus}</Text>
          {publishableKey && (
            <Text style={styles.detail}>Key: {publishableKey.substring(0, 20)}...</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Auth Components</Text>
          <Text style={styles.envVar}>✓ Sign-In Screen</Text>
          <Text style={styles.envVar}>✓ Sign-Up Screen</Text>
          <Text style={styles.envVar}>✓ Two-Factor Auth</Text>
          <Text style={styles.envVar}>✓ Auth Provider</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resilience Features</Text>
          <Text style={styles.envVar}>✓ Retry with exponential backoff</Text>
          <Text style={styles.envVar}>✓ Rate limiting</Text>
          <Text style={styles.envVar}>✓ Session caching</Text>
          <Text style={styles.envVar}>✓ Structured logging</Text>
        </View>

        <Text style={styles.version}>v1.0.0 - Phase 3 Complete</Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detail: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  envVar: {
    fontSize: 13,
    color: '#666',
    marginVertical: 4,
  },
  note: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  version: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
});
