import { httpJson } from '../http';

const BASE_URL =
  process.env.EXPO_PUBLIC_HOLDFOLD_BACKEND_URL || 'http://localhost:8081';

// --- Request ---

export interface AnalyzeRequest {
  symbol: string;
  period?: string;               // e.g. "3mo", "6mo", "1y"
  options_strategy?: string;     // e.g. "moderate", "aggressive"
  position_lots?: number;
}

// --- Response: matches the contract used by holdemfoldemapp/frontend ---
// Source of truth: AiCouncilCommentary.tsx CouncilVerdict + main.py response

export type Verdict = 'HOLD EM' | 'FOLD EM' | 'NEUTRAL';

export interface TopSignal {
  signal: string;
  strength: string;
}

export interface FibLevel {
  level: string;
  price: number;
}

export interface OptionsStrategySummary {
  strategy: string;
  description?: string;
  max_profit?: number;
  max_loss?: number;
}

export interface HoldFoldVerdict {
  symbol: string;
  verdict: Verdict;
  confidence: number;
  bias: string;
  risk_level: string;
  volatility_regime: string;
  top_signals: TopSignal[];
  rsi: number | null;
  macd: number | null;
  adx: number | null;
  atr: number | null;
  primary_signal: string | null;
  supporting_signals: string[];
  current_price?: number;
  position_pnl?: number;
  fib_levels?: FibLevel[];
  options_strategy?: OptionsStrategySummary;
  reasoning?: string;
  cached?: boolean;
  cache_age_seconds?: number;
}

export function analyzeHoldFold(req: AnalyzeRequest): Promise<HoldFoldVerdict> {
  return httpJson<HoldFoldVerdict>(BASE_URL, '/api/analyze', {
    method: 'POST',
    body: req,
    timeoutMs: 30_000,
  });
}

export function healthHoldFold(): Promise<{ status: string }> {
  return httpJson<{ status: string }>(BASE_URL, '/health', { timeoutMs: 3_000 });
}
