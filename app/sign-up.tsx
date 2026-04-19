import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Text, TextInput, Pressable, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

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
    if (!state.email.includes('@')) {
      return 'Please enter a valid email';
    }
    if (state.password.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
    if (!PASSWORD_REGEX.test(state.password)) {
      return 'Password must contain uppercase, lowercase, number, and special character';
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
        firstName: state.firstName,
        lastName: state.lastName,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else if (result.status === 'missing_requirements') {
        setState(prev => ({ ...prev, pendingVerification: true }));
      } else {
        setState(prev => ({ ...prev, error: 'Sign up failed. Please try again.' }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setState(prev => ({ ...prev, error: msg }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  async function handleVerificationCode() {
    if (!state.code) {
      setState(prev => ({ ...prev, error: 'Please enter the verification code' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: state.code });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setState(prev => ({ ...prev, error: 'Verification failed. Check your code and try again.' }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setState(prev => ({ ...prev, error: msg }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  if (state.pendingVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>Enter the code sent to {state.email}</Text>

          {state.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Verification code"
            value={state.code}
            onChangeText={(code) => setState(prev => ({ ...prev, code }))}
            keyboardType="number-pad"
            maxLength={6}
            editable={!state.loading}
          />

          <Pressable
            style={[styles.button, state.loading && styles.buttonDisabled]}
            onPress={handleVerificationCode}
            disabled={state.loading}
          >
            {state.loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>

          {state.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={state.firstName}
            onChangeText={(firstName) => setState(prev => ({ ...prev, firstName }))}
            editable={!state.loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={state.lastName}
            onChangeText={(lastName) => setState(prev => ({ ...prev, lastName }))}
            editable={!state.loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={state.email}
            onChangeText={(email) => setState(prev => ({ ...prev, email }))}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!state.loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={state.password}
            onChangeText={(password) => setState(prev => ({ ...prev, password }))}
            secureTextEntry
            editable={!state.loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={state.confirmPassword}
            onChangeText={(confirmPassword) => setState(prev => ({ ...prev, confirmPassword }))}
            secureTextEntry
            editable={!state.loading}
          />

          <Pressable
            style={[styles.button, state.loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={state.loading}
          >
            {state.loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/sign-in')}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 400,
    marginHorizontal: 'auto',
    paddingVertical: 20,
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
    marginBottom: 12,
    fontSize: 14,
    color: '#333',
  },
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
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
