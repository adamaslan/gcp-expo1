import React, { useEffect, useState, useRef } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { theme, radius, spacing } from '@/lib/ui/theme';
import { authLogger } from '@/lib/resilience/auth-logger';

interface TwoFactorState {
  code: string;
  error: string;
  loading: boolean;
}

export default function SignIn2FAScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  useLocalSearchParams<{ sessionId: string }>();
  const inputRef = useRef<TextInput>(null);
  const [state, setState] = useState<TwoFactorState>({
    code: '',
    error: '',
    loading: false,
  });

  // Guard against cold reload: signIn is null when the 2FA screen is
  // opened directly without completing step 1 in the same React tree.
  useEffect(() => {
    if (isLoaded && !signIn) {
      router.replace('/sign-in');
    }
  }, [isLoaded, signIn, router]);

  if (!isLoaded || !signIn) {
    return null;
  }

  async function handleVerifyCode() {
    if (!signIn) {
      return;
    }

    if (!state.code || state.code.length < 6) {
      setState(prev => ({ ...prev, error: 'Please enter the full 6-digit code' }));
      return;
    }

    setState(prev => ({ ...prev, error: '', loading: true }));
    authLogger.info('2fa_attempt', 'Two-factor code verification attempt', {});

    try {
      const result = await signIn.attemptSecondFactor({ strategy: 'totp', code: state.code });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        authLogger.info('2fa_success', 'Two-factor verification successful', {});
        router.replace('/(tabs)');
      } else {
        authLogger.warn('2fa_incomplete', 'Verification incomplete', { status: result.status });
        setState(prev => ({ ...prev, error: 'Verification incomplete. Please try again.', code: '' }));
        inputRef.current?.focus();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      authLogger.error('2fa_failed', 'Two-factor verification failed', err as Error, {});
      setState(prev => ({ ...prev, error: msg, code: '' }));
      inputRef.current?.focus();
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>NuWrrrld Financial</Text>
        <Text style={styles.tagline}>Markets · Signals · Intelligence</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Two-factor auth</Text>
          <Text style={styles.subheading}>
            Enter the 6-digit code from your authenticator app.
          </Text>

          {state.error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          ) : null}

          <TextInput
            ref={inputRef}
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor={theme.text.muted}
            value={state.code}
            onChangeText={code =>
              setState(prev => ({ ...prev, code: code.replace(/\D/g, '').slice(0, 6) }))
            }
            keyboardType="number-pad"
            maxLength={6}
            editable={!state.loading}
            autoFocus
            textAlign="center"
            onSubmitEditing={handleVerifyCode}
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              state.loading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleVerifyCode}
            disabled={state.loading}
          >
            {state.loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} disabled={state.loading}>
            <Text style={styles.linkText}>Back to sign in</Text>
          </Pressable>
        </View>

        <Text style={styles.legal}>Secured by Clerk · nuwrrrld.com</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
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
  otpInput: {
    backgroundColor: theme.bg.elevated,
    borderWidth: 1,
    borderColor: theme.border.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    fontSize: 36,
    letterSpacing: 12,
    color: theme.text.primary,
    fontFamily: theme.font.mono,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  linkText: {
    color: theme.accent.indigo,
    fontSize: 13,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  legal: {
    marginTop: spacing.xxl,
    fontSize: 10,
    color: theme.text.muted,
    letterSpacing: 0.5,
  },
});
