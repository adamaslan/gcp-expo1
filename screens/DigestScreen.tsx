import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { theme } from '../lib/ui/theme';
import { useDigest } from '../lib/useDigest';
import { SignalDigestCard } from '../components/SignalDigestCard';
import { StateView } from '../components/StateView';
import { useSubscription, useEntitlement } from '../lib/useSubscription';
import PaywallScreen from './PaywallScreen';
import { filterSignals, sortSignals, type Direction, type SortKey } from '../lib/shared/signalFilters';
import { getPref, setPref } from '../lib/shared/prefs';
import * as Haptics from 'expo-haptics';

const FILTER_PREF_KEY = 'signals-filter';
const DIRECTIONS: Direction[] = ['all', 'bullish', 'bearish', 'neutral'];

export default function DigestScreen() {
  const { digest, isLoading, error, refetch } = useDigest();
  const { isLoading: subLoading } = useSubscription();
  const entitled = useEntitlement();
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<Direction>('all');
  const [sort, setSort] = useState<SortKey>('confidence');

  useEffect(() => {
    (async () => {
      const saved = await getPref(FILTER_PREF_KEY);
      if (!saved) return;
      try {
        const { direction: d, sort: s } = JSON.parse(saved) as { direction: Direction; sort: SortKey };
        if (d) setDirection(d);
        if (s) setSort(s);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    setPref(FILTER_PREF_KEY, JSON.stringify({ direction, sort }));
  }, [direction, sort]);

  const filtered = useMemo(
    () => (digest ? sortSignals(filterSignals(digest.signals, search, direction), sort) : []),
    [digest, search, direction, sort],
  );

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
        <Text style={styles.count}>{filtered.length} signal{filtered.length !== 1 ? 's' : ''}</Text>
      </View>
      {digest.degraded && (
        <Text style={styles.degradedBanner}>⚠ Live signals are unavailable — showing the last cached digest.</Text>
      )}
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search ticker or title…"
        placeholderTextColor={theme.text.muted}
      />
      <View style={styles.filterRow}>
        {DIRECTIONS.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.filterChip, direction === d && styles.filterChipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setDirection(d);
            }}
          >
            <Text style={[styles.filterChipText, direction === d && styles.filterChipTextActive]}>
              {d === 'all' ? 'All' : d === 'bullish' ? '↑ Bullish' : d === 'bearish' ? '↓ Bearish' : '→ Neutral'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => setSort(sort === 'confidence' ? 'ticker' : 'confidence')}
        >
          <Text style={styles.filterChipText}>Sort: {sort === 'confidence' ? 'Confidence' : 'Ticker'}</Text>
        </TouchableOpacity>
      </View>
      {filtered.length === 0 && (
        <Text style={styles.noResults}>No signals match your filters.</Text>
      )}
      {filtered.map(sig => (
        <SignalDigestCard key={sig.id} signal={sig} />
      ))}
      <Text style={styles.disclaimer}>
        Signals are informational only and are not personalised financial advice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  period: { fontSize: 17, fontWeight: '700', color: theme.text.primary },
  count: { fontSize: 13, color: theme.text.secondary },
  degradedBanner: { fontSize: 12, color: theme.accent.yellow, backgroundColor: 'rgba(244,184,63,0.1)', borderWidth: 1, borderColor: 'rgba(244,184,63,0.35)', borderRadius: 6, padding: 8, marginBottom: 12 },
  search: { backgroundColor: theme.bg.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border.subtle, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: theme.text.primary, marginBottom: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: theme.bg.surface, borderWidth: 1, borderColor: theme.border.subtle },
  filterChipActive: { backgroundColor: theme.accent.blue, borderColor: theme.accent.blue },
  filterChipText: { fontSize: 12, color: theme.text.secondary },
  filterChipTextActive: { color: theme.text.inverse },
  noResults: { fontSize: 13, color: theme.text.muted, textAlign: 'center', marginVertical: 16 },
  disclaimer: { fontSize: 11, color: theme.text.muted, textAlign: 'center', marginVertical: 20, lineHeight: 16 },
});
