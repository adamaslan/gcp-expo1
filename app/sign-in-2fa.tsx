import React, { useState, useEffect } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { authLogger } from '@/lib/resilience/auth-logger';

interface TwoFactorState {
  code: string;
  error: string;
  loading: boolean;
}

export default function SignIn2FAScreen() {
  const { signIn, setActive } = useSignIn();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [state, setState] = useState<TwoFactorState>({
    code: '',
    error: '',
    loading: false,
  });

  async function handleVerifyCode() {
    if (!state.code || state.code.length < 6) {
      setState(prev => ({ ...prev, error: 'Please enter a valid code' }));
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
        setState(prev => ({ ...prev, error: 'Verification incomplete. Please try again.' }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      authLogger.error('2fa_failed', 'Two-factor verification failed', err as Error, {});
      setState(prev => ({ ...prev, error: msg }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>Enter the code from your authenticator app</Text>

        {state.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor="#999"
          value={state.code}
          onChangeText={(code) => setState(prev => ({ ...prev, code: code.replace(/\D/g, '').slice(0, 6) }))}
          editable={!state.loading}
          keyboardType="number-pad"
          maxLength={6}
        />

        <Pressable
          style={[styles.button, state.loading && styles.buttonDisabled]}
          onPress={handleVerifyCode}
          disabled={state.loading}
        >
          {state.loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.linkText}>Back to sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  content: {
    width: '85%',
    maxWidth: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 32,
    letterSpacing: 8,
    color: '#333',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  linkText: {
    color: '#4285F4',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
});
