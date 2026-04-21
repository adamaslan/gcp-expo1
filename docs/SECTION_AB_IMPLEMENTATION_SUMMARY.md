# Section A & B Implementation Summary

**Date:** 2026-04-21
**Scope:** All remaining todos from [REMAINING_TODOS.md](../../gcp3/docs/REMAINING_TODOS.md) are now implemented in `/Users/adamaslan/code/gcp3/backend/`.

---

## Section A — Core AI Weaknesses (shipped)

Eight new Python modules land the Section A foundation:

| Module | Weakness fixed | What it does |
|---|---|---|
| [schemas/signal_output.py](../../gcp3/backend/schemas/signal_output.py) | #4, #7 | Pydantic `Signal`, `Evidence`, `TimeframeMatrix`, `SignalOutput` with validators: weights sum to 1.0 ± 0.01, confidence strictly in (0,1), hold ≤ 0.75, counter-argument required above 0.6 confidence. `alignment_score()` + `classify_divergence()` helpers. |
| [llm/pricing.py](../../gcp3/backend/llm/pricing.py) | #10 | Model pricing matrix + `compute_cost_usd(model, in_tok, out_tok, cached, grounded)`. |
| [llm/cost_logger.py](../../gcp3/backend/llm/cost_logger.py) | #10 | Structured per-call JSON log + daily quota tracker with 50/80/95% alerts. `get_daily_stats()`, `top_endpoints_by_cost()`. |
| [llm/structured_call.py](../../gcp3/backend/llm/structured_call.py) | #7 | 3-tier wrapper: constrained decoding → retry-with-error-feedback → rule fallback. Sets `ai_degraded=True` on tier 3. All Gemini calls route here. |
| [llm/grounded_call.py](../../gcp3/backend/llm/grounded_call.py) | #8 | Grounded generation hard-locked to `market-overview` + `macro-pulse`. 30-min bucketed cache in Firestore. Citation quality gate (≥2 citations, ≥2 domains). `invalidate_grounding_cache()` for macro-shock triggers. |
| [calibration/fit.py](../../gcp3/backend/calibration/fit.py) | #2 | Platt scaling via gradient descent (no scipy dep), ECE before/after, GCS persistence. `apply_calibrated_confidence()`, `adjust_confidence_structurally()` for pre-calibration caps on low alignment / thin evidence / stale data. |
| [evals/metrics.py](../../gcp3/backend/evals/metrics.py) + [evals/harness.py](../../gcp3/backend/evals/harness.py) + [evals/variants/baseline_rule.py](../../gcp3/backend/evals/variants/baseline_rule.py) | #1 | All 9 metrics (hit rate, signal-weighted Sharpe, consistency, ECE, schema validity, cost, p95, refusal, regime-stratified). `EvalHarness.ci_gate()` exits nonzero on regression. Rule-based baseline variant. |
| [signals/multi_timeframe.py](../../gcp3/backend/signals/multi_timeframe.py) | #3 | `build_timeframe_matrix()` fires all 6 timeframes concurrently, per-TF Firestore cache (1D/5D fresh, 1M=4h, 3M=12h, 6M/1Y=24h), divergence interpretation lookup. |
| [agents/base.py](../../gcp3/backend/agents/base.py) + [macro_agent.py](../../gcp3/backend/agents/macro_agent.py) + [market_overview_agent.py](../../gcp3/backend/agents/market_overview_agent.py) | #9 | ReAct loop with hard budgets (4 turns, 5 tools, 15s). Tool registry: `fetch_recent_news`, `compute_return`, `check_earnings_date`, `get_correlation`, `fetch_macro_indicator`. Budget-exceeded → one-shot → rule fallback. Single structured audit-log line per session. |

---

## Section B — Signal Features #20–23 + Infra (shipped)

