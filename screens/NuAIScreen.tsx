import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, KeyboardAvoidingView,
  Platform, Linking,
} from 'react-native';
import { useNuAI } from '../lib/useNuAI';
import { NU_AI_DISCLAIMER } from '../lib/nuai';
import { useSubscription, useEntitlement } from '../lib/useSubscription';
import PaywallScreen from './PaywallScreen';
import { StateView } from '../components/StateView';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

export default function NuAIScreen() {
  const { isLoading: subLoading } = useSubscription();
  const entitled = useEntitlement();
  const { messages, isLoading, error, upgradeRequired, dailyLimitReached, sendMessage } = useNuAI();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  // Wait for subscription status before showing the paywall — prevents flash for pro users.
  if (subLoading) return <StateView state="loading" />;
  if (!entitled('nu_ai') || upgradeRequired) {
    return <PaywallScreen />;
  }

  if (dailyLimitReached) {
    return (
      <View style={styles.limitContainer}>
        <Text style={styles.limitEmoji}>⏰</Text>
        <Text style={styles.limitTitle}>Daily limit reached</Text>
        <Text style={styles.limitSub}>Your Nu AI quota resets at midnight UTC.</Text>
      </View>
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
    // onContentSizeChange on FlatList handles auto-scroll — no manual setTimeout needed.
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤖</Text>
          <Text style={styles.emptyTitle}>Nu AI</Text>
          <Text style={styles.emptySub}>Ask about your portfolio, signals, or market concepts.</Text>
          <Text style={styles.disclaimer}>{NU_AI_DISCLAIMER}</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
              {item.content}
            </Text>
          </View>
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {error && <Text style={styles.errorText}>Error: {error}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask Nu AI…"
          placeholderTextColor="#9ca3af"
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendText}>↑</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => Linking.openURL(`${PORTAL_URL}/terms-of-service`)}>
        <Text style={styles.disclaimer}>Not financial advice · Terms</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  messageList: { padding: 16, flexGrow: 1 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 8 },
  bubbleUser: { backgroundColor: '#2563eb', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: '#f3f4f6', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: '#111', lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: '#f9fafb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111', borderWidth: 1, borderColor: '#e5e7eb' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  disclaimer: { fontSize: 10, color: '#9ca3af', textAlign: 'center', paddingBottom: 8 },
  limitContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  limitEmoji: { fontSize: 40, marginBottom: 12 },
  limitTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  limitSub: { fontSize: 15, color: '#555', textAlign: 'center' },
});
