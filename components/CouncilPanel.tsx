import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { askCouncil } from '../lib/clients/council';
import type { ChatResponse, CouncilSource, TraderFilterValue } from '../lib/clients/aitext';
import { theme, radius, spacing } from '../lib/ui/theme';

interface Props {
  // The prompt is built upstream by the screen using buildShortTermPrompt or buildLongTermPrompt.
  // Passing null disables the panel (e.g. data not yet loaded).
  prompt: string | null;
  label?: string;
  traderFilter?: TraderFilterValue;
}

export default function CouncilPanel({ prompt, label = 'Ask the Council', traderFilter }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ChatResponse | null>(null);

  async function handlePress() {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const data = await askCouncil(prompt, traderFilter);
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const disabled = !prompt || loading;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI COUNCIL</Text>
        <Pressable
          onPress={handlePress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            disabled && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Consulting…' : response ? 'Re-ask' : label}
          </Text>
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {response && (
        <View style={styles.answerWrap}>
          <Text style={styles.answer}>{response.answer}</Text>

          {Array.isArray(response.sources) && response.sources.length > 0 && (
            <View style={styles.sourcesWrap}>
              <Text style={styles.sourcesLabel}>
                Sources · {response.llm_provider}
              </Text>
              <View style={styles.sourcesRow}>
                {response.sources.slice(0, 5).map((s, i) => (
                  <SourceChip key={`${s?.source_file ?? 'src'}-${s?.chunk_index ?? i}-${i}`} source={s} />
                ))}
              </View>
            </View>
          )}

          {response.context_empty && (
            <Text style={styles.contextEmpty}>
              No matching context in the RAG corpus — answer is from the LLM's general knowledge.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function SourceChip({ source }: { source: CouncilSource }) {
  const filename = (source?.source_file ?? '').split('/').pop() || 'source';
  const score = source?.rerank_score ?? 0;
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>
        {filename} · {score.toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: theme.accent.indigo,
  },
  button: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: theme.border.accent + '40',
    borderWidth: 1,
    borderColor: theme.border.accent,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    backgroundColor: theme.border.accent + '60',
  },
  buttonText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.text.primary,
    textTransform: 'uppercase',
  },
  errorBox: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: theme.accent.red,
  },
  answerWrap: {
    gap: spacing.md,
  },
  answer: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.text.primary,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: theme.accent.indigoDeep,
  },
  sourcesWrap: {
    marginTop: spacing.xs,
  },
  sourcesLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.text.muted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: theme.bg.surface,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  chipText: {
    fontSize: 9,
    color: theme.text.secondary,
  },
  contextEmpty: {
    fontSize: 10,
    fontStyle: 'italic',
    color: theme.accent.yellow,
    opacity: 0.7,
  },
});
