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
            <Metric label="S&P 500" value={'$' + state.data.sp500.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mono />
          )}
          {state.data.nasdaq != null && (
            <Metric label="NASDAQ" value={'$' + state.data.nasdaq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mono />
          )}
          {state.data.dow != null && (
            <Metric label="Dow Jones" value={'$' + state.data.dow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mono />
          )}
          {state.data.regime && (
            <Metric label="Regime" value={state.data.regime} />
          )}
          {state.data.summary && <Text style={styles.summary}>{state.data.summary}</Text>}
          {state.data.ai_brief && <Text style={[styles.summary, styles.aiBrief]}>{state.data.ai_brief}</Text>}
          {(state.data.leading_sectors?.length ?? 0) > 0 && (
            <SectorRow label="Leading" sectors={state.data.leading_sectors!} color={theme.accent.green} />
          )}
          {(state.data.lagging_sectors?.length ?? 0) > 0 && (
            <SectorRow label="Lagging" sectors={state.data.lagging_sectors!} color={theme.accent.red} />
          )}
          {state.data.sentiment_summary && (
            <Text style={[styles.summary, { marginTop: 8 }]}>{state.data.sentiment_summary}</Text>
          )}
        </View>
      )}
    </Card>
  );
}

function SectorRow({ label, sectors, color }: { label: string; sectors: string[]; color: string }) {
  return (
    <View style={styles.sectorRow}>
      <Text style={[styles.sectorLabel, { color }]}>{label.toUpperCase()}</Text>
      <Text style={styles.sectorList}>{sectors.join(' · ')}</Text>
    </View>
  );
}

function MacroPulseCard({ state }: { state: LoadState<MacroPulse> }) {
  return (
    <Card title="Macro Pulse">
      {state.status === 'loading' && <Loader />}
      {state.status === 'error' && <ErrorText message={state.message} />}
      {state.status === 'ok' && (
        <>
          <View style={styles.macroHeader}>
            <SentimentBadge sentiment={state.data.sentiment} />
            {state.data.score != null && (
              <Text style={styles.scoreLine}>Score: <Text style={styles.scoreValue}>{state.data.score > 0 ? '+' : ''}{state.data.score}</Text></Text>
            )}
          </View>
          {state.data.summary && <Text style={styles.summary}>{state.data.summary}</Text>}
          {(state.data.signals?.length ?? 0) > 0 && (
            <View style={styles.signalTagRow}>
              {state.data.signals!.map((s, i) => (
                <View key={i} style={styles.signalTag}>
                  <Text style={styles.signalTagText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
          {(state.data.indicators?.length ?? 0) > 0 && (
            <View style={[styles.metricGrid, { marginTop: 12 }]}>
              {state.data.indicators!.map((ind) => (
                <Metric
                  key={ind.ticker}
                  label={ind.label}
                  value={
                    ind.price != null
                      ? `$${ind.price.toFixed(2)}${ind.change_pct != null ? `  ${ind.change_pct > 0 ? '+' : ''}${ind.change_pct.toFixed(2)}%` : ''}`
                      : '—'
                  }
                  mono
                  changeDir={ind.change_pct != null ? (ind.change_pct > 0 ? 'up' : ind.change_pct < 0 ? 'down' : 'flat') : undefined}
                />
              ))}
            </View>
          )}
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

function Metric({ label, value, mono, changeDir }: { label: string; value: string; mono?: boolean; changeDir?: 'up' | 'down' | 'flat' }) {
  const valueColor = changeDir === 'up' ? theme.accent.green : changeDir === 'down' ? theme.accent.red : undefined;
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, mono && styles.monoText, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
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
  aiBrief: {
    marginTop: 10,
    borderLeftWidth: 2,
    borderLeftColor: theme.accent.indigo,
    paddingLeft: 8,
    color: theme.text.secondary,
  },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8,
  },
  sectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    minWidth: 52,
    marginTop: 1,
  },
  sectorList: {
    flex: 1,
    fontSize: 12,
    color: theme.text.secondary,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  signalTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  signalTag: {
    backgroundColor: theme.bg.base,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.accent.cyan,
  },
  signalTagText: {
    fontSize: 11,
    color: theme.accent.cyan,
    fontWeight: '600',
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
