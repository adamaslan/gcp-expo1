import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { track } from '../lib/analytics';

const SCHWAB_CONNECT_URL =
  (process.env.EXPO_PUBLIC_GCP3_BACKEND_URL ?? 'http://localhost:8000') + '/api/schwab/oauth/start';

type Step = 'welcome' | 'connect' | 'connecting' | 'done';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>('welcome');

  async function handleConnect() {
    setStep('connecting');
    try {
      await Linking.openURL(SCHWAB_CONNECT_URL);
      track('account_connected', { provider: 'schwab' });
      // After OAuth redirect returns the user will deep-link back;
      // simulate done for now — real handling is in the deep-link listener.
      setStep('done');
    } catch {
      setStep('connect');
    }
  }

  function handleSkip() {
    // Users can explore with demo data; prompt to connect again on paywall.
    onComplete();
  }

  if (step === 'welcome') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.emoji}>📈</Text>
        <Text style={styles.title}>Welcome to NuWrrrld Financial</Text>
        <Text style={styles.subtitle}>
          Connect your brokerage account to get personalized signals,
          portfolio intelligence, and AI-powered insights in under 2 minutes.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('connect')}>
          <Text style={styles.primaryBtnText}>Get started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Explore without connecting</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'connect') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.emoji}>🔗</Text>
        <Text style={styles.title}>Connect your Schwab account</Text>
        <Text style={styles.subtitle}>
          We use read-only access via Schwab's official OAuth flow.
          Your credentials are never stored on our servers.
        </Text>
        <View style={styles.featureList}>
          {[
            'Read-only — we cannot place trades',
            'Disconnect any time from your account',
            'Secured by Schwab OAuth',
          ].map(f => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleConnect}>
          <Text style={styles.primaryBtnText}>Connect Schwab</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'connecting') {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Opening Schwab…</Text>
      </View>
    );
  }

  // done
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>You're all set!</Text>
      <Text style={styles.subtitle}>
        Your portfolio is being imported. Your first signal digest
        will be ready within a few minutes.
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => {
        track('first_value', { feature: 'signal' });
        onComplete();
      }}>
        <Text style={styles.primaryBtnText}>See my dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 28, alignItems: 'center', flexGrow: 1, justifyContent: 'center', backgroundColor: '#fff' },
  center: { flex: 1 },
  emoji: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  featureList: { width: '100%', gap: 12, marginBottom: 28 },
  featureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  check: { color: '#16a34a', fontWeight: '700', fontSize: 16 },
  featureText: { fontSize: 15, color: '#222', flex: 1 },
  primaryBtn: { width: '100%', backgroundColor: '#2563eb', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { padding: 8 },
  skipText: { color: '#9ca3af', fontSize: 14 },
  loadingText: { marginTop: 16, color: '#555', fontSize: 15 },
});