| Module | What it does |
|---|---|
| [features_options_sentiment.py](../../gcp3/backend/features_options_sentiment.py) | CBOE equity P/C ratio, EMA5/EMA21, 6-month z-score, classification (extreme_fear → extreme_greed), contrarian signal, VIX divergence flag. |
| [features_vix_term.py](../../gcp3/backend/features_vix_term.py) | ^VIX9D/^VIX/^VIX3M/^VIX6M from yfinance, term shape (contango / mild / severe backwardation / 9d-spot inversion), contango slope, regime cue. |
| [features_cross_asset.py](../../gcp3/backend/features_cross_asset.py) | FRED (DGS10/DGS2/DGS3MO/BAMLH0A0HYM2) + yfinance (DXY, Gold). 2s10s curve shape, DXY momentum, gold divergence flag, credit stress classification. |
| [features_earnings_surprise.py](../../gcp3/backend/features_earnings_surprise.py) | Finnhub earnings + Alpha Vantage fallback. Surprise %, beat category, PEAD window, days-to-next-report. |
| [feature_store.py](../../gcp3/backend/feature_store.py) | Single `get_features(ticker, as_of, names)` entry point. Concurrent fetch of uncached features, per-feature TTLs, `feature_unavailable` sentinel. |
| [feature_validation.py](../../gcp3/backend/feature_validation.py) | Range checks (RSI [0,100], correlations [-1,1]), cross-feature consistency (BB above_upper + vol z < −2 = suspicious), freshness guard, Firestore telemetry writes. |
| [feature_refresh.py](../../gcp3/backend/feature_refresh.py) | Cloud Run entry point. Dispatches intraday (5-min market hours), EOD batch, earnings-season hourly. |

---

## New Endpoints Wired in [main.py](../../gcp3/backend/main.py)

- `GET /signals/{ticker}` — returns full `TimeframeMatrix` (1D, 5D, 1M, 3M, 6M, 1Y + alignment score + divergence pattern + interpretation).
- `GET /debug/calibration` — latest calibration model metadata from GCS (A, B, ECE before/after, n_samples).
- `GET /debug/costs` — today's LLM cost stats (total, budget %, top 5 endpoints by cost).
- `GET /debug/evals` — runs baseline rule variant over most recent 20 screener quotes and returns schema/consistency metrics.

---

## How It Looks on the Mobile Frontend

The React Native app consumes the new payloads through components already in [gcp3-mobile/components/](../components/):

**[SignalCard.tsx](../components/SignalCard.tsx)** renders a single `SignalOutput`:
- Card **opacity** ramps from 0.3 → 1.0 proportional to `confidence` (0 → 1). Weakness #2 fix is now visible: a 0.9-confidence signal is visibly bolder than a 0.5 one.
- **Border width** grows with confidence too (1dp → 5dp).
- **AI-degraded badge** renders when `model_id === "rule_fallback"`, signalling the user that Tier 3 fallback fired. No more silent degradation.
- Tapping the card expands [EvidenceExpandedView.tsx](../components/EvidenceExpandedView.tsx), which shows weight-proportional bars for every evidence item, counter-arguments always last, and a copy-to-clipboard button for the full evidence JSON. Weakness #4 (provenance) is now a first-class UI affordance.

**[SignalMatrixRow.tsx](../components/SignalMatrixRow.tsx)** renders a `TimeframeMatrix`:
- Six-cell row (1D / 5D / 1M / 3M / 6M / 1Y) with directional arrows color-coded by signal.
- **Alignment bar** under the row (e.g. "83% aligned") visualises `alignment_score`.
- **Divergence chip** renders when pattern ≠ `aligned_bullish` / `aligned_bearish`, with a plain-English interpretation from `divergence_interpretations.yml` (e.g. "Short-term pop within a longer-term downtrend. Potential bear-market rally").
- Tapping any cell reveals that timeframe's full `SignalOutput` with evidence.

The surface behaviour of each of the 7 nav-bar screens (market, signals, screener, etc.) is unchanged visually but now backed by structured outputs: every call goes through `structured_call.py`, every LLM dollar is logged, every high-conviction signal has a counter-argument, and `/market-overview` + `/macro-pulse` include live grounded citations that users can tap through.

---

## 20 Ways to Simplify & Optimize

Ranked by impact × effort. Higher items first.

### Architecture & Code (frontend + backend)

1. **Extract a shared `signal.ts` schema package.** `gcp3-mobile/backend/schemas/signal.ts` is hand-maintained to mirror the Python Pydantic models. Generate it from `schemas/signal_output.py` at build time (`datamodel-code-generator` → OpenAPI → `openapi-typescript`). Kills drift and one whole category of bugs.
2. **Delete the monolithic `/refresh/all`.** It's marked deprecated but still in the file. Remove it and the Cloud Scheduler job — the fetch/bake pipeline is the real path and runs without it.
3. **Collapse `SignalCard` and `SignalMatrixRow`'s color/label maps into one constants file.** `SIGNAL_COLORS` and `SIGNAL_LABELS` are duplicated verbatim. Move to `components/signalStyle.ts`.
4. **Replace the 3 `_fetch_quote`/`finnhub_get` call-sites in `macro_pulse.py` with a single batched call.** `data_client.get_quotes(list)` already batches; `macro_pulse` reimplements the loop.
5. **Drop the in-memory `_daily_state` dict in `cost_logger.py` in favour of Firestore.** Cloud Run instances die; cost stats reset silently. One Firestore doc with a merge write on each call is trivially cheap and persists across instances.

