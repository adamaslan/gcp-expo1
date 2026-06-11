import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useAuthContext } from '../lib/auth-provider';
import { getMarketOverview, getMacroPulse, type MarketOverview, type MacroPulse } from '../lib/clients/gcp3';

type LoadState<T> = { status: 'idle' } | { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; message: string };

function useFetch<T>(fetcher: () => Promise<T>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: 'idle' });

  useEffect(() => {
    setState({ status: 'loading' });
    fetcher()
      .then((data) => setState({ status: 'ok', data }))
      .catch((err) => setState({ status: 'error', message: err instanceof Error ? err.message : String(err) }));
  }, []);

  return state;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    bullish: { bg: '#e8f5e9', text: '#2e7d32' },
    bearish: { bg: '#ffebee', text: '#c62828' },
    neutral: { bg: '#f5f5f5', text: '#616161' },
  };
  const c = colors[sentiment] ?? colors.neutral;
  return (
    <Text style={[styles.badge, { backgroundColor: c.bg, color: c.text }]}>
      {sentiment.toUpperCase()}
    </Text>
  );
}

export default function HomeScreen() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuthContext();

  const overviewState = useFetch(getMarketOverview);
  const macroState = useFetch(getMacroPulse);

  if (!isLoaded || !user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Market Dashboard</Text>

      {/* Market Overview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Market Overview</Text>
        {overviewState.status === 'loading' && <ActivityIndicator size="small" color="#1976d2" />}
        {overviewState.status === 'error' && (
          <Text style={styles.errorText}>{overviewState.message}</Text>
        )}
        {overviewState.status === 'ok' && (
          <>
            <Text style={styles.statusLine}>Status: {overviewState.data.market_status ?? '—'}</Text>
            {overviewState.data.sp500 != null && (
              <Text style={styles.metricLine}>S&P 500: {overviewState.data.sp500.toLocaleString()}</Text>
            )}
            {overviewState.data.nasdaq != null && (
              <Text style={styles.metricLine}>NASDAQ: {overviewState.data.nasdaq.toLocaleString()}</Text>
            )}
            {overviewState.data.vix != null && (
              <Text style={styles.metricLine}>VIX: {overviewState.data.vix.toFixed(2)}</Text>
            )}
            {overviewState.data.summary && (
              <Text style={styles.summary}>{overviewState.data.summary}</Text>
            )}
          </>
        )}
      </View>

      {/* Macro Pulse */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Macro Pulse</Text>
        {macroState.status === 'loading' && <ActivityIndicator size="small" color="#1976d2" />}
        {macroState.status === 'error' && (
          <Text style={styles.errorText}>{macroState.message}</Text>
        )}
        {macroState.status === 'ok' && (
          <>
            <SentimentBadge sentiment={macroState.data.sentiment} />
            {macroState.data.score != null && (
              <Text style={styles.metricLine}>Score: {macroState.data.score}</Text>
            )}
            {macroState.data.summary && (
              <Text style={styles.summary}>{macroState.data.summary}</Text>
            )}
            {macroState.data.updated_at && (
              <Text style={styles.timestamp}>Updated: {new Date(macroState.data.updated_at).toLocaleString()}</Text>
            )}
          </>
        )}
      </View>

      {/* User card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user.primaryEmailAddress?.emailAddress}</Text>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user.firstName} {user.lastName}</Text>
      </View>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  statusLine: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  metricLine: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  summary: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    lineHeight: 19,
  },
  timestamp: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
  },
  label: {
    fontSize: 11,
    color: '#999',
    marginTop: 10,
    marginBottom: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  signOutButton: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
