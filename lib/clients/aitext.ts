// Mirrors four route.ts files in ai-text-opt-1024/backend/app/api/
//   app/api/chat/route.ts
//   app/api/swing/runs/route.ts          (proxies gcp3; prefer gcp3 direct on mobile)
//   app/api/swing/runs/[id]/route.ts
//   app/api/swing/runs/[id]/chat/route.ts
//   app/api/swing-predictions/route.ts
//   app/api/health/route.ts

import { httpJson } from '../http';

const BASE_URL =
  process.env.EXPO_PUBLIC_AITEXT_BACKEND_URL || 'http://localhost:3002';

// --- Chat / RAG types (matches the contract consumed by holdemfoldemapp AiCouncilCommentary) ---

export type TraderFilterValue = 'T1' | 'T2' | null;

export interface ChatRequest {
  message: string;
  trader_filter?: TraderFilterValue;
}

export interface CouncilSource {
  text_preview: string;
  source_file: string;
  chunk_index: number;
  distance: number;
  rerank_score: number;
}

export interface ChatResponse {
  answer: string;
  llm_provider: string;
  sources: CouncilSource[];
  context_empty: boolean;
}

export function ragChat(req: ChatRequest): Promise<ChatResponse> {
  return httpJson<ChatResponse>(BASE_URL, '/api/chat', {
    method: 'POST',
    body: req,
    timeoutMs: 30_000,
  });
}

// --- Swing runs via ai-text proxy ---
// Prefer gcp3 direct (lib/clients/gcp3.ts) when EXPO_PUBLIC_GCP3_BACKEND_URL is set.

export interface SwingRun {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  result?: unknown;
  created_at?: string;
}

export function listSwingRuns(): Promise<SwingRun[]> {
  return httpJson<SwingRun[]>(BASE_URL, '/api/swing/runs', { timeoutMs: 5_000 });
}

export function startSwingRun(payload?: Record<string, unknown>): Promise<SwingRun> {
  return httpJson<SwingRun>(BASE_URL, '/api/swing/runs', {
    method: 'POST',
    body: payload ?? {},
    timeoutMs: 30_000,
  });
}

export function getSwingRun(id: string): Promise<SwingRun> {
  return httpJson<SwingRun>(BASE_URL, `/api/swing/runs/${id}`, { timeoutMs: 10_000 });
}

export function chatSwingRun(id: string, message: string): Promise<{ reply: string }> {
  return httpJson<{ reply: string }>(BASE_URL, `/api/swing/runs/${id}/chat`, {
    method: 'POST',
    body: { message },
    timeoutMs: 30_000,
  });
}

export function getSwingPredictionsAiText(): Promise<unknown[]> {
  return httpJson<unknown[]>(BASE_URL, '/api/swing-predictions', { timeoutMs: 5_000 });
}

export function healthAiText(): Promise<{ status: string }> {
  return httpJson<{ status: string }>(BASE_URL, '/api/health', { timeoutMs: 3_000 });
}
