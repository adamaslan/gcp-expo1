import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { theme, radius, spacing } from '../lib/ui/theme';

export type TabKey = 'briefing' | 'trade' | 'chat';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string; sub: string }[] = [
  { key: 'briefing', label: 'Briefing', sub: 'Long' },
  { key: 'trade', label: 'Trade', sub: 'Short' },
  { key: 'chat', label: 'Chat', sub: 'RAG' },
];

export default function TabBar({ active, onChange }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bar}>
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => onChange(t.key)}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.tabActive,
                pressed && styles.tabPressed,
              ]}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
              <Text style={[styles.sub, isActive && styles.subActive]}>{t.sub}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: theme.bg.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
  },
  bar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: theme.border.accent + '30',
    borderColor: theme.border.accent,
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text.muted,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: theme.text.primary,
  },
  sub: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: theme.text.muted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  subActive: {
    color: theme.accent.indigo,
  },
});
