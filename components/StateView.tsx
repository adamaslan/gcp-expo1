/**
 * StateView — covers loading, empty, and error states for every primary screen.
 * Prevents blank screens and unresolved spinners on all non-happy paths.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';

type ViewState = 'loading' | 'empty' | 'error';

function SkeletonBlock({ width }: { width: `${number}%` }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeletonBlock, { width, opacity }]} />;
}

function Skeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonBlock width="40%" />
          <SkeletonBlock width="90%" />
          <SkeletonBlock width="70%" />
        </View>
      ))}
    </View>
  );
}

interface StateViewProps {
  state: ViewState;
  /** Shown for empty state */
  emptyTitle?: string;
  emptyMessage?: string;
  /** Shown for error state */
  errorTitle?: string;
  errorMessage?: string;
  /** Retry callback for error state */
  onRetry?: () => void;
}

export function StateView({
  state,
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'Check back soon.',
  errorTitle = 'Something went wrong',
  errorMessage = 'We could not load this data. Please try again.',
  onRetry,
}: StateViewProps) {
  if (state === 'loading') {
    return (
      <View style={styles.container}>
        <Skeleton />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>📭</Text>
        <Text style={styles.title}>{emptyTitle}</Text>
        <Text style={styles.message}>{emptyMessage}</Text>
      </View>
    );
  }

  // error
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.title}>{errorTitle}</Text>
      <Text style={styles.message}>{errorMessage}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  retryBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  skeletonContainer: { width: '100%', gap: 12 },
  skeletonCard: { gap: 8, padding: 16, borderRadius: 12, backgroundColor: '#f2f2f2' },
  skeletonBlock: { height: 12, borderRadius: 6, backgroundColor: '#d0d0d0' },
});
