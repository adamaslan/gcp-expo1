import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme, radius, spacing } from '@/lib/ui/theme';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

interface SignUpState {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  error: string;
  loading: boolean;
  pendingVerification: boolean;
  code: string;
}

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [state, setState] = useState<SignUpState>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    error: '',
    loading: false,
    pendingVerification: false,
    code: '',
  });

  function validateInputs(): string | null {
    if (!state.email || !state.password || !state.confirmPassword) {
      return 'All fields are required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
      return 'Please enter a valid email';
    }
    if (state.password.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
    if (!PASSWORD_REGEX.test(state.password)) {
      return 'Password must include uppercase, lowercase, number, and special character';
    }
    if (state.password !== state.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  }

  async function handleSignUp() {
    if (!isLoaded) return;

    const validationError = validateInputs();
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }));
      return;
    }

    setState(prev => ({ ...prev, error: '', loading: true }));
    try {
      const result = await signUp.create({
        emailAddress: state.email,
        password: state.password,
        firstName: state.firstName || undefined,
        lastName: state.lastName || undefined,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else if (result.status === 'missing_requirements') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setState(prev => ({ ...prev, pendingVerification: true }));
      } else {
        setState(prev => ({ ...prev, error: 'Sign up failed. Please try again.' }));
      }
    } catch (err: unknown) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Sign up failed' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  async function handleVerifyCode() {
    if (!signUp) {
      return;
    }

    if (!state.code) {
      setState(prev => ({ ...prev, error: 'Please enter the verification code' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: state.code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setState(prev => ({ ...prev, error: 'Verification failed. Check your code and try again.' }));
      }
    } catch (err: unknown) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Verification failed' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  if (state.pendingVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredContent}>
          <Text style={styles.brand}>NuWrrrld Financial</Text>
          <Text style={styles.tagline}>Markets · Signals · Intelligence</Text>

          <View style={styles.card}>
            <Text style={styles.heading}>Check your email</Text>
            <Text style={styles.subheading}>
              We sent a 6-digit code to {state.email}
            </Text>

            {state.error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{state.error}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor={theme.text.muted}
              value={state.code}
              onChangeText={code => setState(prev => ({ ...prev, code: code.replace(/\D/g, '').slice(0, 6) }))}
              keyboardType="number-pad"
              maxLength={6}
              editable={!state.loading}
              textAlign="center"
            />

            <Pressable
              style={({ pressed }) => [styles.primaryButton, state.loading && styles.buttonDisabled, pressed && styles.buttonPressed]}
              onPress={handleVerifyCode}
              disabled={state.loading}
            >
              {state.loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify Email</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setState(prev => ({ ...prev, pendingVerification: false }))} disabled={state.loading}>
              <Text style={styles.linkText}>Back to sign up</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>NuWrrrld Financial</Text>
        <Text style={styles.tagline}>Markets · Signals · Intelligence</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.subheading}>Join to access signals and verdicts.</Text>

          {state.error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          ) : null}

          <View style={styles.nameRow}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="First name"
              placeholderTextColor={theme.text.muted}
              value={state.firstName}
              onChangeText={firstName => setState(prev => ({ ...prev, firstName }))}
              editable={!state.loading}
              autoCorrect={false}
            />
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="Last name"
              placeholderTextColor={theme.text.muted}
              value={state.lastName}
              onChangeText={lastName => setState(prev => ({ ...prev, lastName }))}
              editable={!state.loading}
              autoCorrect={false}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.text.muted}
            value={state.email}
            onChangeText={email => setState(prev => ({ ...prev, email }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!state.loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.text.muted}
            value={state.password}
            onChangeText={password => setState(prev => ({ ...prev, password }))}
            secureTextEntry
            editable={!state.loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={theme.text.muted}
            value={state.confirmPassword}
            onChangeText={confirmPassword => setState(prev => ({ ...prev, confirmPassword }))}
            secureTextEntry
            editable={!state.loading}
          />

          <Text style={styles.passwordHint}>
            Min 8 chars · uppercase · lowercase · number · special character
          </Text>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, state.loading && styles.buttonDisabled, pressed && styles.buttonPressed]}
            onPress={handleSignUp}
            disabled={state.loading}
          >
            {state.loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/sign-in')} disabled={state.loading}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
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
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 0,
  },
  nameInput: {
    flex: 1,
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
  otpInput: {
    backgroundColor: theme.bg.elevated,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    fontSize: 32,
    letterSpacing: 10,
    color: theme.text.primary,
  },
  passwordHint: {
    fontSize: 10,
    color: theme.text.muted,
    marginBottom: spacing.md,
    lineHeight: 15,
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
