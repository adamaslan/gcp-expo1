import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { analyzeHoldFold, type HoldFoldVerdict, type Verdict } from '../lib/clients/holdfold';
import { buildShortTermPrompt } from '../lib/clients/council';
import CouncilPanel from '../components/CouncilPanel';
import { theme, radius, spacing } from '../lib/ui/theme';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; verdict: HoldFoldVerdict }
  | { status: 'error'; message: string };

const PERIODS = ['1mo', '3mo', '6mo', '1y'];

export default function HoldFoldScreen() {
  const [symbol, setSymbol] = useState('');
  const [period, setPeriod] = useState('3mo');
  const [state, setState] = useState<State>({ status: 'idle' });

  async function analyze() {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setState({ status: 'loading' });
    try {
      const verdict = await analyzeHoldFold({ symbol: clean, period });
      setState({ status: 'ok', verdict });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SHORT-TERM TRADER</Text>
          <Text style={styles.title}>Trade Decision</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Symbol</Text>
          <TextInput
            value={symbol}
            onChangeText={setSymbol}
            placeholder="AAPL"
            placeholderTextColor={theme.text.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={analyze}
            returnKeyType="search"
          />

          <Text style={styles.formLabel}>Period</Text>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <Pressable
                key={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setPeriod(p);
                }}
                style={[styles.periodPill, period === p && styles.periodPillActive]}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={analyze}
            disabled={!symbol.trim() || state.status === 'loading'}
            style={({ pressed }) => [
              styles.analyzeButton,
              (!symbol.trim() || state.status === 'loading') && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.analyzeButtonText}>
              {state.status === 'loading' ? 'Analyzing…' : 'Get Verdict'}
            </Text>
          </Pressable>
        </View>

        {state.status === 'loading' && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color={theme.accent.indigo} />
            <Text style={styles.statusText}>Reading the tape…</Text>
          </View>
        )}

        {state.status === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{state.message}</Text>
          </View>
        )}

        {state.status === 'ok' && <VerdictDisplay verdict={state.verdict} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function VerdictDisplay({ verdict }: { verdict: HoldFoldVerdict }) {
  const palette = paletteFor(verdict.verdict);
  const prompt = buildShortTermPrompt(verdict);

  return (
    <>
      <View style={[styles.verdictCard, { borderColor: palette.border }]}>
        <View style={styles.verdictHeader}>
          <Text style={styles.verdictSymbol}>{verdict.symbol}</Text>
          <View style={[styles.verdictBadge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Text style={[styles.verdictText, { color: palette.text }]}>{verdict.verdict}</Text>
          </View>
        </View>

        <Text style={styles.confidence}>
          {verdict.confidence}<Text style={styles.confidencePct}>%</Text> <Text style={styles.confidenceLabel}>confidence</Text>
        </Text>

        <View style={styles.metaRow}>
          <MetaPill label="BIAS" value={verdict.bias} />
          <MetaPill label="RISK" value={verdict.risk_level} />
          <MetaPill label="VOL" value={verdict.volatility_regime} />
        </View>

        <View style={styles.indicatorGrid}>
          <IndicatorCell label="RSI" value={verdict.rsi} />
          <IndicatorCell label="MACD" value={verdict.macd} />
          <IndicatorCell label="ADX" value={verdict.adx} />
          <IndicatorCell label="ATR" value={verdict.atr} />
        </View>

        {Array.isArray(verdict.top_signals) && verdict.top_signals.length > 0 && (
          <View style={styles.signalsSection}>
            <Text style={styles.sectionLabel}>TOP SIGNALS</Text>
            <View style={styles.signalChips}>
              {verdict.top_signals.slice(0, 5).map((s, i) => (
                <View key={`${s?.signal ?? 'sig'}-${i}`} style={styles.signalChip}>
                  <Text style={styles.signalChipText}>
                    {s?.signal ?? '—'} <Text style={styles.signalStrength}>· {s?.strength ?? '—'}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {verdict.primary_signal && (
          <View style={styles.primarySection}>
            <Text style={styles.sectionLabel}>PRIMARY</Text>
            <Text style={styles.primaryText}>{verdict.primary_signal}</Text>
          </View>
        )}

        <CouncilPanel prompt={prompt} label="Ask the Council" traderFilter="T1" />
      </View>
    </>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function IndicatorCell({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={styles.indicatorCell}>
      <Text style={styles.indicatorLabel}>{label}</Text>
      <Text style={styles.indicatorValue}>{value === null || value === undefined ? '—' : value.toFixed(2)}</Text>
    </View>
  );
}

function paletteFor(v: Verdict) {
  if (v === 'HOLD EM') return theme.verdict.hold;
  if (v === 'FOLD EM') return theme.verdict.fold;
  return theme.verdict.neutral;
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
    color: theme.accent.cyan,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text.primary,
    letterSpacing: -0.5,
  },
  formCard: {
    backgroundColor: theme.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: theme.text.muted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: theme.bg.base,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    color: theme.text.primary,
    fontFamily: theme.font.mono,
    fontWeight: '700',
    letterSpacing: 1,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: theme.bg.base,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    alignItems: 'center',
  },
  periodPillActive: {
    backgroundColor: theme.border.accent + '40',
    borderColor: theme.accent.indigo,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.text.secondary,
    letterSpacing: 1,
  },
  periodTextActive: {
    color: theme.text.primary,
  },
  analyzeButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: theme.accent.indigo,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  analyzeButtonText: {
    color: theme.text.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: theme.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  statusText: {
    color: theme.text.secondary,
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderColor: 'rgba(244,63,94,0.3)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: theme.accent.red,
  },
  verdictCard: {
    backgroundColor: theme.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
  },
  verdictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  verdictSymbol: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.text.primary,
    fontFamily: theme.font.mono,
    letterSpacing: 1,
  },
  verdictBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  verdictText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  confidence: {
    fontSize: 42,
    fontWeight: '800',
    color: theme.text.primary,
    fontVariant: ['tabular-nums'],
  },
  confidencePct: {
    fontSize: 24,
    color: theme.text.secondary,
  },
  confidenceLabel: {
    fontSize: 12,
    color: theme.text.muted,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  metaPill: {
    flex: 1,
    backgroundColor: theme.bg.base,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: theme.text.muted,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    color: theme.text.primary,
    fontWeight: '600',
  },
  indicatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  indicatorCell: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: theme.bg.base,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    alignItems: 'center',
  },
  indicatorLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: theme.text.muted,
    marginBottom: 4,
  },
  indicatorValue: {
    fontSize: 14,
    color: theme.text.primary,
    fontFamily: theme.font.mono,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  signalsSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: theme.text.muted,
    marginBottom: spacing.sm,
  },
  signalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  signalChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: theme.bg.base,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  signalChipText: {
    fontSize: 11,
    color: theme.text.primary,
    fontWeight: '600',
  },
  signalStrength: {
    color: theme.text.muted,
    fontWeight: '400',
  },
  primarySection: {
    marginBottom: spacing.md,
  },
  primaryText: {
    fontSize: 13,
    color: theme.text.primary,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: theme.accent.cyan,
  },
});