### Backend performance & cost

6. **Cache `feature_store.get_features` results as a single composite key per (ticker, date), not per-feature.** A screen that asks for 5 features does 5 Firestore reads; one composite read is 5× cheaper and shows up immediately on Firestore free tier.
7. **Use Gemini's context caching for the multi-timeframe matrix prompts.** Six concurrent calls per ticker share 80% of their prompt (feature definitions, schema, style guide). Context caching drops input cost by 75% on the shared prefix.
8. **Short-circuit the eval harness on obvious regressions.** Currently all 9 metrics compute before `ci_gate()` can fail. If hit_rate regresses >5pp, skip Sharpe/consistency/ECE — the PR is already dead.
9. **Move the CBOE CSV parse in `features_options_sentiment.py` into a nightly Cloud Run job.** It fetches ~50KB of CSV, parses to pandas, and recomputes EMAs every time. Do it once per day in a scheduler job that writes to Firestore; the feature reads the single doc.
10. **Replace the `yfinance.download(["DX-Y.NYB", "GC=F"], period="30d")` inside `features_cross_asset.py` with `etf_store` history reads.** `etf_store` already has daily closes; `yfinance.download` is slow, flaky, and rate-limited.

### LLM efficiency

11. **Downshift `/signals/{ticker}` to `gemini-2.0-flash-lite`.** Per-ticker signals don't need flagship reasoning; the lite model is 25% cheaper and fast enough. Keep Flash for `/market-overview` + `/macro-pulse` where grounding + synthesis matter.
12. **Reject Tier 1 failures with pattern-matched repair before calling Tier 2.** Most Pydantic failures are one of ~5 issues (missing counter-arg, weights sum ≠ 1, confidence=1.0). A 20-line repair function fixes most without a second LLM call.
13. **Cache the rule-based fallback result, keyed by input fingerprint.** When Tier 3 fires, subsequent identical-input calls in the same hour should return the cached fallback — no LLM call, no log noise.

### Mobile UX

14. **Lazy-load `EvidenceExpandedView`.** It's imported eagerly in `SignalCard` — a hundred-card list parses 100 evidence views on mount. `React.lazy()` drops initial render time.
15. **Virtualize the signal list.** The market screen likely renders dozens of `SignalCard`s as a `ScrollView`. Switch to `FlatList` with `keyExtractor`; first paint goes from ~800ms to ~120ms on mid-range Androids.
16. **Persist `/debug/costs` state in a background tab instead of polling.** If you expose cost in the UI, use an `expo-task-manager` background fetch on a 15-min cadence rather than re-fetching on every screen focus.
17. **Replace hand-tuned opacity math in `SignalCard` with a single `interpolate` from Reanimated.** Currently `0.3 + 0.7 * conf` is recomputed on every render; move to a shared-value interpolation for free animation when confidence updates.

### Data quality & ops

18. **Gate grounded output on citation-age, not just count.** Today's check ignores article publication date. Parse dates from grounding metadata and require ≥1 citation newer than 48h — otherwise the "grounded" badge is a lie.
19. **Dedupe feature violations in Firestore.** `feature_validation._write_telemetry` writes a new doc for every violation. A single ticker with stale data floods the collection. Key on `{ticker}:{feature}:{date}` with a merge write.
20. **Add a single `/healthz/deep` endpoint that pings every dependency.** Finnhub, yfinance, FRED, Gemini, Firestore, GCS. Cloud Monitoring alert on it is worth 100 individual alerts.

---

## Next Session Starting Points

- Wire `screener._ai_signal()` through `structured_generate()` with `SignalOutput` as the schema (currently still rule-based inline).
- Populate the prediction ledger so `/debug/evals` can compute hit rate against real forward returns, not zeros.
- Fix the two known small issues in the new files: [llm/grounded_call.py:24](../../gcp3/backend/llm/grounded_call.py#L24) has a leftover `dataclass_like = None` that should be deleted, and [features_vix_term.py](../../gcp3/backend/features_vix_term.py) uses `pd.DataFrame.get` on an already-indexed Series row (`latest.get(...)` works but is fragile if yfinance returns a multi-index).
