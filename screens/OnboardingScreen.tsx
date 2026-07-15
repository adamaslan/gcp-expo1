import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { theme } from '../lib/ui/theme';
import { track } from '../lib/analytics';

const SCHWAB_CONNECT_URL =
  (process.env.EXPO_PUBLIC_GCP3_BACKEND_URL ?? 'http://localhost:8000') + '/api/schwab/oauth/start';

// Deep-link scheme the Schwab OAuth callback redirects back to.
// Set in app.json: scheme = "nuwrrrld"
const OAUTH_SUCCESS_SCHEME = 'nuwrrrld://schwab/callback';

type Step = 'welcome' | 'connect' | 'connecting' | 'done' | 'error';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>('welcome');

  // Listen for the OAuth deep-link callback before declaring the connection done.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.startsWith(OAUTH_SUCCESS_SCHEME)) {
        // OAuth flow completed — now the connection is real.
        track('account_connected', { provider: 'schwab' });
        setStep('done');
      }
    });
    return () => sub.remove();
  }, []);

  async function handleConnect() {
    setStep('connecting');
    try {
      await Linking.openURL(SCHWAB_CONNECT_URL);
      // Stay in 'connecting' — the deep-link listener above advances to 'done'
      // once Schwab redirects back. If the user cancels the browser, they can
      // tap "Try again" to return to the connect step.
    } catch {
      setStep('error');
    }
  }

  function handleSkip() {
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
        <ActivityIndicator size="large" color={theme.accent.blue} />
        <Text style={styles.loadingText}>Waiting for Schwab authorisation…</Text>
        <TouchableOpacity style={styles.cancelLink} onPress={() => setStep('connect')}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'error') {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Could not open Schwab</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('connect')}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // done — account connected, signal import started
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>Account connected!</Text>
      <Text style={styles.subtitle}>
        Your portfolio is being imported. Head to your dashboard —
        your first signal digest will appear there once it's ready.
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onComplete}>
        <Text style={styles.primaryBtnText}>Go to dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 28, alignItems: 'center', flexGrow: 1, justifyContent: 'center', backgroundColor: theme.bg.base },
  center: { flex: 1 },
  emoji: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: theme.text.primary, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: theme.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  featureList: { width: '100%', gap: 12, marginBottom: 28 },
  featureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  check: { color: theme.accent.green, fontWeight: '700', fontSize: 16 },
  featureText: { fontSize: 15, color: theme.text.primary, flex: 1 },
  primaryBtn: { width: '100%', backgroundColor: theme.accent.blue, padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: theme.text.inverse, fontSize: 16, fontWeight: '700' },
  skipBtn: { padding: 8 },
  skipText: { color: theme.text.muted, fontSize: 14 },
  loadingText: { marginTop: 16, color: theme.text.secondary, fontSize: 15, textAlign: 'center' },
  cancelLink: { marginTop: 16, padding: 8 },
  cancelText: { color: theme.text.muted, fontSize: 14 },
});
