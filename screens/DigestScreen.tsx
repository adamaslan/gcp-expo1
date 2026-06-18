import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useDigest } from '../lib/useDigest';
import { SignalDigestCard } from '../components/SignalDigestCard';
import { StateView } from '../components/StateView';
import { useSubscription, useEntitlement } from '../lib/useSubscription';
import PaywallScreen from './PaywallScreen';

export default function DigestScreen() {
  const { digest, isLoading, error, refetch } = useDigest();
  const { isLoading: subLoading } = useSubscription();
  const entitled = useEntitlement();

  // Wait for subscription status before showing the paywall — prevents flash for pro users.
  if (subLoading) return <StateView state="loading" />;
  if (!entitled('signals_digest')) {
    return <PaywallScreen />;
  }

  if (isLoading) return <StateView state="loading" />;
  if (error) return <StateView state="error" errorMessage={error} onRetry={refetch} />;
  if (!digest || digest.signals.length === 0) {
    return (
      <StateView
        state="empty"
        emptyTitle="No signals yet"
        emptyMessage="Your first digest will appear here once your portfolio data is imported."
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text style={styles.period}>{digest.periodLabel}</Text>
        <Text style={styles.count}>{digest.signals.length} signal{digest.signals.length !== 1 ? 's' : ''}</Text>
      </View>
      {digest.signals.map(sig => (
        <SignalDigestCard key={sig.id} signal={sig} />
      ))}
      <Text style={styles.disclaimer}>
        Signals are informational only and are not personalised financial advice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  period: { fontSize: 17, fontWeight: '700', color: '#111' },
  count: { fontSize: 13, color: '#6b7280' },
  disclaimer: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginVertical: 20, lineHeight: 16 },
});
