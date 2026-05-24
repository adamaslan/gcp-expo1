// AI Council composer — combines HoldFold verdicts and gcp3 briefings with ai-text RAG chat.
// Two trader identities:
//   - short-term: HoldFold context, tactical, today's verdict
//   - long-term:  Market briefing context, strategic, multi-week outlook

import { ragChat, type ChatResponse } from './aitext';
import type { HoldFoldVerdict } from './holdfold';
import type { MarketOverview, MacroPulse, Signal } from './gcp3';

export type TraderIdentity = 'short_term' | 'long_term';

// --- Prompt builders ---

export function buildShortTermPrompt(v: HoldFoldVerdict): string {
  const topSignals = Array.isArray(v.top_signals) ? v.top_signals : [];
  const sigs = topSignals
    .slice(0, 5)
    .map((s) => `${s?.signal ?? '—'} (${s?.strength ?? '—'})`)
    .join(', ');
  const supporting = Array.isArray(v.supporting_signals) ? v.supporting_signals : [];
  const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? 'n/a' : n.toFixed(2);
  return [
    `Verdict for ${v.symbol}: ${v.verdict} @ ${v.confidence}% confidence.`,
    `Bias: ${v.bias}. Risk: ${v.risk_level}. Vol regime: ${v.volatility_regime}.`,
    `Top signals: ${sigs || 'none'}.`,
    `Indicators — RSI: ${fmt(v.rsi)}, MACD: ${fmt(v.macd)}, ADX: ${fmt(v.adx)}, ATR: ${fmt(v.atr)}.`,
    `Primary: ${v.primary_signal ?? '—'}. Supporting: ${supporting.join(', ') || '—'}.`,
    ``,
    `As an AI trading council speaking to a SHORT-TERM trader, comment on whether these signals and indicators justify the ${v.verdict} verdict for the next 1-5 trading days. Identify the strongest tactical evidence and the biggest counter-argument. Address entry/exit timing and stop placement. Be concise (~150 words).`,
  ].join('\n');
}

export function buildLongTermPrompt(ctx: {
  overview?: MarketOverview;
  macro?: MacroPulse;
  signals?: Signal[];
}): string {
  const ov = ctx.overview;
  const mp = ctx.macro;
  const signalsArr = Array.isArray(ctx.signals) ? ctx.signals : [];
  const topSignals = signalsArr
    .slice(0, 8)
    .map((s) => `${s?.ticker ?? '?'}:${s?.signal ?? '—'}${s?.confidence != null ? `(${Math.round(s.confidence * 100)}%)` : ''}`)
    .join(', ');

  return [
    `Market context:`,
    ov ? `- Status: ${ov.market_status ?? '—'}. S&P: ${ov.sp500 ?? '—'}, NASDAQ: ${ov.nasdaq ?? '—'}, VIX: ${ov.vix ?? '—'}.` : `- Overview: unavailable.`,
    mp ? `- Macro pulse: ${mp.sentiment}${mp.score != null ? ` (score ${mp.score})` : ''}. ${mp.summary ?? ''}` : `- Macro: unavailable.`,
    `- Today's signals: ${topSignals || 'none'}.`,
    ``,
    `As an AI investment council speaking to a LONG-TERM trader (3-12 month horizon), interpret this snapshot. Focus on sector rotation, regime change, and positioning — not day-trade tactics. Identify what matters this quarter vs. noise, and one concrete portfolio tilt to consider. Be concise (~200 words).`,
  ].join('\n');
}

// --- Conversational prompt builders (for Chat screen, no verdict context) ---

export function buildShortTermChat(question: string): string {
  return [
    `User question: ${question}`,
    ``,
    `Answer as an AI trading council speaking to a SHORT-TERM trader (1-5 day horizon). Focus on tactical entries, exits, stop placement, and technical setups. If the question is not about a specific setup, still frame your answer in terms of how a short-term trader would act on it. Be concise (~150 words).`,
  ].join('\n');
}

export function buildLongTermChat(question: string): string {
  return [
    `User question: ${question}`,
    ``,
    `Answer as an AI investment council speaking to a LONG-TERM trader (3-12 month horizon). Focus on sector rotation, regime change, valuation, and positioning. If the question is not about positioning, still frame your answer in terms of how a long-term investor would interpret it. Be concise (~200 words).`,
  ].join('\n');
}

// --- Agreement: synthesize best-overall take across both horizons ---

export function buildAgreementPrompt(question: string, shortView: string, longView: string): string {
  return [
    `Original question: ${question}`,
    ``,
    `SHORT-TERM trader view (1-5 day horizon):`,
    shortView,
    ``,
    `LONG-TERM trader view (3-12 month horizon):`,
    longView,
    ``,
    `You are an AI council synthesizing the above two viewpoints. Output the BEST OVERALL decision that is defensible from BOTH horizons — not a wishy-washy compromise, but a single concrete take that respects what's true in both timeframes.`,
    `Structure your response as:`,
    `1. The agreed-on action (one sentence).`,
    `2. What the short-term view contributes (entry, exit, stop).`,
    `3. What the long-term view contributes (thesis, hold rationale, position size).`,
    `4. Where the two views genuinely disagree, and how a trader who holds both should resolve it.`,
    `Be concise (~250 words).`,
  ].join('\n');
}

// --- Composer ---

export function askCouncil(prompt: string, traderFilter?: string | null): Promise<ChatResponse> {
  return ragChat({ message: prompt, trader_filter: traderFilter ?? null });
}
