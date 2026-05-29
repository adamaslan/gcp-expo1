// AI Council composer — combines HoldFold verdicts and gcp3 briefings with ai-text RAG chat.
// Two trader identities, each covering a full spectrum of horizons:
//   - short-term: 1 day / 2–5 days / 1–4 weeks / 30–60 days  (HoldFold context, tactical)
//   - long-term:  2–3 months / 6–12 months / 1–3 years / 3–5 years  (briefing context, strategic)
// Every prompt requires deep analysis grounded in the actual data provided.

import { ragChat, type ChatResponse, type TraderFilterValue } from './aitext';
import type { HoldFoldVerdict } from './holdfold';
import type { MarketOverview, MacroPulse, Signal } from './gcp3';

export type TraderIdentity = 'short_term' | 'long_term';

// Maps the app's internal identity names to the ChromaDB metadata values
// the ai-text backend accepts ("T1" | "T2" | null).
function toTraderFilter(identity: string | null | undefined): TraderFilterValue {
  if (identity === 'short_term') return 'T1';
  if (identity === 'long_term') return 'T2';
  return null;
}

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
    `=== REAL DATA FOR ${v.symbol} ===`,
    `Verdict: ${v.verdict} @ ${v.confidence}% confidence.`,
    `Bias: ${v.bias}. Risk: ${v.risk_level}. Volatility regime: ${v.volatility_regime}.`,
    `Top signals: ${sigs || 'none'}.`,
    `Indicators — RSI: ${fmt(v.rsi)}, MACD: ${fmt(v.macd)}, ADX: ${fmt(v.adx)}, ATR: ${fmt(v.atr)}.`,
    `Primary signal: ${v.primary_signal ?? '—'}. Supporting: ${supporting.join(', ') || '—'}.`,
    ``,
    `=== COUNCIL TASK ===`,
    `You are an AI trading council. Using the EXACT numbers above, deliver a deep analysis of ${v.symbol} across these four short-term horizons. You MUST address at least 3 of them with specific references to the data:`,
    ``,
    `  [1-DAY]   Next session — cite RSI (${fmt(v.rsi)}) and ATR (${fmt(v.atr)}) to judge intraday range and momentum.`,
    `  [2-5 DAY] Swing trade — cite MACD (${fmt(v.macd)}) and primary signal (${v.primary_signal ?? '—'}) to assess short swing.`,
    `  [1-4 WK]  Short-swing — cite ADX (${fmt(v.adx)}), bias (${v.bias}), and risk level (${v.risk_level}) to judge trend strength.`,
    `  [30-60D]  Two-month tactical — cite volatility regime (${v.volatility_regime}) and confidence (${v.confidence}%) to assess medium-run durability.`,
    ``,
    `For each addressed horizon: (a) outlook — bullish/bearish/neutral, (b) the specific data point driving that call, (c) the threshold or level that would invalidate it.`,
    `Then: recommended entry, exit, and stop for the highest-conviction horizon. One biggest counter-argument across all horizons. (~220 words)`,
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
  const sp = ov?.sp500 ?? 'n/a';
  const nasdaq = ov?.nasdaq ?? 'n/a';
  const vix = ov?.vix ?? 'n/a';
  const macroSentiment = mp?.sentiment ?? 'n/a';
  const macroScore = mp?.score != null ? mp.score : 'n/a';

  return [
    `=== REAL MARKET DATA ===`,
    ov
      ? `Market status: ${ov.market_status ?? '—'}. S&P 500: ${sp}, NASDAQ: ${nasdaq}, VIX: ${vix}.`
      : `Market overview: unavailable.`,
    mp
      ? `Macro pulse: ${macroSentiment} (score ${macroScore}). ${mp.summary ?? ''}`
      : `Macro pulse: unavailable.`,
    `Top signals today: ${topSignals || 'none'}.`,
    ``,
    `=== COUNCIL TASK ===`,
    `You are an AI investment council. Using the EXACT figures above, deliver a deep analysis across these four long-term horizons. You MUST address at least 3 of them with specific references to the data:`,
    ``,
    `  [2-3 MO]  Tactical / earnings cycle — cite macro score (${macroScore}) and VIX (${vix}) to judge near-term risk appetite.`,
    `  [6-12 MO] Sector rotation / trend — cite S&P (${sp}) and macro sentiment (${macroSentiment}) to assess regime direction.`,
    `  [1-3 YR]  Business cycle — cite NASDAQ (${nasdaq}) relative to S&P and macro summary to judge cycle phase.`,
    `  [3-5 YR]  Structural / generational — cite which of today's signals represent lasting structural shifts vs. cyclical noise.`,
    ``,
    `For each addressed horizon: (a) signal or noise — and precisely why, (b) what data point is the lead indicator, (c) what would need to change to flip your view.`,
    `Then: one concrete portfolio tilt defensible across the most relevant horizons, with sizing rationale. (~260 words)`,
  ].join('\n');
}

