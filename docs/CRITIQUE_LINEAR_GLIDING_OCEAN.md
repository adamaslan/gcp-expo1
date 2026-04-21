# Critical Review: `linear-gliding-ocean.md` — 50 Suggestions for 500% Robustness

**Target plan:** `/Users/adamaslan/.claude/plans/linear-gliding-ocean.md`
**Critic stance:** Adversarial — this review assumes the plan is the *floor*, not the ceiling, and that the goal is autonomous AI agents driving 7 endpoints into a mobile nav bar with full observability, multi-timeframe signals, and real decision-making authority.

**Context about the 7 nav-bar endpoints (as inferred from backend consolidation):**
1. `/industry-intel` — sector/industry heatmap
2. `/signals` — per-ticker + industry AI signals
3. `/industry-returns` — multi-period returns
4. `/screener` — ranked tickers
5. `/market-overview` — AI brief + sentiment + history
6. `/content` — blog, review, correlation, story
7. `/macro-pulse` — regime indicators

The original plan makes each of these "slightly smarter." This critique argues they should become **agentic surfaces** — each backed by an autonomous AI that owns its own memory, tools, evaluation, and self-correction loop.

---

## Section A — Plan's Core Weaknesses (Why "50% More AI" Is Not Enough)

### 1. No AI Evaluation Harness
The plan swaps rule-based signals for Gemini calls with zero regression testing. **Fix:** Build a golden-dataset eval harness (`backend/evals/`) that replays 90 days of historical market data and compares Gemini vs. rule-based signals on hit rate, Sharpe, and decision-consistency. No Gemini call ships without passing evals.

### 2. No Confidence Scoring
Plan returns `strong_buy|buy|hold|sell|strong_sell` — categorical, no uncertainty. **Fix:** Every AI output must return `{signal, confidence: 0-1, rationale, evidence_refs: []}`. Mobile UI renders opacity/border-width proportional to confidence so users see conviction, not just direction.

### 3. Single Timeframe Tyranny
`screener._ai_signal()` uses only today's change_pct. Real traders need 1D/5D/1M/3M/6M/1Y. **Fix:** Every signal endpoint returns a **multi-timeframe matrix** — `{1D: buy, 5D: hold, 1M: strong_buy, 3M: buy, 6M: hold, 1Y: sell}`. Divergence across timeframes is itself a signal (short-term bullish + long-term bearish = mean-reversion setup).

### 4. No Signal Provenance / Explainability
Gemini says "strong_buy" — why? The plan doesn't capture the *evidence chain*. **Fix:** Store each signal with `evidence: [{source: "macro_regime", value: "Risk-On"}, {source: "sector_rotation", rank: 2}, {source: "volume", z_score: 2.3}]`. Mobile tap-to-expand shows the chain.

### 5. Gemini-Only Monoculture
All AI eggs in one basket (Gemini Flash). **Fix:** Wrap all AI calls in a `ModelRouter` that can hot-swap between Gemini Flash (fast, cheap), Gemini Pro (deep reasoning for daily synthesis), and Claude via Vertex (for blog/review/long-form). Route by task type and degrade gracefully.

### 6. No Prompt Versioning
`_build_prompt()` is inline string concatenation in `ai_summary.py`. When you iterate on prompts, you lose history. **Fix:** Move all prompts to `backend/prompts/{name}_v{n}.txt`, track `prompt_version` in cached output, enable A/B via env var `PROMPT_VERSION_SCREENER=3`.

### 7. No Output Schema Validation
Plan says "parse JSON, fall back on parse error." Too lax — a schema drift silently degrades quality. **Fix:** Every Gemini response validated with Pydantic `BaseModel`. Validation failure → retry with `response_schema` constraint → rule-based fallback as last resort.

