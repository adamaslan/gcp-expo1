/**
 * SignalDigestCard — renders one signal with direction, confidence, and explainability.
 * Designed for scannability: headline above the fold, explanation below.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { SignalPayload } from '../lib/digest';

const DIRECTION_COLOR: Record<string, string> = {
  bullish: '#16a34a',
  bearish: '#dc2626',
  neutral: '#d97706',
};

const DIRECTION_ARROW: Record<string, string> = {
  bullish: '↑',
  bearish: '↓',
  neutral: '→',
};

interface SignalDigestCardProps {
  signal: SignalPayload;
}

export function SignalDigestCard({ signal }: SignalDigestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const dirColor = DIRECTION_COLOR[signal.direction] ?? '#555';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.tickerRow}>
          <Text style={styles.ticker}>{signal.ticker}</Text>
          <Text style={[styles.direction, { color: dirColor }]}>
            {DIRECTION_ARROW[signal.direction]} {signal.direction}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{signal.timeframe}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{signal.confidence} confidence</Text>
        </View>
      </View>

      <Text style={styles.title}>{signal.title}</Text>

      <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.whyBtn}>
        <Text style={styles.whyBtnText}>{expanded ? 'Hide explanation ↑' : 'Why this signal ↓'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.explanation}>
          <Text style={styles.explanationText}>{signal.explanation}</Text>
          {signal.indicators.length > 0 && (
            <View style={styles.indicators}>
              {signal.indicators.map(ind => (
                <View key={ind} style={styles.indicatorChip}>
                  <Text style={styles.indicatorText}>{ind}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  header: { marginBottom: 8 },
  tickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticker: { fontSize: 18, fontWeight: '700', color: '#111' },
  direction: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  metaText: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  metaDot: { fontSize: 12, color: '#9ca3af' },
  title: { fontSize: 15, color: '#222', lineHeight: 21, marginBottom: 10 },
  whyBtn: { alignSelf: 'flex-start' },
  whyBtnText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  explanation: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  explanationText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  indicators: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  indicatorChip: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  indicatorText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
});