// --- Conversational prompt builders (Chat screen — no live verdict/briefing context) ---

export function buildShortTermChat(question: string): string {
  return [
    `User question: ${question}`,
    ``,
    `You are an AI trading council. Answer with deep analysis across these four short-term horizons (1 day through 60 days). You MUST explicitly name and address at least 3 of them:`,
    ``,
    `  [1-DAY]   Next session — momentum and intraday range`,
    `  [2-5 DAY] Swing trade — technical setup and catalyst timing`,
    `  [1-4 WK]  Short-swing — trend strength and regime`,
    `  [30-60D]  Two-month tactical — durability and macro tail risk`,
    ``,
    `For each addressed horizon: directional take (bullish/bearish/neutral), the key driver, and what would invalidate it. Cite any specific prices, levels, or indicator values mentioned in the question. Then give concrete entry, exit, and stop for the highest-conviction horizon. (~200 words)`,
  ].join('\n');
}

export function buildLongTermChat(question: string): string {
  return [
    `User question: ${question}`,
    ``,
    `You are an AI investment council. Answer with deep analysis across these four long-term horizons (2 months through 5 years). You MUST explicitly name and address at least 3 of them:`,
    ``,
    `  [2-3 MO]  Tactical / earnings cycle — near-term risk appetite`,
    `  [6-12 MO] Sector rotation / trend — regime direction`,
    `  [1-3 YR]  Business cycle — macro regime and cycle phase`,
    `  [3-5 YR]  Structural / generational — lasting shifts vs. cyclical noise`,
    ``,
    `For each addressed horizon: does the answer change across timeframes and why? Cite any specific prices, valuations, or macro figures mentioned in the question. Then give one concrete portfolio action defensible across the most relevant horizons, with sizing rationale. (~240 words)`,
  ].join('\n');
}

// --- Agreement: synthesize across the full horizon spectrum ---

export function buildAgreementPrompt(question: string, shortView: string, longView: string): string {
  return [
    `Original question: ${question}`,
    ``,
    `SHORT-TERM COUNCIL VIEW (1-day / 2-5 days / 1-4 weeks / 30-60 days):`,
    shortView,
    ``,
    `LONG-TERM COUNCIL VIEW (2-3 months / 6-12 months / 1-3 years / 3-5 years):`,
    longView,
    ``,
    `You are an AI council synthesizing the above. Using the specific data and reasoning cited in both views, output the BEST OVERALL decision defensible across the full 1-day-to-5-year spectrum.`,
    ``,
    `Structure your response as:`,
    `1. Agreed action (one sentence, include a specific price level or indicator value from the data).`,
    `2. Short-term horizons that support this action — name each and state why.`,
    `3. Long-term horizons that support this action — name each and state why.`,
    `4. Horizon conflicts — which short and long horizons disagree, and the exact tension.`,
    `5. Resolution — how a trader holding both timeframes should weight and act on those conflicts.`,
    `6. Execution — entry, position size, and exit for the primary horizon, with a stop tied to a specific level or indicator.`,
    `(~300 words)`,
  ].join('\n');
}

// --- Composer ---

export function askCouncil(prompt: string, traderFilter?: string | null): Promise<ChatResponse> {
  return ragChat({ message: prompt, trader_filter: toTraderFilter(traderFilter) });
}