### 8. No Grounding / Real-Time News Hook
Plan mentions Vertex grounding in passing but doesn't use it. The macro regime is stale the moment a Fed speech drops. **Fix:** Enable Vertex AI Grounding with Google Search for `ai_summary.py` and `macro_pulse.py` — responses cite live news URLs. Cache grounded responses with 30-min TTL (shorter than ungrounded 8h).

### 9. No Agent Loop — It's All One-Shot
Every AI call is fire-and-forget. A real autonomous agent would: observe → reason → call tools → observe again → decide. **Fix:** Introduce **ReAct-style agents** for high-stakes endpoints (`/macro-pulse`, `/market-overview`) that can call tools (`fetch_news(ticker)`, `compute_return(symbol, period)`, `check_earnings_date(ticker)`) before finalizing a signal.

### 10. No Cost Telemetry
The plan doesn't track Gemini token spend per endpoint. First surprise bill = project cancelled. **Fix:** Structured log every AI call with `{endpoint, model, input_tokens, output_tokens, cost_usd, latency_ms}`. Emit to Cloud Logging with a log-based metric → Cloud Monitoring dashboard.

---

## Section B — Signal Engineering (Stronger, Multi-Timeframe, Composable)

### 11. Bollinger Band Position as Feature
Current signals ignore volatility context. **Fix:** Add `bb_position: {upper: bool, middle: bool, lower: bool}` per timeframe for every ticker. Feed to Gemini prompt so it knows "AAPL is +3% but still under the 20-day middle band" ≠ "AAPL is +3% breaking the upper band."

### 12. Volume Z-Score, Not Just Volume
Raw volume tells nothing. **Fix:** Compute `volume_z_score` = (today_vol - 20d_avg) / 20d_stddev. Z > 2 = meaningful accumulation. Feed every Gemini signal call.

### 13. RSI Divergence Detection
**Fix:** Compute RSI(14) on 1D/1W/1M bars. Add `divergence: "bullish" | "bearish" | "none"` when price and RSI diverge. This is a classic mean-reversion tell. Store in `technical_signals` cache.

### 14. MACD Cross State
**Fix:** Add `macd_state: {above_signal: bool, days_since_cross: int, histogram_direction: "expanding"|"contracting"}` per ticker. Feed Gemini so it reasons about momentum regime, not just current price.

### 15. Correlation Matrix Refresh (Daily)
Plan has `correlation_article` but no underlying correlation *data*. **Fix:** Compute rolling 30-day ticker correlation matrix nightly → BigQuery table. AI uses it to detect clustering (e.g., "all semiconductors moving together = sector story, not stock-specific").

### 16. Regime Transition Probability
Instead of binary Risk-On/Risk-Off, output `{risk_on: 0.65, risk_off: 0.20, transitional: 0.15}`. **Fix:** Hidden Markov Model in BigQuery ML trained on historical VIX/TLT/DXY patterns → writes daily transition probs to Firestore. Gemini references these in its narrative.

### 17. Timeframe Alignment Score
**Fix:** Per ticker, compute `alignment_score` = fraction of timeframes (1D/5D/1M/3M) agreeing. Score > 0.75 = high-conviction. Score < 0.4 = chop. Display prominently in mobile signal card.

### 18. Sector-Relative Returns
Absolute returns lie. **Fix:** Every ticker has `relative_return_vs_sector_etf: {1D: +0.4%, 5D: -1.2%}` — e.g., AAPL up 2% but XLK up 3% = actually lagging. Gemini reads this and rates accordingly.

