import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme, radius, spacing } from '../lib/ui/theme';
import { usePortfolio } from '../lib/usePortfolio';
import { StateView } from '../components/StateView';
import { PORTFOLIO_DISCLAIMER } from '../lib/portfolio';
import { useSubscription, useEntitlement } from '../lib/useSubscription';
import PaywallScreen from './PaywallScreen';

export default function PortfolioScreen() {
  const { isLoading: subLoading } = useSubscription();
  const entitled = useEntitlement();
  const { health, watchlist, isLoading, error, refetch, addToWatchlist, removeFromWatchlist } = usePortfolio();
  const [ticker, setTicker] = useState('');
  const [adding, setAdding] = useState(false);

  if (subLoading) return <StateView state="loading" />;
  if (!entitled('portfolio_score')) return <PaywallScreen />;
  if (isLoading) return <StateView state="loading" />;
  if (error) return <StateView state="error" errorMessage={error} onRetry={refetch} />;

  async function handleAdd() {
    const clean = ticker.trim().toUpperCase();
    if (!clean || adding) return;
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await addToWatchlist(clean);
      setTicker('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(t: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await removeFromWatchlist(t);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <Text style={styles.title}>Portfolio</Text>

      {health ? (
        <View style={styles.healthCard}>
          <View style={styles.healthRow}>
            <Text style={styles.healthScore}>{health.score}</Text>
            <Text style={styles.healthGrade}>{health.grade}</Text>
          </View>
          <Text style={styles.healthSummary}>{health.summary}</Text>
        </View>
      ) : watchlist.length === 0 ? (
        <Text style={styles.noHealth}>Add tickers to your watchlist to get your health score.</Text>
      ) : (
        <Text style={styles.noHealth}>Health score unavailable — try again shortly.</Text>
      )}

      <Text style={styles.sectionLabel}>WATCHLIST</Text>
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={ticker}
          onChangeText={setTicker}
          placeholder="Add ticker (e.g. DBA)"
          placeholderTextColor={theme.text.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={!ticker.trim() || adding}>
          <Text style={styles.addBtnText}>{adding ? '…' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {watchlist.length === 0 ? (
        <Text style={styles.emptyWatchlist}>No tickers on your watchlist yet.</Text>
      ) : (
        watchlist.map(item => (
          <View key={item.ticker} style={styles.watchRow}>
            <Text style={styles.watchTicker}>{item.ticker}</Text>
            <TouchableOpacity onPress={() => handleRemove(item.ticker)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.disclaimer}>{PORTFOLIO_DISCLAIMER}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base, padding: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: theme.text.primary, marginBottom: 16 },
  healthCard: { backgroundColor: theme.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border.subtle, padding: 16, marginBottom: 20 },
  healthRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  healthScore: { fontSize: 32, fontWeight: '800', color: theme.text.primary },
  healthGrade: { fontSize: 18, fontWeight: '700', color: theme.accent.blue },
  healthSummary: { fontSize: 14, color: theme.text.secondary, lineHeight: 20 },
  noHealth: { fontSize: 13, color: theme.text.muted, marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.text.muted, letterSpacing: 0.5, marginBottom: 8 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  addInput: { flex: 1, backgroundColor: theme.bg.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: theme.border.subtle, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.text.primary },
  addBtn: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: theme.accent.blue, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: theme.text.inverse, fontSize: 20, fontWeight: '700' },
  emptyWatchlist: { fontSize: 13, color: theme.text.muted, marginBottom: 16 },
  watchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border.subtle },
  watchTicker: { fontSize: 15, fontWeight: '600', color: theme.text.primary },
  removeText: { fontSize: 13, color: theme.accent.red },
  disclaimer: { fontSize: 11, color: theme.text.muted, textAlign: 'center', marginVertical: 20, lineHeight: 16 },
});
