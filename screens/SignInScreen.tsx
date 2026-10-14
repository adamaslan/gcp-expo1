import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Linking } from 'react-native';
import { useOAuth, useSignIn } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { theme, radius, spacing } from '../lib/ui/theme';
import { PRIVACY_URL, TOS_URL } from '../lib/shared/legal-consent';
import { markLegalConsentAccepted } from '../lib/legal-consent-store';

// Required so the browser session closes correctly after OAuth on native.
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { isLoaded } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Never pre-checked. Google OAuth creates the account implicitly, so this
  // gates the only entry point; existing users see it too (recorded per version).
  const [legalAccepted, setLegalAccepted] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    if (!legalAccepted) return;
    setLoading(true);
    setError(null);
    try {
      const result = await startOAuthFlow({
        // Web ignores this; native uses it to deep-link back into the app.
        redirectUrl: Platform.OS === 'web' ? undefined : 'nuwrrrld://oauth-callback',
      });
      if (result?.createdSessionId && result?.setActive) {
        // Persist before the session activates so the portal sync sees it.
        await markLegalConsentAccepted();
        await result.setActive({ session: result.createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error:', err);
      setError(err instanceof Error ? err.message : 'Sign-in failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, [startOAuthFlow, legalAccepted]);

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.splash}>
          <ActivityIndicator size="large" color={theme.accent.indigo} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>NuWrrrld Financial</Text>
        <Text style={styles.tagline}>Markets · Signals · Intelligence</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Sign in</Text>
          <Text style={styles.subheading}>
            Your session stays active for 1 hour. After that you'll be asked to sign in again.
          </Text>

          <View style={styles.legalRow}>
            <Pressable
              onPress={() => setLegalAccepted((v) => !v)}
              disabled={loading}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: legalAccepted }}
              accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
              style={[styles.checkbox, legalAccepted && styles.checkboxChecked]}
            >
              {legalAccepted ? <Text style={styles.checkmark}>✓</Text> : null}
            </Pressable>
            <Text style={styles.legalText}>
              I agree to the{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(TOS_URL)}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.
            </Text>
          </View>

          <Pressable
            onPress={signInWithGoogle}
            disabled={loading || !legalAccepted}
            style={({ pressed }) => [
              styles.googleButton,
              (loading || !legalAccepted) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#1f1f1f" />
            ) : (
              <>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <Text style={styles.legal}>Development build · using Clerk test keys</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    alignItems: 'center',
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.text.primary,
    letterSpacing: 4,
    fontFamily: theme.font.mono,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: theme.accent.indigo,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    marginTop: spacing.xxl,
    backgroundColor: theme.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text.primary,
    marginBottom: spacing.sm,
  },
  subheading: {
    fontSize: 12,
    color: theme.text.secondary,
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: theme.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.accent.indigo,
    borderColor: theme.accent.indigo,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  legalText: { flex: 1, fontSize: 12, color: theme.text.secondary, lineHeight: 18 },
  legalLink: { color: theme.accent.indigo, textDecorationLine: 'underline' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: '#ffffff',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
    fontFamily: theme.font.mono,
  },
  googleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f1f1f',
    letterSpacing: 0.3,
  },
  errorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255,59,92,0.1)',
    borderColor: 'rgba(255,59,92,0.3)',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  errorText: {
    fontSize: 12,
    color: theme.accent.red,
  },
  legal: {
    marginTop: spacing.xxl,
    fontSize: 10,
    color: theme.text.muted,
    letterSpacing: 0.5,
  },
});
