/**
 * Sign-in screen with client-side validation and error handling
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';

interface SignInState {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  isLoaded: boolean;
}

export default function SignInScreen() {
  const [state, setState] = useState<SignInState>({
    email: '',
    password: '',
    error: '',
    loading: false,
    isLoaded: true,
  });

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate password length
  const isValidPassword = (password: string): boolean => {
    return password.length >= 6;
  };

  async function handleSignIn() {
    // Guard: Check if loaded
    if (!state.isLoaded) return;

    // Client-side validation
    if (!state.email.trim() || !state.password.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter email and password' }));
      return;
    }

    if (!isValidEmail(state.email)) {
      setState(prev => ({ ...prev, error: 'Please enter a valid email address' }));
      return;
    }

    if (!isValidPassword(state.password)) {
      setState(prev => ({ ...prev, error: 'Password must be at least 6 characters' }));
      return;
    }

    setState(prev => ({ ...prev, error: '', loading: true }));

    try {
      // In a real app, call authentication API
      // const result = await signIn.create({ identifier: email, password });
      // await setActive({ session: result.createdSessionId });

      // Mock success
      console.log('Sign-in attempt with:', state.email);
      Alert.alert('Success', `Signed in as ${state.email}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign-in failed';
      setState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Enter your credentials to continue</Text>

        {state.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email address"
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

        <Text style={styles.helpText}>
          Demo mode: Use any email and password (min 6 chars)
        </Text>
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
  helpText: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
