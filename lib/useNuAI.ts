import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import type { ChatMessage, ChatRequest, ChatResponse } from './nuai';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

interface NuAIState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  upgradeRequired: boolean;
  dailyLimitReached: boolean;
  sendMessage: (text: string, portfolioContext?: string[]) => Promise<void>;
  clearMessages: () => void;
}

export function useNuAI(): NuAIState {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const sendMessage = useCallback(async (text: string, portfolioContext?: string[]) => {
    const userMessage: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const previousMessages = messages;
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const body: ChatRequest = { messages: nextMessages, portfolioContext };
      const res = await fetch(`${PORTAL_URL}/api/nuai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.status === 403) {
        setMessages(previousMessages); // rollback optimistic message
        setUpgradeRequired(true);
        return;
      }
      if (res.status === 429) {
        setMessages(previousMessages); // rollback optimistic message
        setDailyLimitReached(true);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: ChatResponse = await res.json();
      setMessages(m => [...m, data.message]);
    } catch (err) {
      setMessages(previousMessages); // rollback on network/parse error
      setError(err instanceof Error ? err.message : 'Failed to reach Nu AI');
    } finally {
      setIsLoading(false);
    }
  }, [messages, getToken]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setUpgradeRequired(false);
    setDailyLimitReached(false);
  }, []);

  return { messages, isLoading, error, upgradeRequired, dailyLimitReached, sendMessage, clearMessages };
}