### 19. Breadth Oscillators
Plan has `breadth_pct` (single scalar). **Fix:** Track 5-day and 20-day breadth EMA, breadth momentum (derivative), and breadth thrust (Zweig's >61.5%). Gemini prompt sees regime transitions days before price confirms.

### 20. Put/Call Ratio Ingestion
Free data from CBOE. **Fix:** Add `options_sentiment.py` — daily fetch of equity + index P/C ratio → sentiment input. Extreme P/C > 1.2 = bearish exhaustion (contrarian buy). Extreme < 0.5 = euphoria.

### 21. VIX Term Structure
VIX spot alone is noise. **Fix:** Add VIX9D / VIX / VIX3M / VIX6M term structure. Backwardation (VIX9D > VIX) = stress. Feed to `macro_pulse` prompt.

### 22. Cross-Asset Signals (Rates ↔ Equities)
**Fix:** Track `us10y - us2y` spread daily. Steepening during stress = recession pricing. Flattening during rally = late-cycle. Gemini uses this in `ai_summary` for "what macro says about equity risk."

### 23. Earnings Surprise Feed
Plan has `earnings_radar` but doesn't ingest *surprise magnitude*. **Fix:** Fetch consensus EPS vs actual → compute `surprise_pct`. Gemini factors post-earnings drift (PEAD) into 5D/1M signals.

---

## Section C — Autonomous AI Agents & Tools

### 24. MarketAnalyst Agent (per nav endpoint)
**Fix:** Each of the 7 nav endpoints gets a named AI agent with: (a) system prompt defining role, (b) tool set it can call, (c) memory store, (d) daily eval score. Example: `ScreenerAgent`, `MacroAgent`, `ContentAgent`.

### 25. Tool: `fetch_recent_news(ticker, hours)`
**Fix:** Agent-callable tool that pulls NewsAPI + Finnhub news in last N hours, returns summarized headlines. Agent uses this before confirming a signal.

### 26. Tool: `compute_stat(ticker, metric, period)`
**Fix:** Agent calls this to request derived stats (Sharpe, max drawdown, correlation to SPY) without the orchestrator pre-computing every possible metric.

### 27. Tool: `simulate_if_then(scenario)`
**Fix:** Agent can ask "if Fed hikes 50bps, what's the SPX move per historical analog?" → backend scans BigQuery for similar past setups.

### 28. Agent Memory (Per-Session + Long-Term)
**Fix:** Firestore collection `agent_memory/{agent_id}` stores: (a) yesterday's predictions vs outcomes (short-term), (b) recurring patterns it noticed over 90 days (long-term). New prompts include "you predicted X yesterday; outcome was Y."

### 29. Agent Self-Critique Loop
**Fix:** After generating signals, agent makes a second call: "Given these signals, what's my strongest counter-argument?" The counter-argument is returned alongside. Mobile shows both views.

### 30. Multi-Agent Council for `/content` (Blog)
Plan has blog → review. **Fix:** Add 3rd agent: Devil's Advocate. Blog-writer drafts, reviewer edits, devil argues the contrarian thesis. Final output includes all 3 perspectives. Users get intellectual honesty, not just narrative.

### 31. Tool Use Tracing (Langfuse or GCP-native)
**Fix:** Every agent run writes trace to Cloud Logging structured JSON: `{agent, tool_calls: [...], final_output, latency, cost}`. Build debug UI at `/debug/agent-trace/{run_id}`.

### 32. Kill Switch / Circuit Breaker per Agent
**Fix:** If agent fails >3x in an hour, auto-disable via Firestore flag and fall back to rule-based. Alert via Pub/Sub. No cascading failures.

### 33. Prompt Injection Defense
User-provided ticker lists (portfolio) flow into prompts. **Fix:** Sanitize ticker inputs against regex `^[A-Z]{1,5}$`, reject anything else. Wrap user inputs in prompts with `<user_data>...</user_data>` delimiters and instruct model to ignore instructions inside.

---

## Section D — Data Layer (Tables, DBs, Warehouses)

### 34. Migrate Time-Series to BigQuery
Plan keeps ETF history in Firestore. **Fix:** Move `etf_store` to BigQuery partitioned+clustered table (`project.market.etf_ohlcv` partitioned by `date`, clustered by `symbol`). Firestore is for keys/configs, not time-series. 100x cheaper at scale.

### 35. BigQuery ML for Regime Classifier
**Fix:** Train `CREATE MODEL market.regime_classifier OPTIONS(model_type='boosted_tree_classifier')` on 10 years of macro+regime-label pairs. Predict current regime probability server-side without Gemini. Use as a *feature* into Gemini for richer reasoning.

### 36. Feature Store (Vertex AI Feature Store)
**Fix:** Register all derived features (RSI, MACD, BB position, volume_z, etc.) in Vertex AI Feature Store. Mobile/backend/BQ ML share identical feature definitions. No drift.

### 37. Materialized Views for Nav Endpoints
**Fix:** Each nav endpoint has a BigQuery materialized view that pre-joins all needed features + signals. Refreshed post-bake. `/signals` query becomes `SELECT * FROM mart.signals_current WHERE user_tickers @> ARRAY[...]` — sub-100ms.

### 38. Historical Prediction Ledger
**Fix:** BigQuery table `mart.prediction_ledger` — every AI prediction written here with (date, ticker, signal, confidence, model_version, prompt_version, actual_outcome_5d, actual_outcome_30d). Nightly job backfills outcomes. Eval harness reads from this.

### 39. Sentiment Time-Series Table
**Fix:** `mart.sentiment_daily` (date, ticker, news_sentiment, social_sentiment, analyst_revision_count, options_flow_score). Ingested from `news_sentiment.py` + new sources. Used for sentiment-return correlation analysis.

### 40. Firestore Indexes for Mobile Queries
**Fix:** Add composite indexes on `agent_memory(agent_id, timestamp DESC)` and `prediction_ledger(ticker, date DESC)` so mobile can paginate history efficiently.

---

## Section E — Charts & Mobile UX (The 7 Nav Endpoints)

### 41. Sparklines Everywhere (No Plain Numbers)
Plan's `market.tsx` just shows price + change%. **Fix:** Every row has a 30-day sparkline (use `react-native-svg-charts` or `victory-native`). Visual scan in 2 seconds > reading digits.

### 42. Regime Timeline Chart (`/macro-pulse`)
**Fix:** Horizontal bar showing last 90 days colored by regime (green=Risk-On, red=Risk-Off, amber=Transitional). User sees how long current regime has persisted. Gemini rationale below.

### 43. Sector Heatmap Grid (`/industry-intel`)
**Fix:** 11-cell grid (11 sectors) with size = market cap, color = change_pct, tap for drill-down into industry ETFs within sector. Current plan renders flat JSON.

### 44. Multi-Timeframe Signal Matrix (`/signals`)
**Fix:** Per ticker, render a 6-cell row: `[1D] [5D] [1M] [3M] [6M] [1Y]` — each cell colored by signal, sized by confidence. Alignment score shown as vertical bar at right.

### 45. Prediction Accuracy Badge (`/market-overview`)
**Fix:** Show "Model 30-day accuracy: 62%" pulled from `prediction_ledger`. Users see whether to trust today's signal. Gemini bragging without receipts is worthless.

### 46. Correlation Network Graph (`/content`, correlation article)
**Fix:** Force-directed graph of today's top correlation pairs. Tap node → see stocks. Tap edge → see correlation coefficient + Gemini narrative. Way more informative than prose.

### 47. Tab-Bar Badge for Regime Change
**Fix:** When Pub/Sub publishes `regime-change`, mobile shows red dot on `/macro-pulse` tab icon until user visits. Uses Expo Notifications API.

### 48. Voice Summary (`/market-overview`)
**Fix:** After AI brief generates, call Google Cloud Text-to-Speech → MP3 in GCS → `audio_url` in response. Mobile has a "🔊 Listen" button. Commuters listen on drive.

### 49. Watchlist-Aware Personalization
**Fix:** User saves tickers locally. Backend endpoint `/signals?watchlist=AAPL,NVDA,TSLA` — Gemini prompt includes "focus narrative on these tickers for this user." Each of 7 nav endpoints accepts `?watchlist=` and personalizes.

### 50. Offline-First Cache Layer (Mobile)
**Fix:** `AsyncStorage`-backed cache mirrors last successful response per endpoint with 24h staleness marker. Mobile works on subway. Current plan has none — `market.tsx` falls back to *hardcoded fake data* on error, which is worse than nothing.

---

## Meta-Observations

The original plan fixes individual rule-based signals by calling Gemini, adds Vertex/Pub-Sub/Cloud Tasks, and wires one mobile screen to real data. This makes the app ~50% smarter on paper but:

- **No memory.** Every Gemini call forgets yesterday.
- **No evaluation.** No one knows if the AI is right.
- **No multi-timeframe.** Traders operate in 6+ horizons; the plan sees only "today."
- **No agency.** AI narrates; it doesn't decide or investigate.
- **No accountability.** No prediction ledger, no accuracy metric, no shame.

Implementing these 50 items turns the app from "finance dashboard with AI commentary" into "autonomous market-analyst agents with measurable skill, multi-timeframe reasoning, and a full evidence trail" — genuinely 500% more robust.

## Priority Tier

**Tier 1 (ship first, unblocks everything else):** #1 eval harness, #2 confidence scoring, #3 multi-timeframe, #10 cost telemetry, #38 prediction ledger, #50 offline cache.

**Tier 2 (agentic core):** #9 ReAct loops, #24 per-endpoint agents, #25-27 agent tools, #28 agent memory, #29 self-critique.

**Tier 3 (data maturity):** #34 BigQuery migration, #35 BQML regime classifier, #36 feature store, #37 materialized views.

**Tier 4 (UX/polish):** #41-48 charts, #47 tab badges, #48 voice, #49 personalization.

---

## Section F — The 4-API Free-Tier Maximization Strategy (Correction)

The original critique singled out Finnhub + Alpha Vantage for Secret Manager rotation and ignored the other two APIs entirely. That was wrong. The backend has **four** external data providers, each with distinct free-tier limits and data strengths, and autonomous AI can orchestrate them dramatically better than the current hand-coded fallback chains.

### Current State of Each API

| API | File | Free-Tier Limit | Strengths | Currently Used For |
|---|---|---|---|---|
| **Finnhub** | `data_client.py` | 60 calls/min | Intraday quotes, profiles, news | Primary quote source, news |
| **Alpha Vantage** | `data_client.py` | 25 calls/day | Fundamentals, multi-period returns | Industry return enrichment |
| **Massive (Polygon.io)** | `massive_client.py` | 5 calls/min | EOD snapshots (250 tickers/batch), RSI/MACD/EMA/SMA, dividends, splits | Screener enrichment, EOD technicals |
| **yfinance** | `data_client.py`, `etf_store.py`, `industry.py`, `daily_blog.py` | Unlimited (unofficial) | Bulk historical OHLCV, fundamentals | ETF history seeding, Finnhub fallback |

### The Four Free Tiers Are Complementary, Not Redundant

- **yfinance** is quota-free but rate-limited in practice (~100 calls/min before Yahoo throttles). Use for: bulk historical backfill, ETF seeding, fallback when Finnhub is down. Never depend on it as primary (no SLA, Yahoo can break it any day).
- **Massive** gives you **250 tickers in one snapshot call** and native technicals (RSI, MACD, EMA, SMA) — but only 5 calls/min. A single Massive call can replace 250 Finnhub quote calls. Massively underused.
- **Finnhub** is the only one with real-time intraday quotes and fast news. 60/min is generous if you batch smartly. Currently burned on redundant calls the plan should eliminate.
- **Alpha Vantage** at 25/day is brutal — it should be reserved for the **one thing it does best**: deep fundamentals that nothing else provides at the free tier.

### Suggestions (Additive to the First 50)

### 51. Rotate All 4 Keys Through Secret Manager (Not Just 2)
Every one of `FINNHUB_API_KEY`, `ALPHA_VANTAGE_KEY`, `MASSIVE_API_KEY`, and `GEMINI_API_KEY` belongs in Secret Manager with IAM-scoped access and rotation. yfinance needs no key but its user-agent rotation should be centrally configured.

### 52. AI-Driven API Router (`ApiOrchestrator`)
**Fix:** Build a `backend/api_router.py` where Gemini (or a lightweight rule engine it trains) decides per request: "Need 50 ticker quotes urgently → Massive snapshot (1 call). Need 1 intraday quote → Finnhub. Need 5 years of OHLCV → yfinance. Need fundamentals → Alpha Vantage if budget remains, else cached Massive snapshot fields." The router owns the quota ledger and makes decisions autonomously.

### 53. Live Quota Ledger in Firestore
**Fix:** Extend existing `av_call_counter:{date}` pattern to all four APIs: `api_quota:{api}:{date}` with atomic `Increment`. Router reads before every call and routes around exhausted quotas. Mobile `/status` screen shows live quota remaining per API.

### 54. Massive as Primary Screener Source (Not Finnhub)
**Fix:** Today's screener does 43 separate Finnhub calls. One Massive snapshot call returns all 43 plus 52-week ranges, volumes, and previous close. Saves 42 Finnhub calls per screener refresh — reallocate that quota to `/signals` multi-timeframe backfills.

### 55. Massive Native Technicals Replace Custom MACD/RSI Math
Suggestions #13 and #14 above propose computing RSI and MACD in Python. **Better fix:** Massive's `/v1/indicators/` endpoint returns these pre-computed. One call per ticker per indicator, and the 5-call/min limit is fine when batched nightly via Cloud Tasks.

### 56. yfinance as the BigQuery Historical Backfill Worker
**Fix:** yfinance's unlimited quota + batch OHLCV history is ideal for seeding the BigQuery `market.etf_ohlcv` table (suggestion #34). Run a Cloud Tasks job nightly that pulls 5-year history for any ticker newly added to a watchlist. Finnhub/Massive quotas stay pristine for live data.

### 57. AI Fallback Chain With Confidence Decay
**Fix:** When a data source fails, the next one fills in but quality degrades. Record `data_source` and `data_freshness_seconds` on every signal. If a Gemini signal is built on a stale yfinance quote (Finnhub down), mobile UI shows a small "⚠ stale data" badge. Honesty beats silent degradation.

### 58. Agent Tool: `get_cheapest_data(ticker, field, freshness_required)`
**Fix:** Expose a tool to the autonomous agents (Section C): "I need AAPL's RSI(14) within the last 24h." Router picks Massive (free RSI, 24h-old snapshot already cached) over recomputing from Finnhub quotes. Agent doesn't need to know which API — the router decides.

### 59. Dividend / Split Event Hook (Massive Corporate Actions)
Current code has no awareness of ex-dividend dates or splits. **Fix:** Nightly Massive `get_corporate_actions()` call → Firestore `corporate_actions_upcoming`. Screener signals suppress "buy" 1 day before ex-div to avoid misinterpreting the mechanical drop. Gemini prompt includes upcoming corporate actions for the ticker.

### 60. Free-Tier Budget Dashboard (Mobile `/status` Extension)
**Fix:** The `/status` screen currently only shows Clerk and Google OAuth health. Add four rows: Finnhub (used/60 per min), Alpha Vantage (used/25 per day), Massive (used/5 per min), yfinance (last rate-limit time). Users (and you) see the API health envelope at a glance. Critical for a free-tier app that should never fail silently due to quota exhaustion.

### Key Reframe

The original plan treated Finnhub and AV as the only "real" APIs worth securing. In reality, **Massive is the most underused asset** — one call returns 250 tickers with technicals, for free. **yfinance is the unquota'd safety net** that should front-run all historical backfills. Rotating keys is table stakes; the real 500% robustness win is an AI router that treats all four as a **unified data mesh** with live quota accounting, priority-aware degradation, and honest freshness labeling.
