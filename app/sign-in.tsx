import React, { useState, useEffect } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { signInLimiter } from '@/lib/resilience/rate-limiter';
import { authLogger } from '@/lib/resilience/auth-logger';
import { withRetry } from '@/lib/resilience/network-resilience';

const MAX_RETRIES = 3;
const OFFLINE_MODE_KEY = 'offline_auth_session';
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

interface SignInState {
  email: string;
  password: string;
  error: string;
  loading: boolean;
}

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [state, setState] = useState<SignInState>({
    email: '',
    password: '',
    error: '',
    loading: false,
  });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    checkCachedSession();
  }, []);

  async function checkCachedSession() {
    try {
      const cachedSession = await SecureStore.getItemAsync(OFFLINE_MODE_KEY);
      if (cachedSession) {
        const parsedSession = JSON.parse(cachedSession);
        const isValid = Date.now() - parsedSession.timestamp < SESSION_TIMEOUT_MS;
        if (isValid) {
          router.replace('/(tabs)');
        } else {
          await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
        }
      }
    } catch (err) {
      console.log('Cache check failed:', err);
    }
  }

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPassword = (password: string): boolean => {
    return password.length >= 6;
  };

  async function cacheSession(sessionId: string) {
    try {
      const sessionData = JSON.stringify({
        sessionId,
        timestamp: Date.now(),
        email: state.email,
      });
      await SecureStore.setItemAsync(OFFLINE_MODE_KEY, sessionData);
    } catch (err) {
      console.warn('Failed to cache session:', err);
    }
  }

  async function handleSignIn() {
    if (!isLoaded) return;

    // Validation
    if (!state.email.trim() || !state.password.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter email and password' }));
      return;
    }

    if (!isValidEmail(state.email)) {
      setState(prev => ({ ...prev, error: 'Invalid email address' }));
      return;
    }

    if (!isValidPassword(state.password)) {
      setState(prev => ({ ...prev, error: 'Password must be at least 6 characters' }));
      return;
    }

    // Rate limiting
    if (signInLimiter.isRateLimited(state.email)) {
      const remaining = signInLimiter.getRemainingAttempts(state.email);
      authLogger.warn('signin_rate_limited', 'Rate limit exceeded', { email: state.email, remaining });
      setState(prev => ({ ...prev, error: `Too many attempts. Try again later. (${remaining} remaining)` }));
      return;
    }

    setState(prev => ({ ...prev, error: '', loading: true }));
    setRetryCount(0);
    authLogger.info('signin_start', 'Sign-in attempt', { email: state.email });

    try {
      await withRetry(
        async () => {
          const result = await signIn.create({ identifier: state.email, password: state.password });

          if (result.status === 'complete') {
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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Enter your credentials</Text>

        {state.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={state.email}
          onChangeText={(email) => setState(prev => ({ ...prev, email }))}
          editable={!state.loading}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={state.password}
          onChangeText={(password) => setState(prev => ({ ...prev, password }))}
          secureTextEntry
          editable={!state.loading}
        />

        <Pressable
          style={[styles.button, state.loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={state.loading}
        >
          {state.loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/sign-up')}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
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
    fontSize: 14,
    color: '#333',
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
