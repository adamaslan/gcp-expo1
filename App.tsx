import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

export default function App() {
  const [clerkStatus, setClerkStatus] = useState('checking...');
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  useEffect(() => {
    const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
    setPublishableKey(key || null);

    if (key) {
      setClerkStatus('✅ Clerk credentials loaded');
    } else {
      setClerkStatus('❌ Missing Clerk publishable key');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Phase 3: Auth Setup</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Clerk Configuration</Text>
          <Text style={styles.status}>{clerkStatus}</Text>
          {publishableKey && (
            <Text style={styles.detail}>Key: {publishableKey.substring(0, 20)}...</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Environment Variables</Text>
          <Text style={styles.envVar}>
            EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: {publishableKey ? '✓' : '✗'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign-In/Sign-Up Status</Text>
          <Text style={styles.note}>
            Components ready for integration in screens/SignInScreen.tsx and screens/HomeScreen.tsx
          </Text>
        </View>

        <Text style={styles.version}>v1.0.0 - Phase 3 Testing</Text>
      </View>
      <StatusBar style="auto" />
    </View>
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
