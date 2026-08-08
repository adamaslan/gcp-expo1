import React, { useState, useEffect, useCallback } from 'react';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { theme, radius, spacing } from '@/lib/ui/theme';
import { signInLimiter } from '@/lib/resilience/rate-limiter';
import { authLogger } from '@/lib/resilience/auth-logger';
import { withRetry } from '@/lib/resilience/network-resilience';
import { SESSION_CACHE_KEY, SESSION_TTL_MS } from '@/lib/auth-constants';

WebBrowser.maybeCompleteAuthSession();

const MAX_RETRIES = 3;

interface SignInState {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  oauthLoading: boolean;
}

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();
  const [state, setState] = useState<SignInState>({
    email: '',
    password: '',
    error: '',
    loading: false,
    oauthLoading: false,
  });

  useEffect(() => {
    checkCachedSession();
  }, []);

  async function checkCachedSession() {
    try {
      const cached = await SecureStore.getItemAsync(SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < SESSION_TTL_MS) {
          router.replace('/(tabs)');
        } else {
          await SecureStore.deleteItemAsync(SESSION_CACHE_KEY);
        }
      }
    } catch {
      // cache miss is fine
    }
  }

  async function cacheSession(sessionId: string) {
    try {
      await SecureStore.setItemAsync(
        SESSION_CACHE_KEY,
        JSON.stringify({ sessionId, timestamp: Date.now(), email: state.email })
      );
    } catch (err) {
      console.warn('Failed to cache session:', err);
    }
  }

  async function handleSignIn() {
    if (!isLoaded) return;

    if (!state.email.trim() || !state.password.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter email and password' }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
      setState(prev => ({ ...prev, error: 'Invalid email address' }));
      return;
    }
    if (state.password.length < 6) {
      setState(prev => ({ ...prev, error: 'Password must be at least 6 characters' }));
      return;
    }
    if (signInLimiter.isRateLimited(state.email)) {
      const remaining = signInLimiter.getRemainingAttempts(state.email);
      authLogger.warn('signin_rate_limited', 'Rate limit exceeded', { email: state.email, remaining });
      setState(prev => ({ ...prev, error: `Too many attempts. Try again later. (${remaining} remaining)` }));
      return;
    }

    setState(prev => ({ ...prev, error: '', loading: true }));
    authLogger.info('signin_start', 'Sign-in attempt', { email: state.email });

    try {
      await withRetry(
        async () => {
          const result = await signIn.create({ identifier: state.email, password: state.password });
          if (result.status === 'complete' && result.createdSessionId) {
            await setActive({ session: result.createdSessionId });
            await cacheSession(result.createdSessionId);
            authLogger.info('signin_success', 'Sign-in successful', { email: state.email });
            signInLimiter.reset(state.email);
            router.replace('/(tabs)');
          } else if (result.status === 'needs_second_factor') {
            router.push({ pathname: '/sign-in-2fa', params: { sessionId: result.createdSessionId } });
          } else {
            throw new Error('Sign in incomplete. Please try again.');
          }
        },
        { maxAttempts: MAX_RETRIES, initialDelayMs: 500, maxDelayMs: 5000 }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      authLogger.error('signin_failed', 'Sign-in error', err as Error, { email: state.email });
      setState(prev => ({ ...prev, error: msg }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  const handleGoogleSignIn = useCallback(async () => {
    setState(prev => ({ ...prev, error: '', oauthLoading: true }));
    try {
      const result = await startOAuthFlow({
        redirectUrl: Platform.OS === 'web' ? undefined : 'nuwrrrld://oauth-callback',
      });
      if (result?.createdSessionId && result?.setActive) {
        await result.setActive({ session: result.createdSessionId });
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Google sign-in failed',
      }));
    } finally {
      setState(prev => ({ ...prev, oauthLoading: false }));
    }
  }, [startOAuthFlow]);

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.accent.indigo} />
      </View>
    );
  }

  const busy = state.loading || state.oauthLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>NuWrrrld Financial</Text>
        <Text style={styles.tagline}>Markets · Signals · Intelligence</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Sign in</Text>
          <Text style={styles.subheading}>
            Your session stays active for 1 hour.
          </Text>

          {state.error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.text.muted}
            value={state.email}
            onChangeText={email => setState(prev => ({ ...prev, email }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.text.muted}
            value={state.password}
            onChangeText={password => setState(prev => ({ ...prev, password }))}
            secureTextEntry
            editable={!busy}
          />

          <Pressable
            style={({ pressed }) => [styles.primaryButton, busy && styles.buttonDisabled, pressed && styles.buttonPressed]}
            onPress={handleSignIn}
            disabled={busy}
          >
            {state.loading ? (
              <ActivityIndicator size="small" color={theme.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.googleButton, busy && styles.buttonDisabled, pressed && styles.buttonPressed]}
            onPress={handleGoogleSignIn}
            disabled={busy}
          >
            {state.oauthLoading ? (
              <ActivityIndicator size="small" color="#1f1f1f" />
            ) : (
              <>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/sign-up')} disabled={busy}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </Pressable>

        <Text style={styles.legal}>Secured by Clerk · nuwrrrld.com</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg.base,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl,
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
  errorBox: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderColor: 'rgba(244,63,94,0.3)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: theme.accent.red,
  },
  input: {
    backgroundColor: theme.bg.elevated,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    fontSize: 14,
    color: theme.text.primary,
  },
  primaryButton: {
    backgroundColor: theme.accent.indigo,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border.subtle,
  },
  dividerText: {
    fontSize: 11,
    color: theme.text.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
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
  googleG: {
    fontSize: 16,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  linkText: {
    color: theme.accent.indigo,
    fontSize: 13,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  legal: {
    marginTop: spacing.xl,
    fontSize: 10,
    color: theme.text.muted,
    letterSpacing: 0.5,
  },
});
