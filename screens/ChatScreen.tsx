import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ragChat, type ChatResponse, type CouncilSource } from '../lib/clients/aitext';
import {
  buildShortTermChat,
  buildLongTermChat,
  buildAgreementPrompt,
} from '../lib/clients/council';
import { theme, radius, spacing } from '../lib/ui/theme';

type ViewKey = 'short_term' | 'long_term';

interface SingleViewMessage {
  id: string;
  kind: 'single';
  role: 'user' | 'assistant';
  text: string;
  sources?: CouncilSource[];
  contextEmpty?: boolean;
  provider?: string;
}

interface DualViewMessage {
  id: string;
  kind: 'dual';
  role: 'assistant';
  question: string;
  shortView: ChatResponse | { error: string } | null;
  longView: ChatResponse | { error: string } | null;
  agreement: ChatResponse | { error: string } | null;
  agreementLoading: boolean;
}

type Message = SingleViewMessage | DualViewMessage;

const TRADER_FILTERS: { value: 'all' | ViewKey; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'short_term', label: 'Short-term' },
  { value: 'long_term', label: 'Long-term' },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | ViewKey>('all');
  const scrollRef = useRef<ScrollView | null>(null);

  function scrollToEnd() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: SingleViewMessage = {
      id: `u-${Date.now()}`,
      kind: 'single',
      role: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToEnd();

    try {
      if (filter === 'all') {
        await sendDual(text);
      } else {
        await sendSingle(text, filter);
      }
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }

  async function sendSingle(text: string, view: ViewKey) {
    const prompt = view === 'short_term' ? buildShortTermChat(text) : buildLongTermChat(text);
    try {
      const res = await ragChat({ message: prompt, trader_filter: view });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          kind: 'single',
          role: 'assistant',
          text: res.answer,
          sources: res.sources,
          contextEmpty: res.context_empty,
          provider: res.llm_provider,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, kind: 'single', role: 'assistant', text: `Error: ${msg}` },
      ]);
    }
  }

  async function sendDual(text: string) {
    const dualId = `dual-${Date.now()}`;
    // Insert placeholder; both views load concurrently and update in place.
    setMessages((prev) => [
      ...prev,
      {
        id: dualId,
        kind: 'dual',
        role: 'assistant',
        question: text,
        shortView: null,
        longView: null,
        agreement: null,
        agreementLoading: false,
      },
    ]);

    const shortPrompt = buildShortTermChat(text);
    const longPrompt = buildLongTermChat(text);

    const [shortRes, longRes] = await Promise.allSettled([
      ragChat({ message: shortPrompt, trader_filter: 'short_term' }),
      ragChat({ message: longPrompt, trader_filter: 'long_term' }),
    ]);

    const shortView: DualViewMessage['shortView'] =
      shortRes.status === 'fulfilled'
        ? shortRes.value
        : { error: shortRes.reason instanceof Error ? shortRes.reason.message : String(shortRes.reason) };
    const longView: DualViewMessage['longView'] =
      longRes.status === 'fulfilled'
        ? longRes.value
        : { error: longRes.reason instanceof Error ? longRes.reason.message : String(longRes.reason) };

    setMessages((prev) =>
      prev.map((m) =>
        m.id === dualId && m.kind === 'dual' ? { ...m, shortView, longView } : m,
      ),
    );
  }

  async function requestAgreement(dualId: string) {
    const dual = messages.find((m) => m.id === dualId);
    if (!dual || dual.kind !== 'dual') return;
    if (!isOk(dual.shortView) || !isOk(dual.longView)) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === dualId && m.kind === 'dual' ? { ...m, agreementLoading: true } : m)),
    );
    scrollToEnd();

    const prompt = buildAgreementPrompt(dual.question, dual.shortView.answer, dual.longView.answer);

    try {
      const res = await ragChat({ message: prompt, trader_filter: null });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === dualId && m.kind === 'dual'
            ? { ...m, agreement: res, agreementLoading: false }
            : m,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === dualId && m.kind === 'dual'
            ? { ...m, agreement: { error: msg }, agreementLoading: false }
            : m,
        ),
      );
    } finally {
      scrollToEnd();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>RAG · GEMINI</Text>
        <Text style={styles.title}>Research Chat</Text>
      </View>

      <View style={styles.filterRow}>
        {TRADER_FILTERS.map((f) => (
          <Pressable
            key={f.label}
            onPress={() => setFilter(f.value)}
            style={[styles.filterPill, filter === f.value && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && <EmptyState filter={filter} />}
        {messages.map((m) => {
          if (m.kind === 'single') return <SingleBubble key={m.id} message={m} />;
          return <DualBubble key={m.id} message={m} onAgree={() => requestAgreement(m.id)} />;
        })}
        {loading && (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <ActivityIndicator size="small" color={theme.accent.indigo} />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={
            filter === 'all'
              ? 'Ask anything — you’ll get both views'
              : 'Ask anything about the markets…'
          }
          placeholderTextColor={theme.text.muted}
          style={styles.input}
          multiline
          maxLength={1000}
        />
        <Pressable
          onPress={send}
          disabled={!input.trim() || loading}
          style={({ pressed }) => [
            styles.sendButton,
            (!input.trim() || loading) && styles.sendDisabled,
            pressed && styles.sendPressed,
          ]}
        >
          <Text style={styles.sendText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function isOk(view: DualViewMessage['shortView']): view is ChatResponse {
  return view !== null && !('error' in view);
}

// ───── Single (one-view) bubble ─────

function SingleBubble({ message }: { message: SingleViewMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <Text style={isUser ? styles.userText : styles.assistantText}>{message.text}</Text>

      {!isUser && Array.isArray(message.sources) && message.sources.length > 0 && (
        <SourcesPanel sources={message.sources} provider={message.provider} />
      )}

      {!isUser && message.contextEmpty && (
        <Text style={styles.contextEmpty}>
          No matching context — general knowledge.
        </Text>
      )}
    </View>
  );
}

// ───── Dual-view bubble: SHORT card + LONG card + Agree button ─────

function DualBubble({
  message,
  onAgree,
}: {
  message: DualViewMessage;
  onAgree: () => void;
}) {
  const bothReady = isOk(message.shortView) && isOk(message.longView);
  const eitherError =
    (message.shortView && 'error' in message.shortView) ||
    (message.longView && 'error' in message.longView);

  return (
    <View style={[styles.bubble, styles.assistantBubble, styles.dualBubble]}>
      <View style={styles.dualRow}>
        <ViewCard
          label="SHORT-TERM"
          accent={theme.accent.cyan}
          view={message.shortView}
        />
        <ViewCard
          label="LONG-TERM"
          accent={theme.accent.indigo}
          view={message.longView}
        />
      </View>

      {bothReady && !message.agreement && !message.agreementLoading && (
        <Pressable
          onPress={onAgree}
          style={({ pressed }) => [styles.agreeButton, pressed && styles.agreePressed]}
        >
          <Text style={styles.agreeText}>★ Agree on Best Overall</Text>
        </Pressable>
      )}

      {message.agreementLoading && (
        <View style={styles.agreeLoading}>
          <ActivityIndicator size="small" color={theme.accent.yellow} />
          <Text style={styles.agreeLoadingText}>Synthesizing…</Text>
        </View>
      )}

      {message.agreement && 'answer' in message.agreement && (
        <View style={styles.agreementBox}>
          <Text style={styles.agreementLabel}>★ AGREED VIEW</Text>
          <Text style={styles.agreementText}>{message.agreement.answer}</Text>
          {Array.isArray(message.agreement.sources) && message.agreement.sources.length > 0 && (
            <SourcesPanel
              sources={message.agreement.sources}
              provider={message.agreement.llm_provider}
              dense
            />
          )}
        </View>
      )}

      {message.agreement && 'error' in message.agreement && (
        <Text style={styles.errorInline}>Agreement failed: {message.agreement.error}</Text>
      )}

      {eitherError && (
        <Text style={styles.errorInline}>
          One viewpoint failed — Agree button hidden until both succeed.
        </Text>
      )}
    </View>
  );
}

function ViewCard({
  label,
  accent,
  view,
}: {
  label: string;
  accent: string;
  view: ChatResponse | { error: string } | null;
}) {
  return (
    <View style={[styles.viewCard, { borderLeftColor: accent }]}>
      <Text style={[styles.viewLabel, { color: accent }]}>{label}</Text>
      {view === null && (
        <View style={styles.viewLoading}>
          <ActivityIndicator size="small" color={accent} />
        </View>
      )}
      {view && 'error' in view && (
        <Text style={styles.errorInline}>{view.error}</Text>
      )}
      {view && 'answer' in view && (
        <>
          <Text style={styles.viewAnswer}>{view.answer}</Text>
          {Array.isArray(view.sources) && view.sources.length > 0 && (
            <SourcesPanel sources={view.sources} provider={view.llm_provider} dense />
          )}
        </>
      )}
    </View>
  );
}

function SourcesPanel({
  sources,
  provider,
  dense,
}: {
  sources: CouncilSource[];
  provider?: string;
  dense?: boolean;
}) {
  return (
    <View style={[styles.sourcesWrap, dense && styles.sourcesWrapDense]}>
      <Text style={styles.sourcesLabel}>
        Sources{provider ? ` · ${provider}` : ''}
      </Text>
      <View style={styles.sourcesRow}>
        {sources.slice(0, 5).map((s, i) => (
          <View
            key={`${s?.source_file ?? 'src'}-${s?.chunk_index ?? i}-${i}`}
            style={styles.chip}
          >
            <Text style={styles.chipText}>
              {(s?.source_file ?? '').split('/').pop() || 'source'} · {(s?.rerank_score ?? 0).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyState({ filter }: { filter: 'all' | ViewKey }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>The Council awaits.</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'all'
          ? 'In "All" mode, every question gets BOTH a short-term and long-term answer — plus an "Agree" button to synthesize the two.'
          : 'Ask about technical setups, macro regimes, sector flows, or any name in the corpus.'}
      </Text>
      <View style={styles.suggestionWrap}>
        {[
          'What’s the setup on NVDA?',
          'Is the market overbought?',
          'How should I think about rate cuts?',
        ].map((s) => (
          <View key={s} style={styles.suggestion}>
            <Text style={styles.suggestionText}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
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
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border.subtle,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: theme.bg.surface,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  filterPillActive: {
    backgroundColor: theme.border.accent + '40',
    borderColor: theme.accent.indigo,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: theme.text.secondary,
  },
  filterTextActive: {
    color: theme.text.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  bubble: {
    borderRadius: radius.lg,
    padding: spacing.md,
    maxWidth: '95%',
  },
  userBubble: {
    backgroundColor: theme.border.accent,
    alignSelf: 'flex-end',
    borderBottomRightRadius: radius.sm,
  },
  assistantBubble: {
    backgroundColor: theme.bg.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  dualBubble: {
    width: '100%',
    maxWidth: '100%',
  },
  dualRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  viewCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: theme.bg.base,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border.subtle,
  },
  viewLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  viewAnswer: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.text.primary,
  },
  viewLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  userText: {
    color: theme.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  assistantText: {
    color: theme.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  agreeButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: theme.accent.yellow,
    alignItems: 'center',
  },
  agreePressed: {
    backgroundColor: 'rgba(251,191,36,0.25)',
  },
  agreeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: theme.accent.yellow,
    textTransform: 'uppercase',
  },
  agreeLoading: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  agreeLoadingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.accent.yellow,
    textTransform: 'uppercase',
  },
  agreementBox: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  agreementLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: theme.accent.yellow,
    marginBottom: spacing.sm,
  },
  agreementText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.text.primary,
  },
  errorInline: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: theme.accent.red,
    fontStyle: 'italic',
  },
  sourcesWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border.subtle,
  },
  sourcesWrapDense: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
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
    marginTop: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
    backgroundColor: theme.bg.surface,
  },
  input: {
    flex: 1,
    backgroundColor: theme.bg.base,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: theme.text.primary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.accent.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendPressed: {
    opacity: 0.8,
  },
  sendText: {
    color: theme.text.primary,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text.primary,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.text.secondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 19,
  },
  suggestionWrap: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  suggestion: {
    backgroundColor: theme.bg.surface,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestionText: {
    fontSize: 13,
    color: theme.text.secondary,
    fontStyle: 'italic',
  },
});
