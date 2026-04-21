# Section A — Core AI Weaknesses: Deep-Dive Remediation Spec

**Source:** [CRITIQUE_LINEAR_GLIDING_OCEAN.md § Section A](./CRITIQUE_LINEAR_GLIDING_OCEAN.md#section-a--plans-core-weaknesses-why-50-more-ai-is-not-enough)
**Scope:** Items #1–#4 plus #7–#10 of the 60-item critique, expanded ~200% into an implementation-grade specification.
**Audience:** Backend engineers, ML engineers, mobile engineers wiring the 7 nav-bar endpoints into an autonomous agentic stack.
**Status:** Proposal — not yet approved for implementation. This document defines *what shipping-quality* looks like for each weakness.
**Cost posture:** All designs optimized for a free-tier-first deployment (Gemini Flash free tier, Cloud Run always-free, Firestore free tier, BigQuery 1 TB/mo free query). Each subsection explicitly calls out scale-up knobs for when free limits are exceeded.

---

## Table of Contents

1. [Why Section A Is the Foundation](#why-section-a-is-the-foundation)
2. [Weakness #1 — No AI Evaluation Harness](#weakness-1--no-ai-evaluation-harness)
3. [Weakness #2 — No Confidence Scoring](#weakness-2--no-confidence-scoring)
4. [Weakness #3 — Single Timeframe Tyranny](#weakness-3--single-timeframe-tyranny)
5. [Weakness #4 — No Signal Provenance / Explainability](#weakness-4--no-signal-provenance--explainability)
6. [Weakness #7 — No Output Schema Validation](#weakness-7--no-output-schema-validation)
7. [Weakness #8 — No Grounding / Real-Time News Hook](#weakness-8--no-grounding--real-time-news-hook)
8. [Weakness #9 — No Agent Loop (Fire-and-Forget AI)](#weakness-9--no-agent-loop-fire-and-forget-ai)
9. [Weakness #10 — No Cost Telemetry](#weakness-10--no-cost-telemetry)
10. [Cross-Cutting Dependencies](#cross-cutting-dependencies)
11. [Shared Data Contracts](#shared-data-contracts)
12. [Rollout Sequencing](#rollout-sequencing)
13. [Free-Tier Budget Envelope](#free-tier-budget-envelope)
14. [Open Questions](#open-questions)

---

## Why Section A Is the Foundation

The other 56 items in the critique — agent loops, prompt versioning, BigQuery migration, sector heatmaps — all presume one or more of the Section A fixes are in place. Without them:

- **Without #1 (eval harness):** You cannot tell whether swapping Gemini Flash for Gemini Pro (#5 model router), iterating prompts (#6 prompt versioning), or adding agent self-critique (#29) improves the product. Every downstream change becomes a vibes-based gamble.
- **Without #2 (confidence):** The mobile UI (#41–#50) can only render binary colors. The prediction ledger (#38) cannot stratify accuracy by confidence bucket, which is the single most useful calibration metric.
- **Without #3 (multi-timeframe):** The signals endpoint reduces to a momentum snapshot and every downstream suggestion that references divergence, alignment score (#17), or regime transition (#16) is ungrounded.
- **Without #4 (provenance):** The app is a black box. Users cannot trust it, you cannot debug it, and regulators / the platform review process cannot audit it.

Section A is therefore the critical path. Ship these four before touching anything else in the critique.

---

## Weakness #1 — No AI Evaluation Harness

### Problem Statement

The current `linear-gliding-ocean.md` plan replaces deterministic rule-based signals (`change_pct > 2% → buy`) with Gemini calls and ships. There is no mechanism to answer:

- Is Gemini's signal better, worse, or indistinguishable from the rule-based baseline?
- When a prompt is edited or a model is swapped, does quality regress?
- When Gemini hallucinates a ticker or returns a malformed enum, is that caught before users see it?
- Do signals generalize across market regimes, or do they overfit the last 30 days' tape?

Shipping AI signals without this harness is equivalent to shipping a backend service without integration tests — it may work in dev, it *will* drift in prod, and there will be no signal when it does.

### Target State

A first-class evaluation subsystem at [backend/evals/](../backend/evals/) that:

1. **Replays** historical market data (default: trailing 90 days, configurable to 1/3/5 years) through any signal-producing function — rule-based, Gemini, or mixed.
2. **Scores** each variant across multiple axes: hit rate, Sharpe, decision-consistency, latency, cost.
3. **Gates** deployment: CI blocks a PR if a new prompt/model degrades any Tier-1 metric beyond a tolerance band.
4. **Persists** every run to BigQuery `mart.eval_runs` so model/prompt improvements are auditable over time.
5. **Surfaces** results to both engineers (CLI + HTML report) and users (via suggestion #45, the model accuracy badge).

### Metric Suite (Ordered by Importance)

| # | Metric | Definition | Why It Matters | Tier |
|---|---|---|---|---|
| 1 | **Directional hit rate** | For each signal, did the next-5-day return's sign match the signal's sign? `(buy + close_up) or (sell + close_down) / total`. | The simplest sanity check. A signal worse than 50% is worse than a coin flip. | 1 (gating) |
| 2 | **Signal-weighted Sharpe** | Sharpe ratio of a paper portfolio that takes each signal at weight = `confidence`, rebalances daily. | Rewards high confidence when right, punishes it when wrong. Cleaner than pure hit rate. | 1 (gating) |
| 3 | **Decision consistency** | For two consecutive days with <1% price move and no macro regime change, does the signal flip? A flip is a hallucination tell. | Stable inputs should produce stable outputs. Flipping = model anxiety. | 1 (gating) |
| 4 | **Calibration (ECE)** | Expected Calibration Error on the confidence score. Bucket predictions by confidence 0-0.2, 0.2-0.4, etc. Within each bucket, hit rate should ≈ bucket midpoint. | If "0.9 confidence" predictions hit 55% of the time, confidence is a lie. | 2 |
| 5 | **Cost per signal** | Avg input+output tokens × model price / number of signals. | Ensures quality improvements aren't funded by exploding spend. | 2 |
| 6 | **Latency p95** | Wall-clock time to produce a signal. | Mobile cannot wait 15s. Hard SLA: p95 < 3s for cached, < 8s for fresh. | 2 |
| 7 | **Schema-validity rate** | Fraction of Gemini outputs passing Pydantic validation without retry. | Silent fallback hides prompt drift. | 1 (gating) |
| 8 | **Refusal / empty-output rate** | Fraction of calls returning no signal (safety refusal, timeout, empty string). | Unmonitored failure = silent product degradation. | 2 |
| 9 | **Regime-stratified accuracy** | Hit rate split by regime (Risk-On, Risk-Off, Transitional). | A model great in bull markets and useless in drawdowns is a liability. | 3 |

### Architecture

```
backend/evals/
├── __init__.py
├── harness.py              # Orchestrator: loads fixtures, runs variants, emits report
├── fixtures/
│   ├── historical_bars_90d.parquet   # OHLCV for eval universe
│   ├── macro_context_90d.parquet      # VIX, yields, breadth for each day
│   └── outcomes.parquet              # Forward 1D/5D/30D returns per ticker/day
├── variants/
│   ├── baseline_rule.py    # Current rule-based signal — the floor
│   ├── gemini_flash_v1.py  # Current prompt
│   ├── gemini_flash_v2.py  # Candidate prompt
│   └── gemini_pro_v1.py    # Deep-reasoning variant
├── metrics/
│   ├── hit_rate.py
│   ├── sharpe.py
│   ├── consistency.py
│   ├── calibration.py
│   └── cost.py
├── reports/
│   ├── html_report.py      # Renders side-by-side variant comparison
│   └── ci_gate.py          # Parses report, exits non-zero if gating metric regresses
└── tests/
    └── test_harness.py
```

### Fixture Strategy

- **Universe:** S&P 500 + top 50 by volume + any ticker ever added to a watchlist in the last 90 days. ~600 symbols.
- **Time window:** Trailing 90 trading days for the default fast eval (~5 min runtime). Extended 5-year window for nightly full-regression CI (~2 hr runtime on Cloud Build).
- **Storage:** Parquet in GCS bucket `gs://gcp3-eval-fixtures/`, versioned by ingest date. A fixture version is pinned in `backend/evals/fixtures/VERSION.txt` so eval results are reproducible.
- **Refresh cadence:** Weekly incremental (Cloud Scheduler → Cloud Run Job) to roll the trailing window forward. Full rebuild quarterly.
- **Outcome labeling:** Forward returns are computed with point-in-time adjusted OHLCV from yfinance (unlimited quota — see critique #56). Survivorship-bias-free by including delisted tickers from Massive's `get_delisted` endpoint.

### CI Gating Rules

- **Tier 1 metrics (gating):** A PR touching any file matching `backend/prompts/`, `backend/ai_*.py`, `backend/screener.py`, or `backend/signals.py` MUST run `pytest backend/evals/tests/ && python -m backend.evals.harness --ci-gate` as a required GitHub Actions check.
- **Regression tolerance:** A PR is blocked if any gating metric drops by more than:
  - Hit rate: **−1.5 percentage points** absolute
  - Sharpe: **−0.10** absolute
  - Consistency: **−3 percentage points** absolute
  - Schema-validity: **−0.5 percentage points** (this should stay at ≥ 99.5%)
- **Escape hatch:** A PR can add the label `eval-regression-approved` with a written justification comment. Logged permanently in `mart.eval_override_log`.

### Interface Contract

```python
from typing import Protocol
from decimal import Decimal
from datetime import date

class SignalVariant(Protocol):
    """Any callable that can produce a signal for a ticker on a historical date."""

    name: str                    # e.g. "gemini_flash_v2"
    prompt_version: str | None   # e.g. "screener_v3"
    model_id: str | None         # e.g. "gemini-2.0-flash-001"

    def predict(
        self,
        ticker: str,
        as_of: date,
        features: FeatureSnapshot,
    ) -> SignalOutput: ...
```

The harness runs each variant against the fixture set in parallel (asyncio) and pipes results through the metric pipeline.

### Definition of Done

- [ ] `backend/evals/` directory exists with the structure above.
- [ ] `baseline_rule` and `gemini_flash_v1` variants both run end-to-end on a 90-day fixture in < 10 minutes on a developer laptop.
- [ ] GitHub Actions workflow `eval-gate.yml` exists, runs on PRs touching gated paths, and blocks merge on regression.
- [ ] BigQuery `mart.eval_runs` table receives one row per variant per CI run with all 9 metrics.
- [ ] An HTML report is generated at `backend/evals/reports/out/latest.html` showing variant-vs-variant deltas.
- [ ] At least one historical real regression is caught in a PR before this weakness is declared closed (the "smoke test of the smoke-detector").

---

## Weakness #2 — No Confidence Scoring

### Problem Statement

The current plan returns signals as a categorical 5-level enum: `strong_buy | buy | hold | sell | strong_sell`. This representation is lossy in both directions:

- **Information loss going in:** Gemini internally has a continuous belief ("mildly bullish, but earnings uncertainty"). Forcing it to bucket discards the nuance.
- **Information loss going out:** A `buy` built on three aligned indicators with no contradictions is semantically distinct from a `buy` where one indicator was borderline and Gemini flipped a coin. Users and downstream code see them as identical.

Without confidence, the mobile UI can only render binary colors. The prediction ledger cannot stratify accuracy by conviction bucket. Position-sizing logic (future `/portfolio` endpoint) has no way to express "take a 2% position on this high-conviction buy, 0.5% on that low-conviction one."

### Target State

Every AI output — regardless of endpoint — returns a normalized object:

```json
{
  "signal": "buy",
  "confidence": 0.72,
  "rationale": "Above 50-day MA, positive RSI divergence, but single-timeframe only.",
  "evidence_refs": ["evidence_456", "evidence_789"],
  "prompt_version": "screener_v3",
  "model_id": "gemini-2.0-flash-001",
  "generated_at": "2026-04-20T14:23:11Z"
}
```

Confidence is produced by the model itself, validated against the evidence count and agreement, calibrated against historical accuracy, and rendered proportionally in the UI.

### How Confidence Is Produced

Three sources of signal, blended in priority order:

1. **Self-reported (primary):** Every prompt explicitly asks Gemini to return a `confidence` in `[0.0, 1.0]` alongside the signal, with instruction that "0.5 means you'd bet 50/50, 0.9 means you'd stake your own money." Enforced via Pydantic schema (see #7 in the source critique).
2. **Structural (adjustment):** Post-process the self-reported confidence using features that correlate with real-world reliability:
   - `alignment_score` (suggestion #17): fraction of timeframes agreeing. Low alignment caps confidence at 0.6.
   - `evidence_count`: fewer than 2 evidence items caps at 0.5.
   - `data_freshness_seconds` (suggestion #57): stale data drags confidence proportionally.
3. **Calibrated (post-hoc):** A Platt-scaling or isotonic regression model fit nightly on `mart.prediction_ledger` maps raw confidence → empirical hit rate. So if the model historically says 0.8 and is right 65% of the time, the exposed confidence is remapped to 0.65. Calibration model versioned at `backend/calibration/v{N}.pkl`.

### Validation Rules

Enforced in `backend/schemas/signal.py`:

```python
class SignalOutput(BaseModel):
    signal: Literal["strong_buy", "buy", "hold", "sell", "strong_sell"]
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=20, max_length=500)
    evidence_refs: list[str] = Field(min_length=1, max_length=10)
    prompt_version: str
    model_id: str
    generated_at: datetime

    @field_validator("confidence")
    @classmethod
    def reject_suspicious_confidence(cls, v: float) -> float:
        # Reject lazy "round number" outputs. Model must commit.
        if v in {0.0, 1.0}:
            raise ValueError("Confidence of 0 or 1 is disallowed — model must express uncertainty.")
        return v

    @model_validator(mode="after")
    def hold_requires_low_confidence(self) -> "SignalOutput":
        # A 'hold' with 0.95 confidence is incoherent — if you're that sure
        # nothing will happen, that's itself a signal.
        if self.signal == "hold" and self.confidence > 0.75:
            raise ValueError("Hold signal with >0.75 confidence is incoherent.")
        return self
```

### Mobile UI Rendering

- **Opacity:** Signal card background alpha = `0.3 + 0.7 * confidence`. A 0.9-conviction buy is vivid; a 0.4-conviction buy is ghostly.
- **Border:** Width in `dp` = `1 + 4 * confidence`, color = signal color. High conviction has a thick saturated ring.
- **Confidence pill:** Rendered as a small chip showing `72%` below the signal label, tappable for the evidence chain (see Weakness #4).
- **Screen reader:** `accessibilityLabel="Buy signal, 72% confidence. 3 supporting evidence items. Tap for details."` — accessibility is not optional.

### Calibration Monitoring

Weekly cron emits a calibration plot to `/debug/calibration`:

- x-axis: reported confidence bucket (0.0-0.1, 0.1-0.2, …)
- y-axis: actual hit rate in that bucket
- Ideal: points on the y = x diagonal. Drift triggers a refit.

ECE > 0.10 for 2 consecutive weeks pages the on-call via Pub/Sub → PagerDuty.

### Definition of Done

- [ ] `backend/schemas/signal.py` defines `SignalOutput` with all validators above.
- [ ] All 7 nav-bar endpoint responses conform to `SignalOutput`. Schema is enforced at the API boundary via FastAPI response_model.
- [ ] Every Gemini prompt includes explicit confidence-elicitation instructions with a worked example.
- [ ] `backend/calibration/fit.py` runs nightly, writes calibrated model to GCS, loaded by the API on startup.
- [ ] Mobile `SignalCard` component renders opacity + border-width proportionally, verified via screenshot tests.
- [ ] `/debug/calibration` page exists and shows a reliability diagram refreshed weekly.
- [ ] Alerting: ECE > 0.10 for 2 weeks pages on-call.

---

## Weakness #3 — Single Timeframe Tyranny

### Problem Statement

`screener._ai_signal()` in the current plan takes today's `change_pct` and emits a single signal. This is professionally naive:

- A day trader, a swing trader, and a long-term investor looking at the same ticker have **entirely different right answers**. The current design serves none of them well and all of them equally.
- Divergence across timeframes is itself the most valuable signal in technical analysis — short-term bearish inside long-term bullish is a pullback buy; short-term bullish inside long-term bearish is a dead-cat bounce. The current design *erases* this information by collapsing all horizons into one.
- Competitors (Seeking Alpha, Koyfin, TradingView) have offered multi-timeframe views for a decade. Shipping without this in 2026 is a non-starter.

### Target State

Every signal endpoint returns a **timeframe matrix** rather than a scalar:

```json
{
  "ticker": "AAPL",
  "timeframes": {
    "1D":  { "signal": "buy",         "confidence": 0.65, "evidence_refs": ["..."] },
    "5D":  { "signal": "hold",        "confidence": 0.55, "evidence_refs": ["..."] },
    "1M":  { "signal": "strong_buy",  "confidence": 0.80, "evidence_refs": ["..."] },
    "3M":  { "signal": "buy",         "confidence": 0.70, "evidence_refs": ["..."] },
    "6M":  { "signal": "hold",        "confidence": 0.50, "evidence_refs": ["..."] },
    "1Y":  { "signal": "sell",        "confidence": 0.60, "evidence_refs": ["..."] }
  },
  "alignment_score": 0.50,
  "divergence_pattern": "short_term_bullish_long_term_bearish",
  "divergence_interpretation": "Potential mean-reversion setup; short-term strength inside a long-term downtrend typically resolves back to trend."
}
```

### The 6 Canonical Timeframes

Chosen to match the horizons real traders operate on, not for arbitrary round numbers:

| Code | Window | Data Resolution | Primary Audience |
|---|---|---|---|
| `1D` | Today's session | 1-minute bars | Day traders, scalpers |
| `5D` | Trailing 5 trading days | Hourly bars | Swing traders |
| `1M` | Trailing ~21 trading days | Daily bars | Position traders |
| `3M` | Trailing ~63 trading days | Daily bars | Retail investors |
| `6M` | Trailing ~126 trading days | Daily bars | Seasonal investors |
| `1Y` | Trailing ~252 trading days | Daily + weekly | Long-term holders |

### Feature Stack Per Timeframe

For each ticker × timeframe cell, compute:

- Return % over the window
- Relative return vs sector ETF (suggestion #18)
- RSI(14) and divergence flag (#13)
- MACD state (#14)
- Bollinger Band position (#11)
- Volume z-score (#12)
- 20-period EMA position (above/below)

These features are stored in BigQuery `mart.timeframe_features` (keyed by `ticker, as_of_date, timeframe`) so that both the Gemini prompts and the eval harness read from the same source of truth.

### Divergence Patterns (The Meta-Signal)

Beyond the per-timeframe signals, emit a `divergence_pattern` describing the overall shape:

- `aligned_bullish` — ≥5 of 6 timeframes are `buy`/`strong_buy`
- `aligned_bearish` — ≥5 of 6 timeframes are `sell`/`strong_sell`
- `short_term_bullish_long_term_bearish` — 1D/5D bullish, 3M/6M/1Y bearish → mean-reversion setup
- `short_term_bearish_long_term_bullish` — 1D/5D bearish, 3M/6M/1Y bullish → pullback buy
- `choppy` — alignment_score between 0.4 and 0.6, no coherent pattern
- `early_reversal` — 1M/3M flipping against 6M/1Y trend

An `interpretation` string accompanies each pattern, generated by Gemini but constrained by a template catalog so it cannot freely hallucinate. Templates versioned at `backend/templates/divergence_interpretations.yml`.

### Alignment Score Formula

```python
def alignment_score(timeframes: dict[str, SignalOutput]) -> float:
    """
    Fraction of timeframes agreeing with the modal signal direction.
    Strong_buy and buy count as 'bullish'; strong_sell and sell as 'bearish'.
    Hold is neutral and neither agrees nor disagrees.
    """
    directions = [_to_direction(tf.signal) for tf in timeframes.values()]
    bullish = sum(d == "bull" for d in directions)
    bearish = sum(d == "bear" for d in directions)
    neutral = sum(d == "neutral" for d in directions)
    total_directional = bullish + bearish
    if total_directional == 0:
        return 0.0
    return max(bullish, bearish) / total_directional
```

### Computational Budget

Six timeframes × 500 tickers = 3,000 signal cells per refresh. Naive Gemini calls = 3,000 LLM calls = $$$. Mitigations:

- **Batch by timeframe:** One Gemini call handles 50 tickers in a single prompt for a given timeframe. Reduces 3,000 → 60 calls.
- **Cache aggressively:** 1M/3M/6M/1Y timeframes change slowly. Cache at 4h / 12h / 24h / 24h TTL. Only 1D and 5D need live recompute.
- **Delta signals:** If input features haven't moved > 1σ since the cached signal, skip the LLM call entirely and return the cached value with `stale: true` flag (suggestion #57).
- **Off-peak pre-compute:** Run 1M/3M/6M/1Y cells nightly via Cloud Tasks at 2am ET when API quotas are fresh. Users see sub-100ms responses during the day.

### Mobile Rendering

The `/signals` tab's per-ticker row becomes a **6-cell horizontal matrix**:

```
AAPL   [1D↑][5D→][1M⬆][3M↑][6M→][1Y↓]   align 0.50   💡 setup
```

- Each cell shows the signal direction via arrow icon, colored by direction, sized (padding) by confidence.
- Tap a cell → drills into that timeframe's evidence chain (see Weakness #4).
- The 💡 icon indicates a notable divergence pattern; tap for interpretation.
- `alignment_score` rendered as a horizontal bar at right: full-width green = aligned bullish, full-width red = aligned bearish, short bars = choppy.

### Definition of Done

- [ ] `backend/signals.py` returns a `TimeframeMatrix` object, not a scalar.
- [ ] `mart.timeframe_features` BigQuery table exists and is populated nightly for the full universe.
- [ ] `/signals` endpoint p95 latency < 500ms when serving cached data.
- [ ] Divergence pattern classifier is tested against 50 historical examples with a human-labeled ground truth of expected pattern.
- [ ] Mobile `SignalMatrixRow` component exists and passes visual regression tests.
- [ ] `alignment_score` rendered and accessible via screen reader.
- [ ] Eval harness (Weakness #1) reports hit rate separately for each timeframe.

---

## Weakness #4 — No Signal Provenance / Explainability

### Problem Statement

Gemini says "strong_buy" and the user has to trust it. This is unacceptable for three reasons:

1. **User trust:** A black-box financial signal has no credibility. "Because AI said so" is the least persuasive rationale in finance, especially after the 2024–2025 wave of hallucinated analyst recommendations.
2. **Debuggability:** When a signal is obviously wrong in hindsight, the team cannot determine whether the rule logic, the input data, the prompt, or the model was at fault. Without provenance, every post-mortem is speculation.
3. **Regulatory / platform compliance:** App Store review and FINRA-adjacent content guidelines increasingly ask "how does your app produce investment recommendations?" "An LLM decided" is a dispreferred answer. An auditable evidence chain is a required answer.

### Target State

Every signal is stored with an **evidence chain** — a list of the discrete pieces of information that contributed to the decision, each with a source, value, and weight. Mobile renders a tap-to-expand view. Regulators and users alike can audit the reasoning.

```json
{
  "signal": "strong_buy",
  "confidence": 0.82,
  "evidence": [
    {
      "id": "evidence_456a",
      "source": "macro_regime",
      "source_detail": "hmm_classifier_v2",
      "value": "Risk-On",
      "supporting_value": { "risk_on_prob": 0.71, "risk_off_prob": 0.15 },
      "weight": 0.25,
      "direction": "bullish",
      "as_of": "2026-04-20T09:30:00Z",
      "freshness_seconds": 14400
    },
    {
      "id": "evidence_789b",
      "source": "sector_rotation",
      "source_detail": "xlk_vs_spy_5d",
      "value": "Technology leading",
      "supporting_value": { "relative_return_5d": 0.024, "rank_among_sectors": 2 },
      "weight": 0.20,
      "direction": "bullish",
      "as_of": "2026-04-20T16:00:00Z",
      "freshness_seconds": 0
    },
    {
      "id": "evidence_abc1",
      "source": "volume",
      "source_detail": "20d_zscore",
      "value": "Volume spike",
      "supporting_value": { "z_score": 2.3, "raw_volume": 142000000 },
      "weight": 0.15,
      "direction": "bullish",
      "as_of": "2026-04-20T16:00:00Z",
      "freshness_seconds": 0
    },
    {
      "id": "evidence_def2",
      "source": "news_sentiment",
      "source_detail": "finnhub_24h",
      "value": "Positive earnings commentary",
      "supporting_value": { "sentiment_score": 0.62, "article_count": 11 },
      "weight": 0.20,
      "direction": "bullish",
      "as_of": "2026-04-20T14:23:00Z",
      "freshness_seconds": 5940
    },
    {
      "id": "evidence_ghi3",
      "source": "technical",
      "source_detail": "rsi_14_daily",
      "value": "RSI 58 — room to run",
      "supporting_value": { "rsi": 58.2, "overbought_threshold": 70 },
      "weight": 0.10,
      "direction": "mildly_bullish",
      "as_of": "2026-04-20T16:00:00Z",
      "freshness_seconds": 0
    },
    {
      "id": "evidence_jkl4",
      "source": "counter_argument",
      "source_detail": "earnings_calendar",
      "value": "Earnings in 4 days — event risk",
      "supporting_value": { "days_to_earnings": 4, "historical_iv_spike": 0.35 },
      "weight": 0.10,
      "direction": "bearish",
      "as_of": "2026-04-20T00:00:00Z",
      "freshness_seconds": 58980
    }
  ],
  "evidence_summary": {
    "total_bullish_weight": 0.80,
    "total_bearish_weight": 0.10,
    "total_neutral_weight": 0.10,
    "dominant_theme": "macro + sector + volume alignment",
    "primary_counter_argument": "earnings event risk"
  }
}
```

### Evidence Source Taxonomy

Every evidence item must declare a `source` from the canonical enum. Free-text `source` is rejected at the schema layer.

| Source | Examples of source_detail | Typical direction |
|---|---|---|
| `macro_regime` | `hmm_classifier_v2`, `yield_curve_shape`, `vix_term_structure` | Bullish/Bearish |
| `sector_rotation` | `relative_sector_return_5d`, `xlk_vs_spy_1m` | Bullish/Bearish |
| `technical` | `rsi_14_daily`, `macd_state`, `bb_position_20d` | Any |
| `volume` | `20d_zscore`, `dark_pool_ratio` | Any |
| `fundamental` | `pe_vs_sector_median`, `eps_growth_yoy` | Any |
| `news_sentiment` | `finnhub_24h`, `newsapi_48h`, `social_sentiment_reddit` | Any |
| `options_flow` | `put_call_ratio`, `iv_skew`, `unusual_options` | Any |
| `earnings` | `surprise_pct`, `analyst_revisions`, `pead_drift` | Any |
| `corporate_action` | `earnings_date`, `ex_dividend_date`, `upcoming_split` | Counter-argument |
| `cross_asset` | `us10y_2y_spread`, `dxy_vs_equities` | Any |
| `counter_argument` | Any source used intentionally to argue the opposite of the final signal | Counter (opposite) |

### Storage Model

Two BigQuery tables:

- **`mart.signals`** — the canonical signal record. One row per (ticker, as_of, timeframe).
- **`mart.evidence`** — normalized evidence records. Many rows per signal, joined via `evidence_refs`.

This normalization lets us query "show me every signal in the last 90 days where `source = 'news_sentiment'` contributed > 0.3 weight and the signal was wrong" — which is the single most important debugging query.

### Weight Assignment

Weights must sum to 1.0 across a signal's evidence. There are three ways weights get assigned, in decreasing order of preference:

1. **From a trained model:** A gradient-boosted regression learns feature importances on `mart.prediction_ledger` (nightly refit). These importances become the default weights for each source × market-regime combination.
2. **From the agent itself:** When Gemini emits evidence, it also assigns its own weights (with a hard schema requirement that they sum to 1.0 within 0.01 tolerance).
3. **Uniform fallback:** Only if the agent fails to emit valid weights and no trained model exists for that source-mix.

Weight provenance (which of the three was used) is itself logged on the signal record, so we can evaluate whether trained-model weights outperform self-reported weights in the eval harness.

### Mobile UX

**Collapsed view:** A signal card shows the headline `BUY · 82%` and a stacked mini-bar indicating bullish/bearish/neutral weight distribution.

**Expanded view (tap):** Full evidence chain rendered as:

```
Why BUY? (82% confidence)

✓ Macro regime: Risk-On       [bullish ·  25%]
✓ Sector rotation: Tech #2    [bullish ·  20%]
✓ News sentiment: Positive    [bullish ·  20%]
✓ Volume spike (z=2.3)        [bullish ·  15%]
~ RSI 58 — room to run        [mild buy · 10%]
⚠ Earnings in 4 days          [bearish ·  10%]

Bullish weight: 80% · Bearish weight: 10% · Neutral: 10%
Primary counter-argument: earnings event risk
```

- Each row is tappable for the `supporting_value` numerical detail.
- Counter-arguments (bearish evidence on a buy signal, or vice versa) are always rendered last and visually distinguished. Intellectual honesty is the product.
- A "copy evidence chain" button emits the full JSON for power users / audit purposes.

### The "Show Your Work" Prompt Pattern

To get Gemini to produce structured evidence rather than prose, prompts follow a templated pattern:

```
You are evaluating AAPL for a {timeframe} signal.

You have access to these data points:
{feature_json}

Produce a signal in this exact JSON schema:
{pydantic_schema_json}

CRITICAL rules:
1. You MUST emit between 3 and 7 evidence items.
2. At least one evidence item MUST be a counter_argument (a reason
   your chosen signal could be wrong). If you cannot find a
   counter-argument, your confidence cannot exceed 0.6.
3. Evidence weights MUST sum to 1.0 (± 0.01).
4. Each evidence item's 'source' MUST be from this enum: {source_enum}.
5. Do not invent data. If a field is null in the input, you may
   not cite it as evidence.
```

Rule #2 is the most important. Forcing a self-generated counter-argument dramatically reduces overconfidence and produces more balanced, auditable signals. This is also the hook for suggestion #29 (self-critique loop) in the source critique.

### Definition of Done

- [ ] `backend/schemas/evidence.py` defines `Evidence` and `SignalWithEvidence` Pydantic models.
- [ ] `mart.signals` and `mart.evidence` BigQuery tables exist with appropriate partitioning.
- [ ] All 7 nav endpoints return signals with ≥ 3 evidence items (validator-enforced).
- [ ] Every evidence item includes `source`, `source_detail`, `value`, `supporting_value`, `weight`, `direction`, `as_of`, `freshness_seconds`.
- [ ] Weights sum to 1.0 ± 0.01 — enforced at the schema layer.
- [ ] At least one counter-argument per signal (unless confidence ≤ 0.6).
- [ ] Mobile `EvidenceExpandedView` component exists and renders weight-proportional bars.
- [ ] Weekly audit report lists signals where `source = 'news_sentiment'` had weight > 0.3 but outcome was wrong — used for prompt iteration.

---

---

## Weakness #7 — No Output Schema Validation

### Problem Statement

The current plan's LLM-integration strategy is "parse the JSON, fall back to rule-based on parse error." This is lax on three fronts:

- **Silent schema drift:** A prompt edit or model upgrade can quietly change the shape (e.g., `confidence` renamed to `conviction`, `evidence` becoming a string instead of an array). Parse succeeds, fields are silently `None`, downstream code treats missing fields as "no evidence" — quality degrades without any alarm.
- **Hallucinated enum values:** Gemini returns `"signal": "very_strong_buy"` (not in our 5-value enum). JSON parse succeeds; our signal renderer silently falls back to `hold`.
- **Over-eager fallback:** A single malformed JSON response should not collapse directly to the rule-based signal. It should retry with tightened constraints first — modern LLMs reliably return valid structured output if asked correctly.

Free-tier implication: wasted tokens are permanently gone from the daily budget. Silent schema failures during development burn quota for zero product value.

### Target State

A three-tier **schema enforcement pipeline** around every Gemini call:

1. **Tier 1 — Native structured output.** Every Gemini call passes a Pydantic-derived JSON schema via the `response_schema` parameter. Gemini's native constrained decoding handles 95%+ of cases with zero retries.
2. **Tier 2 — Pydantic validation + single constrained retry.** If the Tier 1 response still fails Pydantic validation (rare but possible with free-tier Flash), one retry with a tightened prompt that includes the validation error as context.
3. **Tier 3 — Rule-based fallback with honest labeling.** Only after Tier 1 + one Tier 2 retry fails. The response is marked `data_source: "rule_fallback"` and `ai_degraded: true` so the mobile UI can render a "⚠ AI unavailable" badge.

### Architecture

```
backend/llm/
├── client.py              # Thin wrapper around google-genai SDK
├── structured_call.py     # Tier 1: native response_schema
├── retry.py               # Tier 2: retry with validation-error feedback
├── fallback_router.py     # Tier 3: route to rule-based per endpoint
└── schemas/               # Per-endpoint Pydantic schemas (shared with Weaknesses 2/3/4)
    ├── signal_output.py
    ├── market_brief.py
    └── macro_regime.py
```

### Interface Contract

```python
from typing import TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

async def structured_generate(
    prompt: str,
    schema: type[T],
    *,
    model: str = "gemini-2.0-flash",
    max_retries: int = 1,               # Free-tier default; bump to 3 at scale
    fallback: Callable[[], T] | None = None,
) -> StructuredResult[T]:
    """
    Generates a structured response with Pydantic validation.

    Tier 1: response_schema constrained decoding.
    Tier 2: retry with validation-error feedback (max_retries times).
    Tier 3: call fallback() if provided; else raise SchemaValidationExhausted.

    Returns StructuredResult with:
      - value: T                      # The validated Pydantic object
      - tier_used: "native" | "retry" | "fallback"
      - attempts: int
      - validation_errors: list[str]  # Empty on Tier 1 success
      - cost_usd: Decimal             # Feeds into Weakness #10
    """
```

### Free-Tier Optimization

- **Single retry (not three).** Free-tier Gemini Flash allows ~15 RPM; a 3-retry loop on a validation failure can throttle an entire endpoint. One retry catches 99% of transient malformations.
- **Schema caching.** `response_schema` JSON is large (a full `SignalOutput` schema is ~2 KB). Gemini's prompt-cache TTL (~5 min) means if the same schema is sent repeatedly across requests, it's cached server-side. Keep the schema literal identical across calls — do not rebuild it per request.
- **Minimal schema verbosity.** Strip Pydantic docstrings from the exported schema (they're for devs, not the model). A compact schema is ~40% fewer tokens.

### Scale-Up Knobs

- `max_retries: 3` when paid quota is in place — catches rare complex-prompt malformations.
- Switch to Gemini Pro for endpoints where schema complexity is high (e.g., the full `TimeframeMatrix` with 6 nested `SignalOutput` objects).
- Add Tier 2.5: constrained generation with BNF grammar for deterministic output (Vertex AI paid feature).

### Definition of Done

- [ ] `backend/llm/structured_call.py` exists and wraps every LLM call in the codebase.
- [ ] No direct `genai.GenerativeModel.generate_content()` call remains outside this wrapper.
- [ ] Schema-validity rate metric (from Weakness #1) exceeds 99% in CI eval runs.
- [ ] Tier 3 fallback events emit a Cloud Logging warning with `ai_degraded=true` structured field.
- [ ] Mobile receives `data_source` on every signal and renders a "⚠ AI unavailable" badge when `"rule_fallback"`.

---

## Weakness #8 — No Grounding / Real-Time News Hook

### Problem Statement

Gemini's training cutoff is months behind live markets. The plan mentions Vertex grounding in passing but doesn't use it. Consequences:

- **Stale macro narrative.** At 2 PM the Fed delivers a surprise 50bps cut; at 2:05 PM the `/macro-pulse` endpoint still narrates the pre-meeting regime as if nothing happened.
- **Missed idiosyncratic news.** A ticker is halted on news; the `/signals` endpoint's next call still says "strong_buy" because the model has no post-cutoff awareness.
- **No citation trail.** Even when Gemini gets something right, there's no URL to verify. See Weakness #4 — this compounds the explainability failure.

### Target State

Grounding enabled on two specific endpoints where recency matters most:

- **`/market-overview` (ai_summary.py):** Grounded with Google Search for the daily AI brief, so commentary reflects last-4-hour news.
- **`/macro-pulse`:** Grounded for regime-change narrative, so Fed / BLS / geopolitical shocks appear in the narration the same day.

Other endpoints stay ungrounded to preserve quota — their signals are built on numerical features, not narrative context.

### Architecture

Vertex AI Grounding with Google Search is a flag on the generate call, not a separate API. Implementation:

```python
async def generate_grounded(
    prompt: str,
    schema: type[T],
    *,
    model: str = "gemini-2.0-flash",
    max_grounding_queries: int = 3,     # Free-tier default
) -> GroundedResult[T]:
    """
    Same contract as structured_generate, but enables Google Search grounding.

    Returns GroundedResult with additional fields:
      - citations: list[Citation]     # URL, snippet, relevance_score
      - grounded: bool                # False if no search was triggered
      - search_queries_used: int
    """
```

Every grounded response includes a `citations` list that flows into the evidence chain (Weakness #4) as `source: "news_sentiment"` evidence items with the URL in `supporting_value.url`.

### Caching Strategy (Free-Tier Critical)

Grounded calls are ~3–5x more expensive than ungrounded. Cache policy must reflect this:

| Endpoint | Grounded TTL | Ungrounded TTL | Refresh trigger |
|---|---|---|---|
| `/market-overview` | 30 min | 8 h | Cache miss or user manual refresh |
| `/macro-pulse` | 30 min | 8 h | Cache miss or Pub/Sub regime-change event |

The 30-minute TTL is the key free-tier optimization: refreshing 2x/hour during the 6.5-hour US market session = 13 grounded calls/day per endpoint × 2 endpoints = **26 grounded calls/day**. Well inside free-tier limits.

Cache key = `{endpoint}:{YYYY-MM-DD-HH:MM}` bucketed to 30-minute boundaries. Firestore doc at `ai_cache/{cache_key}` with TTL enforced via Firestore TTL policy (no cron needed).

### Forced Refresh on Regime Change

A 30-minute TTL is too slow when the Fed speaks. Override: when Pub/Sub topic `macro-shock-detected` publishes (triggered by VIX spike > 3σ or yield curve move > 10bps in 15 min), invalidate the cache key and force next request to regenerate grounded. Free-tier impact: maybe 3–5 extra calls per month; trivial.

### Grounding Quality Gates

Not all grounding is good grounding. Validation rules:

- **Citation count:** A grounded response must include ≥ 2 citations. Fewer = the model ignored search results, treat as ungrounded.
- **Citation recency:** At least one citation must have a publication timestamp within the last 48 hours. Older-only = grounding fired but found no fresh news.
- **Citation diversity:** Citations must come from ≥ 2 distinct domains. Single-domain = potential echo chamber.

Violations trigger a re-run without grounding (saving quota on a useless grounded call on the next refresh cycle).

### Free-Tier Optimization

- **Endpoint allowlist.** Only `/market-overview` and `/macro-pulse` ever pass `enable_grounding=True`. Everything else is numerical-feature-driven and doesn't need it.
- **30-minute bucketing.** Dramatic reduction vs per-request grounding.
- **Skip grounding on pre-market.** Market overview pre-market (4–9:30 AM ET) is stable; one grounded call at 4 AM covers the whole pre-market window.
- **Prefer citations in evidence over re-grounding.** Once an article URL is captured as evidence, subsequent signals about the same ticker within 24h can reference it without re-searching.

### Scale-Up Knobs

- Enable grounding on `/signals` and `/industry-intel` when paid quota permits.
- Lower the TTL to 10 minutes during high-volatility sessions (VIX > 25).
- Add additional grounding providers (Bloomberg via Vertex, if licensed) to diversify citation sources.

### Definition of Done

- [ ] `backend/llm/grounded_call.py` implements the `generate_grounded` contract.
- [ ] Only `ai_summary.py` and `macro_pulse.py` call it; enforced by a lint rule in `backend/ruff.toml`.
- [ ] Grounded responses include ≥ 2 citations or are rejected and regenerated ungrounded.
- [ ] Cache keys bucket to 30-min boundaries; TTL enforced via Firestore TTL policy.
- [ ] Pub/Sub `macro-shock-detected` topic wired to cache invalidation.
- [ ] Citations flow into evidence chain (Weakness #4) with full URL.
- [ ] Mobile `/macro-pulse` screen renders citation chips beneath the AI narrative; tap → in-app browser.

---

## Weakness #9 — No Agent Loop (Fire-and-Forget AI)

### Problem Statement

Every AI call in the current plan is one-shot: pack features into a prompt, call Gemini, parse, return. A real autonomous agent operates on a loop:

> observe → reason → call tools → observe again → reason → decide

Specifically, when Gemini is asked "is AAPL a buy?", it would benefit enormously from being able to:

- Ask for the last 4 hours of AAPL news (not pre-packaged into the prompt).
- Ask for AAPL's 30-day correlation to SPY.
- Check whether AAPL reports earnings in the next 5 days.
- Compare AAPL's current volume-z to the last 10 earnings-week averages.

In the one-shot model, the backend must pre-compute every possibly-relevant feature and pack it into the prompt. This wastes tokens (most features are unused for any given ticker), burns context, and caps reasoning at whatever we pre-guessed.

### Target State

Two designated **high-stakes endpoints** — `/macro-pulse` and `/market-overview` — upgrade from one-shot to **ReAct-style agent loops** where Gemini can call a small tool set before finalizing its output.

Other endpoints stay one-shot. Agent loops are expensive (multiple LLM calls per request); free-tier mandates surgical deployment.

### Tool Set (Initial — Scale-Up Adds More)

| Tool | Free-tier cost | What it returns | When it's called |
|---|---|---|---|
| `fetch_recent_news(ticker, hours=4)` | Finnhub call (quota-accounted) | List of headlines + URLs + sentiment | When agent sees a large unexplained move |
| `compute_return(ticker, period)` | BigQuery query (~free under 1 TB/mo) | Return over arbitrary period | When agent wants a non-standard timeframe |
| `check_earnings_date(ticker)` | Firestore read (~free) | Next earnings date or `None` | Before finalizing any multi-day signal |
| `get_correlation(ticker_a, ticker_b, period_days=30)` | BigQuery query | Pearson correlation | When agent suspects sector-driven move |
| `fetch_macro_indicator(name)` | Firestore read | Latest value of named indicator (VIX, DXY, etc.) | In `/macro-pulse` reasoning |

Tools are exposed via Gemini's native function-calling. Each tool has a strict Pydantic argument schema (Weakness #7) so the agent cannot pass garbage.

### Loop Budget (Free-Tier Critical)

Unbounded agent loops are bankruptcy-by-recursion:

- **Max turns per session: 4.** Observation → tool call → observation → final output. More than 4 turns indicates the agent is confused; bail to a one-shot fallback.
- **Max tool calls per turn: 2.** Parallelizable when possible.
- **Max tool calls per session: 5.** Hard ceiling.
- **Total wallclock budget: 15 seconds.** Mobile cannot wait longer. Abort with partial state if exceeded.

A single `/macro-pulse` agent session, fully utilized, costs ~5x a one-shot call. With 30-min caching (Weakness #8), that's still ~2 agent sessions per endpoint per hour × 6.5 market hours × 2 endpoints = **26 agent sessions/day**. Well within free-tier with Gemini Flash.

### Architecture

```
backend/agents/
├── base.py                   # AgentLoop orchestrator with budget enforcement
├── macro_agent.py            # /macro-pulse specialist
├── market_overview_agent.py  # /market-overview specialist
├── tools/
│   ├── __init__.py           # Tool registry
│   ├── news.py               # fetch_recent_news
│   ├── returns.py            # compute_return
│   ├── earnings.py           # check_earnings_date
│   ├── correlation.py        # get_correlation
│   └── macro.py              # fetch_macro_indicator
└── tests/
    └── test_macro_agent.py
```

### Observability (Free-Tier Lean)

Every agent session emits one structured log line at completion:

```json
{
  "agent": "macro_agent",
  "run_id": "uuid",
  "turns": 3,
  "tool_calls": ["fetch_macro_indicator", "fetch_recent_news", "compute_return"],
  "total_latency_ms": 8400,
  "total_cost_usd": 0.0024,
  "final_confidence": 0.78,
  "exited_reason": "completed" | "budget_exceeded" | "error"
}
```

One log line — not a trace per tool call — keeps Cloud Logging free-tier ingestion under the 50 GiB/mo quota. Granular per-tool traces get added in the scale-up path only if debugging demands it.

### Fallback on Budget Exceeded

If the agent hits the 4-turn or 15-second budget, the orchestrator issues a final "you've run out of time, commit to an answer now" prompt and accepts whatever comes back. If that final prompt also times out, fall through to the one-shot version of the same endpoint. `ai_degraded: true` flag set.

### Scale-Up Knobs

- Raise `max_turns` from 4 to 6 when paid quota allows.
- Add tools: `simulate_if_then(scenario)` (critique #27), `fetch_social_sentiment(ticker)`.
- Promote more endpoints to agent loops: `/signals` (per-ticker deep dives), `/content` (the blog/review multi-agent council in critique #30).
- Switch to Gemini Pro for the reasoning step, Flash for the tool-use step (cost-optimal hybrid).

### Free-Tier Optimization

- **Endpoint allowlist.** Only 2 endpoints out of 7 get agent loops.
- **Strict budgets.** Hard ceilings enforced in orchestrator, not hoped-for.
- **Tool caching.** `check_earnings_date` and `fetch_macro_indicator` hit cache before external calls. Earnings dates change once per quarter per ticker — cache at 24h TTL.
- **Parallel tool calls.** When the agent requests two tools in one turn, execute concurrently via `asyncio.gather`.

### Definition of Done

- [ ] `backend/agents/base.py` enforces turn/tool/latency budgets with tests.
- [ ] `macro_agent` and `market_overview_agent` pass eval harness (Weakness #1) with hit-rate at or above the one-shot baseline.
- [ ] Tool registry has 5 tools, each with Pydantic argument schemas.
- [ ] Single structured log line per session, parseable by the cost dashboard (Weakness #10).
- [ ] Budget-exceeded path falls back cleanly to one-shot with `ai_degraded: true`.
- [ ] No endpoint besides `/macro-pulse` and `/market-overview` uses agent loops (enforced by lint).

---

## Weakness #10 — No Cost Telemetry

### Problem Statement

The plan doesn't track Gemini token spend per endpoint. On a free tier, this means *one bad day* — a misbehaving prompt, an unexpected retry storm, a watchlist-personalization feature that 10xs request volume — silently exhausts the daily free quota. Users start seeing 429s, and you find out from angry emails rather than a dashboard.

At scale the failure mode becomes the surprise monthly bill. Either way, untracked spend is a ticking bomb.

### Target State

Every LLM call — grounded, agent-loop, or one-shot — emits a structured log entry with full cost decomposition. A Cloud Logging log-based metric → Cloud Monitoring dashboard gives live visibility. Alerts fire at 50%, 80%, 95% of free-tier daily quota.

### What Gets Logged (Per Call)

```json
{
  "event": "llm_call",
  "timestamp": "2026-04-20T14:23:11.482Z",
  "endpoint": "/signals",
  "ticker": "AAPL",
  "agent": null,
  "model": "gemini-2.0-flash",
  "prompt_version": "screener_v3",
  "grounded": false,
  "input_tokens": 1842,
  "output_tokens": 284,
  "cached_tokens": 1500,
  "total_tokens": 2126,
  "cost_usd": 0.00021,
  "latency_ms": 1840,
  "tier_used": "native",
  "validation_retries": 0,
  "cache_hit": false,
  "request_id": "uuid",
  "user_tier": "free"
}
```

Fields chosen so that a single table can answer:

- **"Which endpoint is burning the most quota?"** → `GROUP BY endpoint`
- **"Is grounded cost justified by usage?"** → `WHERE grounded = true`
- **"How much did prompt v3 cost vs v2?"** → `GROUP BY prompt_version`
- **"Are retries eating quota?"** → `SUM(validation_retries * avg_cost)`
- **"What's our cache hit rate saving us?"** → `SUM(cost_usd) WHERE cache_hit = false / total`

### Architecture

- **Source of events:** Every LLM call routed through `backend/llm/structured_call.py` (Weakness #7). The wrapper is the single choke point; if you can't get a cost log there, you can't get one anywhere.
- **Emission:** Python `logging` with JSON formatter → stdout → Cloud Run captures → Cloud Logging.
- **Routing to BQ:** Cloud Logging **log sink** to BigQuery `telemetry.llm_calls` (partitioned by day, clustered by endpoint). Sink creation is free; storage is ~$0.02/GB/mo.
- **Aggregation:** Cloud Logging **log-based metrics** for real-time dashboards — `llm_cost_usd_total`, `llm_calls_count`, `llm_latency_ms_p95`, each with labels `{endpoint, model, grounded}`.
- **Dashboard:** Cloud Monitoring dashboard `llm-spend` with free-tier thresholds annotated.
- **Alerts:** Cloud Monitoring alert policies firing to Pub/Sub → mobile push + email.

### Free-Tier Thresholds & Alerting

Gemini Flash free tier (as of 2026-04): ~1,500 requests/day, ~1M tokens/day.

| Alert | Condition | Channel |
|---|---|---|
| **Quota 50%** | `llm_calls_count` sum over trailing 24h > 750 | Slack/email, non-paging |
| **Quota 80%** | `llm_calls_count` sum over trailing 24h > 1200 | Pager, 1-hour ack deadline |
| **Quota 95%** | `llm_calls_count` sum over trailing 24h > 1425 | Pager, 5-minute ack, auto-disable non-critical endpoints via Firestore flag |
| **Runaway retries** | `validation_retries` sum over trailing 1h > 50 | Pager — indicates prompt regression |
| **Grounded-cost anomaly** | `llm_cost_usd_total WHERE grounded=true` doubles day-over-day | Pager |
| **Latency regression** | `llm_latency_ms_p95` > 8000 for 3 consecutive 5-min windows | Non-paging |

The 95% threshold auto-disables endpoints marked `ai_optional: true` in Firestore config. `/content` and `/market-overview` degrade to cached or rule-based for the rest of the day. Core endpoints (`/signals`) stay up. This is the circuit-breaker pattern (critique #32) pre-wired to cost rather than error rate.

### Cost Model (Keep the Arithmetic Current)

A constant source of truth at `backend/llm/pricing.yml`:

```yaml
gemini-2.0-flash:
  input_per_1m_usd: 0.075
  output_per_1m_usd: 0.30
  cached_input_per_1m_usd: 0.01875   # 75% discount
  grounded_surcharge_per_request_usd: 0.035

gemini-2.0-pro:
  input_per_1m_usd: 1.25
  output_per_1m_usd: 5.00
  cached_input_per_1m_usd: 0.3125
  grounded_surcharge_per_request_usd: 0.035
```

Every call computes its own `cost_usd` from this table at emission time. When Google updates prices, one YAML edit re-costs all downstream dashboards. No stale hardcoded numbers.

### Per-User Attribution (Scale-Up Ready, Free-Tier Skipped)

Initially, all requests are `user_tier: "free"` and un-attributed beyond endpoint. When a paid tier launches:

- Add `user_id` (hashed) to the log.
- Add a per-user daily quota to the Firestore quota ledger (critique #53 generalization).
- Build a user-facing cost dashboard in the mobile app's `/status` screen (critique #60 extension).

### Dashboard Layout

Single Cloud Monitoring dashboard, 6 panels:

1. **Daily request count** (line, 7-day trailing) with free-tier ceiling line.
2. **Cost USD / day** stacked by endpoint.
3. **P95 latency** per endpoint.
4. **Cache hit rate** per endpoint (want > 40%).
5. **Retry rate** per prompt_version (want < 2%).
6. **Top 10 most-expensive tickers today** — surfaces thundering-herd behavior.

### Free-Tier Optimization

- **Log-based metrics are free** up to generous ingestion limits. Dashboard, alerts, aggregation — all free.
- **BQ sink** has minimal free-tier cost; the `telemetry.llm_calls` table is small (~1 MB/day at free-tier usage).
- **No paid APM tool** (Datadog, New Relic) in the free-tier path. Cloud Monitoring natively does it.

### Scale-Up Knobs

- Add Langfuse or Helicone for detailed per-span tracing when sessions get complex.
- Stream costs to a dedicated analytics warehouse (Snowflake/Databricks) when finance needs chargeback.
- Per-user real-time quota enforcement for paid tiers.

### Definition of Done

- [ ] Every LLM call in the codebase emits the structured log line above.
- [ ] `backend/llm/pricing.yml` is the single source of truth for model prices.
- [ ] Log sink `llm-telemetry-sink` routes to `telemetry.llm_calls` BigQuery table.
- [ ] Cloud Monitoring dashboard `llm-spend` exists with 6 panels.
- [ ] Alert policies for 50%, 80%, 95% quota thresholds exist and page on-call.
- [ ] 95% threshold auto-disables `ai_optional: true` endpoints via Firestore flag flip.
- [ ] Runaway-retry and grounded-cost anomaly alerts fire successfully in a dry-run test.

---

## Cross-Cutting Dependencies

The eight weaknesses are not independent. They share concerns that must be designed coherently:

| Shared concern | #1 Eval | #2 Confidence | #3 Multi-TF | #4 Evidence | #7 Schema | #8 Grounding | #9 Agent | #10 Cost |
|---|---|---|---|---|---|---|---|---|
| **Pydantic `SignalOutput` schema** | Ingested by variants | Defines `confidence` validators | Nested inside `TimeframeMatrix` | Contains `evidence_refs` | Primary enforcement surface | Response shape of grounded calls | Agent final-output shape | — |
| **`backend/llm/structured_call.py` choke point** | All variants call through it | Validates confidence field | Per-timeframe call site | Validates evidence list | Implements the 3-tier pipeline | Wrapped by `generate_grounded` | Wrapped by agent turns | Emits cost log line |
| **`mart.prediction_ledger`** | Source of eval ground truth | Source for calibration fit | Rows partitioned by timeframe | Joined to `mart.evidence` | — | — | — | Joined to `telemetry.llm_calls` for cost-per-correct-signal |
| **Prompt versioning** | Variants pin `prompt_version` | Confidence elicitation in prompt | Six prompts (one per timeframe) | Evidence-extraction template | Embedded in schema metadata | Grounding instructions | Agent system prompt | Logged per call |
| **Feature snapshot** | Replayed historically | Input to confidence adjustment | One per timeframe | Source of evidence `supporting_value` | — | Augmented by live citations | Fetched via tools | — |
| **Free-tier budget** | Eval runtime capped | Calibration fit offline | Cached per-timeframe | — | Single retry only | 30-min TTL buckets | 4-turn hard cap | Enforces all the above |

Implication: these items MUST be designed together, not serially. The `structured_call.py` wrapper (Weakness #7) is the single choke point through which confidence enforcement (#2), evidence validation (#4), grounded calls (#8), agent turns (#9), and cost logging (#10) are all measured. Ship #7 first inside the week-1 schema foundation or all downstream work duplicates boilerplate.

---

## Shared Data Contracts

### Canonical `SignalOutput` (used everywhere)

```python
from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

Signal = Literal["strong_buy", "buy", "hold", "sell", "strong_sell"]
EvidenceSource = Literal[
    "macro_regime", "sector_rotation", "technical", "volume",
    "fundamental", "news_sentiment", "options_flow", "earnings",
    "corporate_action", "cross_asset", "counter_argument",
]
Timeframe = Literal["1D", "5D", "1M", "3M", "6M", "1Y"]

class Evidence(BaseModel):
    id: str
    source: EvidenceSource
    source_detail: str
    value: str
    supporting_value: dict
    weight: float = Field(ge=0.0, le=1.0)
    direction: Literal["bullish", "bearish", "neutral", "mildly_bullish", "mildly_bearish"]
    as_of: datetime
    freshness_seconds: int = Field(ge=0)

class SignalOutput(BaseModel):
    ticker: str
    timeframe: Timeframe
    signal: Signal
    confidence: float = Field(gt=0.0, lt=1.0)
    rationale: str = Field(min_length=20, max_length=500)
    evidence: list[Evidence] = Field(min_length=3, max_length=7)
    prompt_version: str
    model_id: str
    generated_at: datetime

    @model_validator(mode="after")
    def weights_sum_to_one(self) -> "SignalOutput":
        total = sum(e.weight for e in self.evidence)
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Evidence weights sum to {total}, must sum to 1.0 ± 0.01")
        return self

    @model_validator(mode="after")
    def requires_counter_argument_above_060(self) -> "SignalOutput":
        has_counter = any(e.source == "counter_argument" for e in self.evidence)
        if self.confidence > 0.6 and not has_counter:
            raise ValueError("Confidence > 0.6 requires at least one counter_argument evidence item.")
        return self

class TimeframeMatrix(BaseModel):
    ticker: str
    timeframes: dict[Timeframe, SignalOutput]
    alignment_score: float = Field(ge=0.0, le=1.0)
    divergence_pattern: Literal[
        "aligned_bullish", "aligned_bearish",
        "short_term_bullish_long_term_bearish",
        "short_term_bearish_long_term_bullish",
        "choppy", "early_reversal",
    ]
    divergence_interpretation: str
```

This schema is the single source of truth. Ingested by backend, mobile, eval harness, and BigQuery DDL.

---

## Rollout Sequencing

Attempting all eight items simultaneously is risky; a serial rollout that still respects the coupling:

1. **Week 1 — Schema + Feature foundation.** Define `SignalOutput`, `Evidence`, `TimeframeMatrix` Pydantic models. Create BigQuery DDL for `mart.signals`, `mart.evidence`, `mart.timeframe_features`, `mart.prediction_ledger`, `telemetry.llm_calls`. No user-visible changes.
2. **Week 2 — Weaknesses #7 (schema pipeline) + #10 (cost telemetry).** Build the `structured_call.py` choke point with cost logging from day one. Route all existing Gemini calls through it. No behavior change, but now every call is measured and validated.
3. **Week 3 — Weakness #1 (eval harness).** Build with the schema and choke point in place. Run against `baseline_rule` and the *current* Gemini prompt to establish the floor and a baseline.
4. **Week 4 — Weakness #2 (confidence scoring).** Update prompts to elicit confidence; enforce schema. Gated by eval harness passing. Calibration layer empty initially — fit after 2 weeks of data collects.
5. **Week 5 — Weakness #4 (evidence).** Update prompts to demand structured evidence with counter-argument. Gated by eval harness. Mobile collapsed view ships; expanded view behind a feature flag.
6. **Week 6 — Weakness #8 (grounding).** Enable only on `/market-overview` and `/macro-pulse`. 30-min cache TTL. Cost alerts watching for anomaly.
7. **Weeks 7–8 — Weakness #3 (multi-timeframe).** Largest computational lift. Ship 1M/3M/6M/1Y first (easier to cache), 1D/5D last. Mobile matrix row behind a feature flag, dogfood internally before GA.
8. **Week 9 — Weakness #9 (agent loops).** Promote `/macro-pulse` and `/market-overview` to agent loops with 4-turn hard budget. Gated by eval harness showing non-regression vs one-shot.
9. **Week 10 — Calibration.** With ~6 weeks of confidence+outcome data, fit first calibration model. Enable ECE monitoring.
10. **Week 11 — Expanded mobile UX.** Evidence expanded view GA. Divergence interpretation GA. `/debug/calibration` GA. Agent-trace debug view GA.

Dates deliberately absolute — see suggestion #28 about relative dates rotting in memory.

---

## Free-Tier Budget Envelope

All eight remediations are explicitly designed to fit Google Cloud's always-free + Gemini free tier allocations. Budget envelope, verified day one and monitored continuously by Weakness #10:

### Daily LLM Call Budget (Gemini Flash Free Tier: ~1,500 RPD)

| Source | Calls/day | Justification |
|---|---|---|
| `/signals` one-shot (cached, 500 tickers × 6 TFs, ~40% cache hit) | ~600 | Most cells hit cache; daily pre-compute amortizes |
| `/market-overview` grounded (30-min TTL) | 13 | 6.5 market hours × 2 refreshes/hr |
| `/macro-pulse` grounded (30-min TTL) | 13 | Same cadence |
| `/industry-intel` one-shot (hourly) | 7 | Low-volatility, hourly refresh fine |
| `/industry-returns` one-shot (daily) | 1 | Computed overnight |
| `/screener` one-shot (cached) | ~100 | User-triggered, cached 1h |
| `/content` one-shot blog (daily) | 3 | Blog + review + devil's advocate once/day |
| Agent-loop sessions (5 calls each) | ~130 | 26 sessions × 5 avg calls |
| Eval harness (CI runs) | ~200 | Per-PR runs spread across day |
| **Total** | **~1,067** | **~71% of free tier** |

29% headroom absorbs retry storms, user-triggered refreshes, and feature ramp-up.

### Daily Infrastructure Budget

| Resource | Free-tier limit | Expected usage | % utilized |
|---|---|---|---|
| Cloud Run requests | 2M/mo | ~60k/day = 1.8M/mo | 90% |
| Firestore reads | 50k/day | ~30k/day | 60% |
| Firestore writes | 20k/day | ~8k/day | 40% |
| BigQuery query | 1 TB/mo | ~200 GB/mo (clustered tables) | 20% |
| BigQuery storage | 10 GB free | ~5 GB | 50% |
| Cloud Logging ingest | 50 GiB/mo free | ~10 GiB/mo | 20% |
| Pub/Sub messages | 10 GiB/mo free | ~1 GiB/mo | 10% |
| Cloud Tasks | 1M ops/mo free | ~30k/mo | 3% |

### When to Break the Free Tier (Scale-Up Triggers)

The free tier holds until one of these triggers fires. Each has a pre-decided response:

| Trigger | Response |
|---|---|
| Daily LLM calls > 1,425 for 3 days | Promote Gemini Flash to paid, set spend cap $50/mo |
| Firestore reads > 45k/day for 3 days | Migrate hot collections to BigQuery materialized views |
| Cloud Run requests > 1.9M/mo | Enable min-instances=1 on paid tier |
| BigQuery query > 900 GB/mo | Audit queries; add more clustering or partition pruning |
| DAU > 500 | Begin paid-tier migration regardless of metric triggers |

Each trigger auto-creates a Linear ticket via webhook (see critique reference section).

---

## Open Questions

These are deliberately not resolved in this spec and require stakeholder input before implementation begins:

1. **Cost ceiling per signal.** What's the acceptable $/signal cost? Influences whether Gemini Pro is allowed for nightly long-timeframe pre-compute or only Flash.
2. **Confidence exposure to users.** Do we show the calibrated or the raw confidence? Calibrated is more honest but harder to explain ("your model says 0.8 but really it's 0.65").
3. **Counter-argument fatigue.** Will users find always-present counter-arguments reassuring (intellectually honest) or annoying (hedging)? Needs A/B testing.
4. **Timeframe cell failures.** If the 1D cell fails but the other five succeed, do we return a partial matrix with the failed cell marked, or block the whole response? Leaning partial-with-marking, but this changes the mobile contract.
5. **Eval harness authority.** Does a failed eval block a merge unconditionally, or is there an SRE-style "break-glass" override? Current draft says override exists but must be logged; confirm.
6. **Attribution for external sources.** When an evidence item cites news sentiment, do we link through to the underlying article URLs? User UX win but copyright/linking exposure.
7. **Ground-truth horizon for eval.** Is 5-day forward return the right "was the signal correct?" label, or should it match the signal's own timeframe (1Y signals judged on 1Y outcomes)? Leaning toward matched-horizon, but matched-horizon means 1Y signals take a year to evaluate.

---

## Relationship to the Broader Critique

This document covers items **#1–#4 and #7–#10 of 60** from [CRITIQUE_LINEAR_GLIDING_OCEAN.md](./CRITIQUE_LINEAR_GLIDING_OCEAN.md). Remaining items build on this foundation — notably:

- **#6 Prompt versioning** and **#7 schema validation** are referenced throughout and should be implemented alongside #1.
- **#17 Alignment score**, **#13 RSI divergence**, **#14 MACD state** are feature inputs to the multi-timeframe matrix (#3).
- **#29 Self-critique loop** is the natural extension of the counter-argument requirement in #4.
- **#38 Prediction ledger** is the data source for calibration (#2) and for eval ground truth (#1).
- **#45 Accuracy badge** is the user-facing surface of the eval harness (#1).

Section A is the hard bedrock. The rest of the critique is architecture built on top.
