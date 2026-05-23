import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import {
  getMarketOverview,
  getMacroPulse,
  getSignals,
  type MarketOverview,
  type MacroPulse,
  type Signal,
} from '../lib/clients/gcp3';
import { buildLongTermPrompt } from '../lib/clients/council';
import CouncilPanel from '../components/CouncilPanel';
import { theme, radius, spacing } from '../lib/ui/theme';

type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string };

function useFetch<T>(fetcher: () => Promise<T>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  useEffect(() => {
    setState({ status: 'loading' });
    fetcher()
      .then((data) => setState({ status: 'ok', data }))
      .catch((err) => setState({ status: 'error', message: err instanceof Error ? err.message : String(err) }));
  }, []);
  return state;
}

export default function BriefingScreen() {
  const overviewState = useFetch(getMarketOverview);
  const macroState = useFetch(getMacroPulse);
  const signalsState = useFetch(getSignals);

  const councilPrompt = useMemo(() => {
    if (overviewState.status !== 'ok' && macroState.status !== 'ok' && signalsState.status !== 'ok') {
      return null;
    }
    return buildLongTermPrompt({
      overview: overviewState.status === 'ok' ? overviewState.data : undefined,
      macro: macroState.status === 'ok' ? macroState.data : undefined,
      signals: signalsState.status === 'ok' ? signalsState.data : undefined,
    });
  }, [overviewState, macroState, signalsState]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>LONG-TERM TRADER</Text>
        <Text style={styles.title}>Market Briefing</Text>
      </View>

      <MarketOverviewCard state={overviewState} />
      <MacroPulseCard state={macroState} />
      <SignalsCard state={signalsState} />

      <View style={styles.councilWrap}>
        <CouncilPanel prompt={councilPrompt} label="Ask the Council" traderFilter="long_term" />
      </View>
    </ScrollView>
  );
}

function MarketOverviewCard({ state }: { state: LoadState<MarketOverview> }) {
  return (
    <Card title="Market Overview">
      {state.status === 'loading' && <Loader />}
      {state.status === 'error' && <ErrorText message={state.message} />}
      {state.status === 'ok' && (
        <View style={styles.metricGrid}>
          <Metric label="Status" value={state.data.market_status ?? '—'} />
          {state.data.sp500 != null && (
            <Metric label="S&P 500" value={state.data.sp500.toLocaleString()} mono />
          )}
          {state.data.nasdaq != null && (
            <Metric label="NASDAQ" value={state.data.nasdaq.toLocaleString()} mono />
          )}
          {state.data.vix != null && (
            <Metric label="VIX" value={state.data.vix.toFixed(2)} mono />
          )}
          {state.data.summary && <Text style={styles.summary}>{state.data.summary}</Text>}
        </View>
      )}
    </Card>
  );
}

function MacroPulseCard({ state }: { state: LoadState<MacroPulse> }) {
  return (
    <Card title="Macro Pulse">
      {state.status === 'loading' && <Loader />}
      {state.status === 'error' && <ErrorText message={state.message} />}
      {state.status === 'ok' && (
        <>
          <SentimentBadge sentiment={state.data.sentiment} />
          {state.data.score != null && (
            <Text style={styles.scoreLine}>Score: <Text style={styles.scoreValue}>{state.data.score}</Text></Text>
          )}
          {state.data.summary && <Text style={styles.summary}>{state.data.summary}</Text>}
        </>
      )}
    </Card>
  );
}

function SignalsCard({ state }: { state: LoadState<Signal[]> }) {
  return (
    <Card title="Today's Signals">
      {state.status === 'loading' && <Loader />}
      {state.status === 'error' && <ErrorText message={state.message} />}
      {state.status === 'ok' && (
        <View style={styles.signalsList}>
          {Array.isArray(state.data) && state.data.slice(0, 8).map((s, i) => (
            <SignalRow key={`${s.ticker ?? 'sig'}-${i}`} signal={s} />
          ))}
          {(!Array.isArray(state.data) || state.data.length === 0) && (
            <Text style={styles.empty}>No signals available.</Text>
          )}
        </View>
      )}
    </Card>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const colorMap: Record<string, string> = {
    buy: theme.accent.green,
    sell: theme.accent.red,
    hold: theme.text.secondary,
  };
  const label = (signal.signal ?? '—').toString();
  const color = colorMap[label] ?? theme.text.secondary;
  return (
    <View style={styles.signalRow}>
      <Text style={styles.signalTicker}>{signal.ticker ?? '—'}</Text>
      <Text style={[styles.signalLabel, { color }]}>{label.toUpperCase()}</Text>
      {signal.confidence != null && (
        <Text style={styles.signalConf}>{Math.round(signal.confidence * 100)}%</Text>
      )}
    </View>
  );
}

function SentimentBadge({ sentiment }: { sentiment?: string | null }) {
  const safe = (sentiment ?? 'neutral').toString();
  const palette = theme.sentiment[safe as keyof typeof theme.sentiment] ?? theme.sentiment.neutral;
  return (
    <View style={[styles.sentimentBadge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.sentimentText, { color: palette.text }]}>{safe.toUpperCase()}</Text>
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, mono && styles.monoText]}>{value}</Text>
    </View>
  );
}

function Loader() {
  return <ActivityIndicator size="small" color={theme.accent.indigo} />;
}

function ErrorText({ message }: { message: string }) {
  return <Text style={styles.errorText}>{message}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: theme.accent.indigo,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text.primary,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: theme.text.muted,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  metricGrid: {
    gap: spacing.sm,
  },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.text.secondary,
  },
  metricValue: {
    fontSize: 14,
    color: theme.text.primary,
    fontWeight: '600',
  },
  monoText: {
    fontVariant: ['tabular-nums'],
    fontFamily: theme.font.mono,
    fontSize: 13,
  },
  summary: {
    fontSize: 12,
    color: theme.text.secondary,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  scoreLine: {
    fontSize: 13,
    color: theme.text.secondary,
    marginTop: spacing.sm,
  },
  scoreValue: {
    color: theme.text.primary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  signalsList: {
    gap: 6,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border.subtle,
  },
  signalTicker: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.text.primary,
    fontFamily: theme.font.mono,
  },
  signalLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginRight: spacing.md,
  },
  signalConf: {
    fontSize: 12,
    color: theme.text.muted,
    fontVariant: ['tabular-nums'],
  },
  sentimentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  empty: {
    fontSize: 12,
    color: theme.text.muted,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: theme.accent.red,
  },
  councilWrap: {
    marginTop: spacing.lg,
    backgroundColor: theme.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
});
