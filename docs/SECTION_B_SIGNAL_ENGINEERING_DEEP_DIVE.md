# Section B — Signal Engineering: Deep-Dive Remediation Spec

**Source:** [CRITIQUE_LINEAR_GLIDING_OCEAN.md § Section B](./CRITIQUE_LINEAR_GLIDING_OCEAN.md#section-b--signal-engineering-stronger-multi-timeframe-composable)
**Scope:** Items #11–#23 of the 60-item critique, expanded ~50% into feature-engineering-grade specifications.
**Audience:** Backend engineers, quant-ish developers building the feature layer beneath the AI agent stack.
**Status:** Proposal — defines the *shape, storage, refresh, validation, and consumption* of every derived signal feature.
**Cost posture:** Free-tier-first (Massive free tier for technicals, yfinance for history, CBOE for options, FRED for rates). Scale-up paths noted per item.
**Prerequisite:** [SECTION_A_CORE_WEAKNESSES_DEEP_DIVE.md](./SECTION_A_CORE_WEAKNESSES_DEEP_DIVE.md) — the evidence chain (#4), multi-timeframe matrix (#3), and schema validation (#7) assumed in place.

---

## Table of Contents

1. [Why Features Are the Floor](#why-features-are-the-floor)
2. [Shared Feature Layer Conventions](#shared-feature-layer-conventions)
3. [Feature #11 — Bollinger Band Position](#feature-11--bollinger-band-position)
4. [Feature #12 — Volume Z-Score](#feature-12--volume-z-score)
5. [Feature #13 — RSI + Divergence Detection](#feature-13--rsi--divergence-detection)
6. [Feature #14 — MACD Cross State](#feature-14--macd-cross-state)
7. [Feature #15 — Rolling Correlation Matrix](#feature-15--rolling-correlation-matrix)
8. [Feature #16 — Regime Transition Probability (HMM)](#feature-16--regime-transition-probability-hmm)
9. [Feature #17 — Timeframe Alignment Score](#feature-17--timeframe-alignment-score)
10. [Feature #18 — Sector-Relative Returns](#feature-18--sector-relative-returns)
11. [Feature #19 — Breadth Oscillators](#feature-19--breadth-oscillators)
12. [Feature #20 — Put/Call Ratio (Options Sentiment)](#feature-20--putcall-ratio-options-sentiment)
13. [Feature #21 — VIX Term Structure](#feature-21--vix-term-structure)
14. [Feature #22 — Cross-Asset Signals (Rates ↔ Equities)](#feature-22--cross-asset-signals-rates--equities)
15. [Feature #23 — Earnings Surprise & PEAD](#feature-23--earnings-surprise--pead)
16. [Feature Dependency Graph](#feature-dependency-graph)
17. [Feature Store Schema](#feature-store-schema)
18. [Refresh Orchestration](#refresh-orchestration)
19. [Backfill Strategy](#backfill-strategy)
20. [Validation & Data Quality](#validation--data-quality)
21. [Rollout Sequencing](#rollout-sequencing)

---

## Why Features Are the Floor

Section A fixed *how the AI thinks*. Section B fixes *what it thinks about*. Without quality feature engineering:

- The agent's evidence chain (Weakness #4) is filled with raw prices and obvious momentum readings — the stuff any free dashboard displays. The user gets no edge.
- The eval harness (Weakness #1) cannot distinguish a skilled signal from a lucky one because the input features lack predictive signal in the first place.
- The multi-timeframe matrix (Weakness #3) becomes 6 copies of "price went up X%" instead of 6 genuinely distinct lenses.

A better model on weaker features loses to a weaker model on better features *every time* in finance. Treat the feature layer as the product's floor: the agent can only be as smart as the data it sees.

---

## Shared Feature Layer Conventions

All 13 features in this document share:

### Storage

Single BigQuery table `mart.features_daily` (plus a few specialized tables for matrices and per-minute intraday):

```sql
CREATE TABLE mart.features_daily (
  as_of_date DATE NOT NULL,
  ticker STRING NOT NULL,
  timeframe STRING,                    -- '1D', '5D', '1M', '3M', '6M', '1Y', or NULL for non-TF features
  feature_name STRING NOT NULL,        -- 'bb_position', 'rsi_14', 'macd_state', etc.
  feature_value JSON,                  -- Schema varies per feature_name; validated at write time
  computed_at TIMESTAMP NOT NULL,
  computation_version STRING NOT NULL, -- 'bb_v1', 'rsi_v2' — bump on logic change
  data_source STRING NOT NULL,         -- 'massive', 'yfinance', 'cboe', 'fred'
  quality_flags ARRAY<STRING>          -- 'backfilled', 'interpolated', 'stale', etc.
)
PARTITION BY as_of_date
CLUSTER BY ticker, feature_name;
```

Partition by date, cluster by ticker + feature_name. Typical query pattern — "give me AAPL's RSI and BB for the last 90 days" — hits 1 partition and 2 cluster buckets, sub-second on free tier.

### Feature-Value Schema Registry

Each `feature_name` has a Pydantic schema at `backend/features/schemas/{name}.py`. Writes validate before `feature_value` is serialized to JSON. Reads deserialize through the same schema. This is the data-layer equivalent of Weakness #7's LLM-output validation.

### Computation Idempotency

Every feature compute function accepts `(ticker, as_of_date)` and is idempotent: re-running it produces byte-identical output given the same input bars. This makes backfill, disaster recovery, and eval-harness replay (Weakness #1) trivial.

### Versioning

`computation_version` bumps on any logic change (e.g., switching RSI from SMA-based to Wilder's smoothing). Historical feature rows retain their original version. The AI prompt is passed only features with the *current* version; the eval harness can query historical versions for A/B comparisons.

### Consumption Patterns

Three downstream consumers, all reading the same table:

1. **Gemini prompts** (`backend/prompts/{endpoint}_v{n}.txt`) — features formatted as compact JSON in the prompt's `<features>` block.
2. **Mobile UI** — sparkline data, badges, and evidence `supporting_value` fields.
3. **Eval harness** — historical replay against the `SignalVariant` interface.

All three read identical rows; no drift is possible.

---

## Feature #11 — Bollinger Band Position

### Motivation

A 3% daily move from the middle band is noise. A 3% daily move that pierces the upper band while volume-z > 2 is a breakout. Current signals treat both identically. Bollinger position encodes volatility context for free.

### Schema

```python
class BollingerPosition(BaseModel):
    timeframe: Timeframe
    period: int = 20                    # Standard 20-period default
    stddev_mult: float = 2.0            # Standard 2σ default
    upper_band: Decimal
    middle_band: Decimal                # Same as SMA(period)
    lower_band: Decimal
    current_price: Decimal
    position: Literal[
        "above_upper",                  # > upper band — breakout / overbought
        "upper_half",                   # Between middle and upper
        "lower_half",                   # Between lower and middle
        "below_lower",                  # < lower band — washout / oversold
    ]
    position_pct: float                 # 0.0 at lower_band, 1.0 at upper_band, can exceed [0,1]
    band_width_pct: float               # (upper - lower) / middle — volatility proxy
    squeeze: bool                       # band_width_pct at 6-month low — pre-breakout signal
```

### Why Six Fields, Not Three

The original critique proposed `{upper: bool, middle: bool, lower: bool}` — three booleans. That's lossy. The enriched schema preserves:

- **Exact band values** so the agent can explain "AAPL at $191 is 40 cents below the upper band at $191.40."
- **`position_pct`** for continuous position tracking (not just bucket).
- **`band_width_pct`** so the agent can distinguish low-volatility drift from high-volatility chop.
- **`squeeze`** — John Bollinger's own favored precursor-to-breakout tell. Free to compute, high-information.

### Computation

```python
def compute_bollinger(bars: pl.DataFrame, period: int = 20, stddev: float = 2.0) -> BollingerPosition:
    closes = bars["close"]
    sma = closes.rolling_mean(period)
    rolling_std = closes.rolling_std(period)
    upper = sma + stddev * rolling_std
    lower = sma - stddev * rolling_std
    current = closes[-1]
    width_pct = (upper[-1] - lower[-1]) / sma[-1]
    # squeeze: current width at 6-month minimum
    six_month_min_width = ((upper - lower) / sma).tail(126).min()
    squeeze = width_pct <= six_month_min_width * 1.05  # within 5% of 6-month low
    ...
```

### Per-Timeframe Materialization

Compute for all 6 timeframes from Weakness #3: `1D` uses 20-period on 1-min bars, `5D` uses 20-period on hourly bars, etc. The 20-period default is chosen so each timeframe's lookback is internally consistent (20 bars of whatever unit the timeframe operates in).

### Free-Tier Data Source

- **Intraday (1D, 5D):** Finnhub for live, yfinance fallback. Batched.
- **Daily+ (1M–1Y):** yfinance bulk OHLCV (unlimited quota — see critique #56). Nightly refresh.

### Refresh

- Intraday timeframes: every 5 minutes during market hours via Cloud Scheduler → Cloud Run Job (batches of 50 tickers).
- Daily+: nightly at 6 PM ET after close.

### Gemini Prompt Integration

Compact form in prompt:

```
<bb_1d>pos=upper_half(0.68) bw=2.1% squeeze=false</bb_1d>
<bb_1m>pos=above_upper(1.12) bw=4.3% squeeze=false</bb_1m>
```

Agent now reasons across timeframes: "short-term mean-reverting toward middle band but medium-term already broken out of upper — classic pullback within uptrend."

### Validation

- `upper_band > middle_band > lower_band` always. Violation → reject write.
- `band_width_pct` in `[0, 1]`. Wider = data error.
- `position_pct` usually in `[-0.2, 1.2]`; values outside flagged for review but not rejected (genuine extreme moves happen).

---

## Feature #12 — Volume Z-Score

### Motivation

"AAPL traded 80M shares today" means nothing without context. Z-score of `(today_vol - 20d_avg) / 20d_stddev` converts raw volume into regime-aware surprise. Z > 2 = meaningful accumulation or distribution.

### Schema

```python
class VolumeZScore(BaseModel):
    timeframe: Timeframe
    lookback_days: int = 20
    today_volume: int
    mean_volume: float
    stddev_volume: float
    z_score: float
    percentile_rank: float              # Volume's percentile within lookback window
    relative_to_adv: float              # today_volume / 20d_average_daily_volume
    classification: Literal[
        "extreme_accumulation",         # z > 3
        "heavy_accumulation",           # 2 < z <= 3
        "elevated",                     # 1 < z <= 2
        "normal",                       # -1 <= z <= 1
        "quiet",                        # -2 <= z < -1
        "drought",                      # z < -2
    ]
    price_volume_confirm: Literal[      # Joint price/volume signal
        "bullish_confirm",              # up day + heavy volume
        "bearish_confirm",              # down day + heavy volume
        "bullish_nonconfirm",           # up day + quiet volume (weak)
        "bearish_nonconfirm",           # down day + quiet volume (weak)
        "neutral",
    ]
```

### Why the 50% Richer Version

The original critique proposed a single scalar `volume_z_score`. That loses the distinction between "heavy volume on an up day" (bullish confirm) vs "heavy volume on a down day" (distribution). Adding `price_volume_confirm` captures the single most valuable use of volume in technical analysis.

### Computation

```python
def compute_volume_z(bars: pl.DataFrame, lookback: int = 20) -> VolumeZScore:
    recent = bars.tail(lookback + 1)    # +1 for today
    hist = recent.head(lookback)
    today_vol = recent["volume"][-1]
    mean = hist["volume"].mean()
    std = hist["volume"].std()
    z = (today_vol - mean) / std if std > 0 else 0.0
    pct_rank = (hist["volume"] < today_vol).sum() / lookback
    today_return = (recent["close"][-1] - recent["close"][-2]) / recent["close"][-2]
    confirm = _classify_price_volume(today_return, z)
    ...
```

### Data Source

Same as bars — Finnhub primary, yfinance fallback. Volume is already in the OHLCV call, so no marginal quota cost.

### Refresh

Daily (end-of-session). Intraday volume-z is noisy and not used in the current design.

### Known Quirks

- **Half-days and holidays** skew the 20d average. Exclude bars with `session_length_minutes < 390` from the mean/stddev compute.
- **Splits and dividends** inflate historical volume artificially. Use split-adjusted volume from yfinance (available via `auto_adjust=True`).
- **After-hours volume** is reported separately by some feeds. Regular-hours only.

### Gemini Prompt Integration

```
<volume>z=2.3 pct=97 classification=heavy_accumulation confirm=bullish_confirm</volume>
```

---

## Feature #13 — RSI + Divergence Detection

### Motivation

RSI alone is table-stakes. The edge is **divergence**: price makes a new high while RSI fails to confirm (bearish divergence) — a classic reversal tell. Most retail tools show RSI but not divergence detection.

### Schema

```python
class RsiFeature(BaseModel):
    timeframe: Timeframe
    period: int = 14                    # Standard Wilder's default
    smoothing: Literal["wilders", "sma", "ema"] = "wilders"
    current_rsi: float
    rsi_7d_trend: Literal["rising", "falling", "flat"]
    overbought: bool                    # current_rsi > 70
    oversold: bool                      # current_rsi < 30
    divergence: Literal[
        "bullish_regular",              # price LL, RSI HL — reversal up
        "bearish_regular",              # price HH, RSI LH — reversal down
        "bullish_hidden",               # price HL, RSI LL — trend continuation up
        "bearish_hidden",               # price LH, RSI HH — trend continuation down
        "none",
    ]
    divergence_strength: float          # 0-1 confidence in divergence pattern
    bars_since_last_divergence: int
    midline_cross_days: int             # Days since RSI crossed 50
```

### Divergence Detection Algorithm

Divergence is deceptively hard to detect automatically. Rule-based version (the floor):

1. Find local price peaks/troughs in last `N=5` bars using a 3-bar swing detection.
2. Find corresponding RSI peaks/troughs within ±2 bars of price swings.
3. Compare successive peak/trough pairs:
   - Price higher high + RSI lower high = bearish regular divergence.
   - Price lower low + RSI higher low = bullish regular divergence.
   - Price higher low + RSI lower low = bullish hidden divergence.
   - Price lower high + RSI higher high = bearish hidden divergence.
4. `divergence_strength` = `abs(rsi_delta) / abs(price_delta_pct)` normalized to `[0, 1]`.

Scale-up path: train a small 1D-CNN or BiLSTM on labeled divergence examples. Rule-based version achieves ~75% agreement with human labelers; ML version should hit 90%+. Deferred until we have labels.

### Free-Tier Optimization

**Massive's pre-computed RSI** (critique #55) via `/v1/indicators/rsi` eliminates rolling-window compute. One Massive call per ticker per timeframe at end-of-day — fits comfortably in 5 calls/min batched nightly.

### Data Storage

`mart.rsi_history` — one row per ticker × date × timeframe. Kept separate from `mart.features_daily` because divergence detection needs fast access to the last 20 RSI values, and a time-series-optimized narrow table outperforms the wide JSON table for this access pattern.

### Validation

- `current_rsi` in `[0, 100]`. Outside range → reject.
- Divergence detection requires ≥ 20 bars of history. Fewer → `divergence = "none"` with `quality_flags = ["insufficient_history"]`.

### Gemini Prompt Integration

```
<rsi_1d>val=58 trend=rising divergence=none</rsi_1d>
<rsi_1m>val=72 trend=flat divergence=bearish_regular strength=0.8</rsi_1m>
```

The agent now sees "daily RSI mild, monthly RSI already showing bearish divergence" — a mean-reversion setup it couldn't see before.

---

## Feature #14 — MACD Cross State

### Motivation

Raw MACD value tells nothing without context. The *state* — whether MACD is above or below signal line, how long since the last cross, whether the histogram is expanding or contracting — is what encodes momentum regime.

### Schema

```python
class MacdState(BaseModel):
    timeframe: Timeframe
    fast_period: int = 12
    slow_period: int = 26
    signal_period: int = 9
    macd_value: float
    signal_value: float
    histogram: float
    above_signal: bool
    days_since_cross: int
    cross_type: Literal["bullish_cross", "bearish_cross", "no_recent_cross"]
    histogram_direction: Literal["expanding_positive", "contracting_positive",
                                 "contracting_negative", "expanding_negative"]
    histogram_acceleration: Literal["accelerating", "decelerating", "steady"]
    zero_line_position: Literal["above", "below"]
    zero_line_cross_days: int           # Days since MACD crossed zero
    divergence: Literal[                # Same concept as RSI divergence
        "bullish_regular", "bearish_regular",
        "bullish_hidden", "bearish_hidden", "none",
    ]
```

### Why Histogram State Matters

MACD above signal = bullish. But *expanding* histogram = accelerating bullish. *Contracting* histogram = bullish momentum fading. The distinction is the difference between "stay in the trade" and "start thinking about exit." Our agent needs to see this.

### Computation

Textbook MACD: EMA(12) − EMA(26), signal = EMA(9, MACD). Histogram = MACD − signal.

`histogram_acceleration`:

```python
def classify_acceleration(hist_series: pl.Series) -> str:
    last_3 = hist_series.tail(3)
    deltas = last_3.diff().drop_nulls()
    if all(d > 0 for d in deltas):
        return "accelerating" if last_3[-1] > 0 else "decelerating"
    if all(d < 0 for d in deltas):
        return "decelerating" if last_3[-1] > 0 else "accelerating"
    return "steady"
```

### Free-Tier Optimization

Same as RSI: Massive's `/v1/indicators/macd` endpoint returns pre-computed MACD+signal+histogram. Batch nightly.

### Gemini Prompt Integration

```
<macd_1d>above_sig=true days_since=4 hist=expanding_positive accel=accelerating</macd_1d>
```

---

## Feature #15 — Rolling Correlation Matrix

### Motivation

When all semiconductors move together, it's a sector story (macro, chip cycle). When NVDA moves alone, it's stock-specific (earnings, product announcement). Without a correlation matrix, the agent can't tell these apart — and neither can the user.

### Schema

Two artifacts:

**Per-pair correlations** (`mart.correlations_daily`):

```sql
CREATE TABLE mart.correlations_daily (
  as_of_date DATE NOT NULL,
  ticker_a STRING NOT NULL,
  ticker_b STRING NOT NULL,
  window_days INT64 NOT NULL,         -- 30, 90, or 252
  correlation FLOAT64 NOT NULL,
  rolling_avg_90d FLOAT64,            -- Correlation's own 90-day average
  correlation_zscore FLOAT64,         -- How unusual is current corr vs history
  regime_flag STRING,                 -- 'decoupling', 'normal', 'tight'
)
PARTITION BY as_of_date
CLUSTER BY ticker_a, ticker_b;
```

**Per-ticker summary** (rolled into `mart.features_daily`):

```python
class CorrelationSummary(BaseModel):
    ticker: str
    window_days: int = 30
    avg_sector_corr: float              # Mean corr to same-sector tickers
    avg_market_corr: float              # Corr to SPY
    most_correlated: list[tuple[str, float]]   # Top 5 (ticker, corr) pairs
    least_correlated: list[tuple[str, float]]  # Bottom 5 — hedge candidates
    corr_zscore_vs_history: float       # Is today's corr unusual?
    idiosyncratic_score: float          # 1 - avg_market_corr; high = stock-specific
```

### Computation Scale

Full S&P 500 pairwise = ~125,000 pairs. Daily refresh for 3 windows (30/90/252) = 375,000 rows/day. In BigQuery: trivial. The challenge is *compute cost* not *storage*.

Strategy:

- Compute in BigQuery SQL, not Python. One CORR() window function handles the pair lookup.
- Materialize only **interesting** pairs: same-sector pairs (~30 per sector × 11 sectors = 330 per sector pair) + every ticker vs SPY + every ticker vs its sector ETF.
- Full pairwise only monthly (research-grade, not per-day).

### SQL (Abridged)

```sql
CREATE OR REPLACE TABLE mart.correlations_daily
PARTITION BY as_of_date
AS
WITH returns AS (
  SELECT date, ticker,
    SAFE_DIVIDE(close - LAG(close) OVER (PARTITION BY ticker ORDER BY date), LAG(close) OVER (PARTITION BY ticker ORDER BY date)) AS ret
  FROM mart.etf_ohlcv
  WHERE date BETWEEN DATE_SUB(@run_date, INTERVAL 260 DAY) AND @run_date
)
SELECT
  @run_date AS as_of_date,
  a.ticker AS ticker_a,
  b.ticker AS ticker_b,
  30 AS window_days,
  CORR(a.ret, b.ret) AS correlation,
  ...
FROM returns a
JOIN returns b USING(date)
WHERE a.ticker < b.ticker
  AND (a.sector = b.sector OR b.ticker = 'SPY')
GROUP BY a.ticker, b.ticker;
```

### Regime Flag

`regime_flag` is the most AI-useful field. "Decoupling" = correlation dropped > 2σ below its own 90-day average = stock is trading on its own narrative, not the market's. Rare and often information-rich.

### Gemini Prompt Integration

```
<correlation>
  sector_avg=0.72 market(SPY)=0.58 idiosync=0.42
  top_corr=[TSM:0.81, AMD:0.78, INTC:0.74]
  regime=normal
</correlation>
```

---

## Feature #16 — Regime Transition Probability (HMM)

### Motivation

Binary Risk-On/Risk-Off is a marketing slogan, not a feature. Real regime state is probabilistic and transitional. A 65% Risk-On / 35% Transitional reading tells the agent "we're in a bull regime but the tape is wobbling" — dramatically more useful than a boolean.

### Schema

```python
class RegimeProbability(BaseModel):
    as_of_date: date
    regime_probs: dict[
        Literal["risk_on", "risk_off", "transitional", "flight_to_quality", "euphoria"],
        float                           # Must sum to 1.0
    ]
    dominant_regime: str
    dominant_confidence: float
    days_in_current_regime: int
    transition_probability_24h: float   # Probability dominant regime flips in next 24h
    transition_target: str | None       # Most likely next regime if transition fires
    model_version: str                  # 'hmm_v2'
    evidence_features: list[str]        # Which inputs drove the classification
```

### Why 5 States, Not 3

The 5-state taxonomy captures patterns the 3-state (risk_on/off/transitional) misses:

- **`flight_to_quality`** — bonds up, equities down, dollar up. Distinct from generic risk_off (which may not see the bond rally).
- **`euphoria`** — equities up, VIX crushed below historical 5th percentile, breadth thrust positive. Distinct from normal risk_on; precedes corrections.

### Model: Hidden Markov Model in BigQuery ML

```sql
CREATE OR REPLACE MODEL market.regime_hmm_v2
OPTIONS(
  model_type = 'ARIMA_PLUS',          -- Not true HMM, but closest BQML offers
  -- For true HMM: export features to Vertex AI custom training
) AS
SELECT
  date,
  vix_spot, vix_9d, vix_3m,           -- Term structure features
  yield_10y_2y_spread,
  tlt_return_5d, spy_return_5d, dxy_return_5d,
  breadth_pct, put_call_ratio
FROM mart.macro_features_daily;
```

Realistically: **BQML doesn't do true HMMs**. Two-track implementation:

- **Phase 1 (free tier):** Rule-based classifier using 8 hand-coded features. Computes probability as logistic blend of feature z-scores. Ships in week 1.
- **Phase 2 (scale up):** True Gaussian HMM (`hmmlearn` library) trained on 10 years of labeled regime data, served from Cloud Run. Swap behind the same `RegimeProbability` schema. Users see no change; agent sees higher-quality probabilities.

### Training Labels

Regime labels are the hard part. Source strategy:

- NBER recession dates → risk_off backbone.
- VIX > 30 sustained 5+ days → risk_off.
- VIX < 12 + SPY +10% trailing 60d → euphoria.
- 10y-2y inversion + rising unemployment → flight_to_quality.
- All others → risk_on or transitional based on trailing breadth.

Label noise is inherent; accept it and validate the model against forward equity returns (Sharpe of a strategy long risk_on, short risk_off).

### Gemini Prompt Integration

```
<regime>
  probs={risk_on:0.58, transitional:0.25, risk_off:0.12, flight_to_quality:0.03, euphoria:0.02}
  dominant=risk_on(0.58) days_in=12 transition_24h=0.18 next_likely=transitional
  drivers=[vix_term_structure, breadth_momentum, yield_curve]
</regime>
```

Agent has an opinion about *confidence in the regime* and *whether it's about to change* — not just "we're risk on."

---

## Feature #17 — Timeframe Alignment Score

### Motivation

When 1D/5D/1M/3M/6M/1Y all agree, conviction is high. When they disagree, there's either chop or a turning point. The alignment score captures this in a single number.

### Schema

```python
class AlignmentScore(BaseModel):
    ticker: str
    per_tf_signals: dict[Timeframe, Signal]
    per_tf_confidences: dict[Timeframe, float]
    bullish_count: int
    bearish_count: int
    neutral_count: int
    alignment_score: float              # max(bull, bear) / (bull + bear)
    weighted_alignment_score: float     # Same but weighted by per_tf confidence
    pattern: Literal[
        "aligned_bullish", "aligned_bearish",
        "short_term_bullish_long_term_bearish",   # Pullback or MR setup
        "short_term_bearish_long_term_bullish",   # Dip in uptrend
        "early_reversal_up", "early_reversal_down",
        "choppy",
    ]
    conviction_tier: Literal["high", "medium", "low", "chop"]
```

### Why 50% Richer Than Critique Proposal

The original proposed `alignment_score = fraction agreeing`. Additions:

- **Weighted version** — a 0.9-confidence buy and a 0.5-confidence hold shouldn't be weighted equally.
- **Pattern classification** — 0.5 alignment from "split bullish/bearish across timeframes" is different from 0.5 from "three holds and three buys." Patterns distinguish them.
- **Conviction tier** — the user-facing label. Designed for the mobile badge from Section A Weakness #3.

### Computation

Direct aggregate over the `TimeframeMatrix` from Weakness #3. No new data dependencies; pure computation on existing signals.

### Gemini Prompt Integration

Used more for mobile rendering than agent prompting — the agent already sees the full matrix. In the evidence chain, contributes `source: "timeframe_alignment"` items.

---

## Feature #18 — Sector-Relative Returns

### Motivation

AAPL up 2% feels bullish. AAPL up 2% while XLK up 3% is relative weakness — AAPL is lagging its sector. Absolute returns mislead; relative returns rank.

### Schema

```python
class RelativeReturns(BaseModel):
    ticker: str
    sector: str
    sector_etf: str                     # e.g., 'XLK'
    per_tf_absolute: dict[Timeframe, float]
    per_tf_vs_sector: dict[Timeframe, float]      # ticker_ret - sector_etf_ret
    per_tf_vs_market: dict[Timeframe, float]      # ticker_ret - SPY_ret
    per_tf_sector_rank: dict[Timeframe, int]      # Ticker's rank within sector on this TF
    per_tf_sector_rank_pct: dict[Timeframe, float]   # 0-1
    is_sector_leader: bool              # Top 10% of sector on 1M basis
    is_sector_laggard: bool             # Bottom 10% of sector on 1M basis
    momentum_shift: Literal[
        "improving_vs_sector",          # Relative strength rising trend
        "weakening_vs_sector",
        "stable",
    ]
```

### Computation

Per-day join of ticker returns and sector ETF returns. Ranked within sector via `ROW_NUMBER() OVER (PARTITION BY sector ORDER BY return_1m DESC)`.

### Data Dependencies

- `mart.sectors` — ticker → sector mapping (source: GICS classification, yfinance or Finnhub profile).
- `mart.sector_etfs` — sector → ETF mapping (static config: `{Technology: XLK, Financials: XLF, ...}`).

### Gemini Prompt Integration

```
<relative>
  vs_sector_1d=-0.8% (rank 38/43) vs_market_1d=+0.4%
  vs_sector_1m=+2.1% (rank 8/43) leader=false laggard=false
  momentum=improving_vs_sector
</relative>
```

Agent sees "today's dip is just catch-up, monthly picture has AAPL strengthening vs its sector."

---

## Feature #19 — Breadth Oscillators

### Motivation

Market-wide breadth (% of stocks above their 50-day MA) is a leading indicator of regime changes. Price-based signals confirm; breadth-based signals predict. The current `breadth_pct` scalar misses the oscillator dynamics.

### Schema

```python
class BreadthOscillators(BaseModel):
    as_of_date: date
    universe: Literal["sp500", "nasdaq100", "r2000"]
    pct_above_50d_ma: float             # Raw breadth
    pct_above_200d_ma: float
    breadth_ema_5d: float               # Smoothed short-term
    breadth_ema_20d: float              # Smoothed long-term
    breadth_momentum_5d: float          # d(breadth_ema_5d)/dt
    breadth_momentum_20d: float
    zweig_breadth_thrust: bool          # 10d EMA of advancers/issues > 0.615 after being < 0.40
    zweig_days_since_trigger: int
    mcclellan_oscillator: float         # 19-day EMA minus 39-day EMA of adv-dec issues
    mcclellan_summation: float          # Running sum of mcclellan_oscillator
    new_highs_vs_new_lows: int          # 52-week H - 52-week L count
    divergence_flag: Literal[           # Breadth/price divergence
        "bullish_breadth_divergence",   # Price LL, breadth HL
        "bearish_breadth_divergence",   # Price HH, breadth LH
        "confirming", "neutral",
    ]
```

### Why These Five Oscillators Specifically

- **EMAs** smooth the noisy daily breadth.
- **Momentum** (derivative of breadth EMA) leads price.
- **Zweig thrust** — one of the most reliably bullish signals in all of technical analysis; fires rarely (5-10 times per decade) but major rallies follow every time. Free to compute, valuable to surface.
- **McClellan** — century-old, still respected; thousand times better signal-to-noise than raw breadth for timing inflection points.
- **Divergence flag** — same concept as RSI divergence but at market-wide scale.

### Computation

Requires a full universe of daily OHLCV. Nightly BigQuery job:

```sql
WITH daily_stats AS (
  SELECT date,
    COUNTIF(close > ma_50) / COUNT(*) AS pct_above_50d,
    COUNTIF(close > ma_200) / COUNT(*) AS pct_above_200d,
    COUNTIF(close > prev_close) AS advancers,
    COUNTIF(close < prev_close) AS decliners,
    COUNTIF(close >= high_52w) AS new_highs,
    COUNTIF(close <= low_52w) AS new_lows
  FROM mart.etf_ohlcv_with_ma
  WHERE date = @run_date AND universe = 'sp500'
  GROUP BY date
)
SELECT ... FROM daily_stats;
```

### Gemini Prompt Integration

```
<breadth>
  pct_50ma=62% ema_5d=61% ema_20d=58%
  momentum_5d=+0.4%/day zweig_thrust=false
  mcclellan=-12 summation=+820 nh_nl=+140
  divergence=confirming
</breadth>
```

---

## Feature #20 — Put/Call Ratio (Options Sentiment)

### Motivation

Options traders are (putatively) smarter than cash-equity traders. Their aggregated positioning via put/call ratio is a contrarian sentiment gauge: extreme put-heavy = bearish exhaustion (buy); extreme call-heavy = euphoria (caution).

### Schema

```python
class OptionsSentiment(BaseModel):
    as_of_date: date
    equity_pc_ratio: float              # Equity-only P/C (retail positioning)
    index_pc_ratio: float               # Index P/C (institutional hedging)
    total_pc_ratio: float
    equity_pc_ema_5d: float             # Smoothed
    equity_pc_ema_21d: float
    equity_pc_zscore_vs_6m: float       # How extreme is today vs 6-month history
    classification: Literal[
        "extreme_fear",                 # equity P/C > 1.2
        "fear",                         # 1.0-1.2
        "neutral",                      # 0.7-1.0
        "greed",                        # 0.5-0.7
        "extreme_greed",                # < 0.5
    ]
    contrarian_signal: Literal[
        "contrarian_buy",               # extreme_fear sustained 3+ days
        "contrarian_sell",              # extreme_greed sustained 3+ days
        "none",
    ]
    vix_put_call_divergence: Literal[
        "vix_low_pc_high",              # Unusual — hidden hedging
        "vix_high_pc_low",              # Unusual — complacency in fear
        "aligned", "neutral",
    ]
```

### Data Source (Free)

CBOE publishes daily put/call ratios free at [cboe.com/us/options/market_statistics/](https://www.cboe.com/us/options/market_statistics/). One HTTP fetch per day; store in `mart.options_sentiment`.

### Why `vix_put_call_divergence` Is Worth Adding

Normally VIX and P/C move together (both fear gauges). When they diverge — VIX low but P/C high, or vice versa — it's information-rich. Institutions may be quietly hedging while VIX lags (VIX low + P/C high), or retail may be complacent while institutions know something (VIX high + P/C low). Either state deserves the agent's attention.

### Refresh

Daily at 5 PM ET after CBOE publishes EOD data. One cron job.

### Gemini Prompt Integration

```
<options>
  equity_pc=1.15 (fear, zscore=+1.8) ema_5d=1.08
  contrarian=none (needs 3 sustained days)
  vix_divergence=aligned
</options>
```

---

## Feature #21 — VIX Term Structure

### Motivation

VIX spot tells you current-month implied vol. The *shape* of VIX across tenors (9d/30d/3m/6m) tells you whether the market expects stress to fade or intensify. Backwardation (short-dated > long-dated) is the single cleanest real-time stress signal we have.

### Schema

```python
class VixTermStructure(BaseModel):
    as_of_date: date
    vix_9d: float
    vix_spot: float                     # ~30d
    vix_3m: float
    vix_6m: float
    term_shape: Literal[
        "contango",                     # spot < 3m < 6m — normal, calm
        "flat",
        "backwardation_mild",           # spot > 3m but 3m > 6m
        "backwardation_severe",         # spot > 3m > 6m
        "inverted_9d_spot",             # 9d > spot — acute stress
    ]
    contango_slope: float               # (vix_3m - vix_spot) / vix_spot
    backwardation_days: int             # Consecutive days in backwardation
    regime_cue: Literal[
        "calm",                         # deep contango, low absolute VIX
        "normal",
        "stress_rising",                # shape flattening + VIX rising
        "acute_stress",                 # backwardation + VIX > 25
        "exhaustion",                   # severe backwardation + VIX > 40 — often a bottom
    ]
```

### Why This Is Cheap & High-Value

All four tenors are free from CBOE (cboe.com/tradable_products/vix/). Single daily fetch. The `regime_cue` field alone encodes institutional-grade market-stress reading that most retail tools don't surface.

### Integration With Regime HMM (#16)

VIX term structure features are primary inputs to the regime HMM. They belong in `mart.macro_features_daily` alongside yield curve features. The `regime_cue` provides a human-readable shorthand the agent can reference directly when composing narrative.

### Gemini Prompt Integration

```
<vix_term>
  9d=18.2 spot=16.8 3m=19.5 6m=21.1
  shape=contango slope=+16% bw_days=0
  regime=normal
</vix_term>
```

---

## Feature #22 — Cross-Asset Signals (Rates ↔ Equities)

### Motivation

Equities don't exist in isolation. The yield curve, the dollar, and commodities all encode macro information that leads equity prices. A rally that's unconfirmed by bonds is suspicious; a selloff that's mirrored in gold strength is flight-to-quality.

### Schema

```python
class CrossAssetSignals(BaseModel):
    as_of_date: date
    # Yield curve
    yield_10y: float
    yield_2y: float
    yield_3m: float
    spread_10y_2y: float                # Classic recession gauge
    spread_10y_3m: float                # NY Fed's preferred version
    curve_shape: Literal["inverted", "flat", "normal", "steep"]
    curve_regime_cue: Literal[
        "recession_warning",            # 10y-2y inverted > 60 days
        "late_cycle",                   # flattening but positive
        "mid_cycle",                    # steady, moderate slope
        "early_cycle",                  # steep, rising
    ]
    # Dollar
    dxy_level: float
    dxy_change_5d: float
    dxy_vs_equities_correlation_30d: float
    # Commodities / risk
    gold_change_5d: float
    gold_vs_spy_divergence: Literal["bullish_gold_divergence", "aligned", "bearish_gold_divergence"]
    hy_oas: float                       # High-yield option-adjusted spread (FRED: BAMLH0A0HYM2)
    hy_oas_change_5d: float
    credit_stress: Literal["low", "normal", "widening", "acute"]
```

### Data Sources (All Free)

- **Treasuries:** FRED API (series DGS10, DGS2, DGS3MO) — free, no key needed.
- **DXY:** yfinance (`DX-Y.NYB`) or FRED (DTWEXBGS).
- **Gold:** yfinance (`GC=F`) or FRED (GOLDAMGBD228NLBM).
- **HY OAS:** FRED (BAMLH0A0HYM2) — the single best credit-stress gauge; widening HY OAS often precedes equity drawdowns by 2-4 weeks.

### Why HY OAS Is the Sleeper Feature

Most retail dashboards show yields and dollar. Almost none show high-yield credit spreads. Yet credit markets lead equities in 2 of 3 major corrections. Free to ingest, massively underused, agent can cite it as evidence.

### Refresh

FRED updates T+1 for most series. Daily pull at 10 AM ET is enough.

### Gemini Prompt Integration

```
<cross_asset>
  curve: 10y-2y=+0.12 shape=normal regime=mid_cycle
  dxy: level=103.5 chg_5d=-0.8% corr_spy_30d=-0.45
  gold: chg_5d=+2.1% divergence=bullish_gold_divergence
  credit: hy_oas=3.15% chg_5d=+0.08 stress=normal
</cross_asset>
```

---

## Feature #23 — Earnings Surprise & PEAD

### Motivation

Post-earnings announcement drift (PEAD) is one of the most persistent market anomalies — stocks that beat big continue to drift up for 30-60 days, and vice versa. The current plan has `earnings_radar` but doesn't ingest surprise magnitude, so it misses the most valuable earnings-related signal.

### Schema

```python
class EarningsSurprise(BaseModel):
    ticker: str
    latest_report_date: date
    fiscal_period: str                  # e.g., 'Q2 FY2026'
    eps_estimate: Decimal
    eps_actual: Decimal
    eps_surprise_abs: Decimal           # actual - estimate
    eps_surprise_pct: float             # (actual - estimate) / abs(estimate)
    eps_surprise_zscore: float          # vs ticker's own 4-yr surprise history
    revenue_estimate: Decimal
    revenue_actual: Decimal
    revenue_surprise_pct: float
    beat_category: Literal[
        "massive_beat",                 # eps_surprise_pct > 0.20 AND revenue beat
        "clean_beat",                   # both metrics beat
        "mixed",                        # one beat, one miss
        "clean_miss",
        "massive_miss",
    ]
    guidance_change: Literal["raised", "maintained", "lowered", "withdrawn", "none_given"]
    days_since_report: int
    pead_window: Literal[
        "active_5d",                    # 0-5 days post-report — strongest drift
        "active_30d",                   # 6-30 days — waning drift
        "expired",                      # > 30 days — PEAD effect gone
    ]
    post_earnings_return: float         # Return since close before report
    reaction_vs_surprise: Literal[
        "overreaction_up",              # Massive beat, stock up >2σ above expected
        "underreaction_up",             # Beat but muted response — PEAD opportunity
        "underreaction_down",           # Miss but muted drop — beware continuation
        "overreaction_down",
        "normal",
    ]
    next_report_date: date | None
    days_to_next_report: int | None
```

### Why `reaction_vs_surprise` Is the Alpha

The core PEAD trade is buying underreaction: company beat, analysts slow to revise, stock drifts up for a month. Systematically classifying earnings reactions as over- or under-reactions gives the agent a specific, rigorously-studied signal class to cite.

### Data Sources

- **Estimates vs actuals:** Finnhub (free-tier covers earnings data), Alpha Vantage as backup, Zacks-sourced yfinance fields as fallback.
- **Guidance changes:** NLP parse of earnings-call transcripts — deferred to paid-tier. Free-tier just captures "given / not given" from headline data.

### Refresh

- Active earnings season: hourly during market hours (reports can drop pre-market or post-market).
- Off-season: daily.

### Gemini Prompt Integration

```
<earnings>
  latest=Q1FY26 beat=clean_beat eps_surprise=+8.4% (zscore +1.2)
  rev_surprise=+3.1% guidance=raised
  days_since=9 pead_window=active_30d
  reaction=underreaction_up (post_ret +2.1% vs expected +4.5%)
  next_report=2026-07-28 (days_to=99)
</earnings>
```

Agent sees "AAPL beat, market underreacted, we're in the PEAD window" — a testable, publishable alpha thesis the one-shot plan would entirely miss.

---

## Feature Dependency Graph

Rendering the eight direct and five computed features as a DAG:

```
RAW BARS (Finnhub/yfinance/Massive)
    │
    ├──▶ #11 Bollinger Position
    ├──▶ #12 Volume Z-Score
    ├──▶ #13 RSI + Divergence
    ├──▶ #14 MACD State
    └──▶ #18 Relative Returns  ─── requires #15 sector mapping

FULL UNIVERSE BARS
    └──▶ #15 Correlation Matrix
    └──▶ #19 Breadth Oscillators

MACRO DATA (FRED/CBOE/Yahoo)
    ├──▶ #20 P/C Ratio
    ├──▶ #21 VIX Term Structure ──┐
    ├──▶ #22 Cross-Asset          ├──▶ #16 Regime HMM
    └──▶ #19 Breadth              ┘

EARNINGS (Finnhub/AV)
    └──▶ #23 Earnings Surprise

SIGNALS (per Weakness #3)
    └──▶ #17 Alignment Score
```

Implementation order matches the DAG: raw features first (#11, #12, #13, #14), then cross-sectional (#15, #18), then market-wide oscillators (#19), then macro (#20, #21, #22), then composite (#16, #17), then earnings (#23, independent of others).

---

## Feature Store Schema

Beyond `mart.features_daily` (wide JSON), specialized tables:

| Table | Features | Partition | Cluster | Why specialized |
|---|---|---|---|---|
| `mart.features_daily` | #11, #12, #17, #18, #23 | `as_of_date` | `ticker`, `feature_name` | Variable-schema JSON, narrow writes |
| `mart.rsi_history` | #13 | `as_of_date` | `ticker`, `timeframe` | Divergence needs fast access to last 20 values |
| `mart.macd_history` | #14 | `as_of_date` | `ticker`, `timeframe` | Same rationale as RSI |
| `mart.correlations_daily` | #15 | `as_of_date` | `ticker_a`, `ticker_b` | Pair-level queries |
| `mart.regime_history` | #16 | `as_of_date` | — | Single row per day; probabilities table |
| `mart.breadth_daily` | #19 | `as_of_date` | `universe` | Universe-level, small |
| `mart.macro_features_daily` | #20, #21, #22 | `as_of_date` | — | Single row per day |
| `mart.earnings_events` | #23 | `report_date` | `ticker` | Sparse; event-driven |

Mobile and agent read through a small Python service layer (`backend/features/store.py`) that hides which table a feature lives in. Changing physical layout doesn't break callers.

---

## Refresh Orchestration

All feature refreshes coordinated via a single Cloud Scheduler → Cloud Tasks pipeline:

```
Schedule               Job                                Free-tier cost
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every 5 min (9:30-16:00 ET)  features_intraday        ~78 runs × 50 tickers
                             (#11 1D/5D, #12 1D)
Daily 16:15 ET               features_eod_ticker      1 run × full universe
                             (#11 all TF, #12, #13, #14)
Daily 17:00 ET               features_correlation     1 run (SQL in BQ)
                             (#15)
Daily 17:30 ET               features_breadth         1 run
                             (#19)
Daily 17:45 ET               features_cross_asset     1 run
                             (#20, #21, #22)
Daily 18:00 ET               features_regime          1 run — needs #19-#22
                             (#16)
Hourly during earnings szn   features_earnings        ~14 runs/day × season
                             (#23)
On-demand                    features_alignment       Computed at signal time
                             (#17)                    (no refresh needed)
```

Total Cloud Tasks ops/day ≈ 6 + (78 × 50) + (14 × 10) ≈ 4,046 — well inside the 1M/mo free tier.

---

## Backfill Strategy

Features need history to validate. Backfill plan:

| Feature | Backfill depth | Source | Estimated runtime |
|---|---|---|---|
| #11-#14 (per-ticker technicals) | 5 years | yfinance bulk | 4 hours across universe |
| #15 correlation | 1 year | BQ SQL on existing bars | 15 min |
| #16 regime | 10 years | FRED + bar history | 2 hours |
| #17 alignment | On-demand only | — | 0 |
| #18 relative returns | 5 years | BQ SQL on bars + sector map | 20 min |
| #19 breadth | 5 years | BQ SQL on universe | 30 min |
| #20 P/C ratio | 2 years | CBOE historical | 10 min (one-shot download) |
| #21 VIX term | 5 years | Yahoo historical indices | 15 min |
| #22 cross-asset | 10 years | FRED | 20 min |
| #23 earnings | 3 years | Finnhub historical earnings | 2 hours, quota-limited |

Total: one-time ~10 hours on a Cloud Run Job with 4 vCPU / 16 GB. Free-tier compute covers it if spread across a weekend.

---

## Validation & Data Quality

Every feature write validated:

- **Range checks** — RSI in [0, 100], correlations in [-1, 1], percentages in [0, 1].
- **Monotonicity** — days_since_cross always ≥ previous day's days_since_cross + 1 (unless a new cross).
- **Completeness** — all 11 sectors represented in breadth universe; missing tickers trigger a warning.
- **Freshness** — any feature > 24h stale (vs expected refresh) raises an alert.
- **Cross-feature consistency** — if #11 says `above_upper` but #12 z-score is -2 (drought), flag for review: a breakout on no volume is suspicious.

All validation violations write to `telemetry.feature_quality_issues` with `severity: info | warn | error`. Errors block the downstream agent from using the feature (agent sees `feature_unavailable` instead of garbage).

---

## Rollout Sequencing

Following the dependency graph, a 6-week build-out:

1. **Week 1 — Raw per-ticker.** #11 Bollinger, #12 Volume Z, #13 RSI (no divergence yet), #14 MACD state. All compute from bars we already fetch. Ships feature table infra.
2. **Week 2 — Divergence + relative.** #13 divergence detector (rule-based), #18 sector-relative returns. Requires sector map; build that in same week.
3. **Week 3 — Market-wide.** #15 correlation matrix, #19 breadth oscillators. First SQL-heavy week.
4. **Week 4 — Macro.** #20 P/C ratio, #21 VIX term structure, #22 cross-asset. All free data sources wired.
5. **Week 5 — Composite.** #16 regime HMM (phase 1 rule-based), #17 alignment score. Requires weeks 1-4 as inputs.
6. **Week 6 — Earnings + polish.** #23 earnings surprise + PEAD classification. Validation layer. Quality-issue dashboard.

Each week: the features ship to `mart.*` tables and become readable by the agent, but the prompts don't reference them until the next week — gives one week to validate data quality before the agent starts relying on a feature.

---

## Relationship to Other Critique Sections

- **Section A (Weaknesses #1-#4, #7-#10):** Every feature here becomes a candidate evidence item (#4) and an input to the eval harness (#1).
- **Section C (Agents & Tools):** The agent tools `compute_stat`, `get_correlation` read from these tables.
- **Section D (Data Layer):** Several features (#15 correlations, #16 regime HMM) are implemented in BigQuery ML/SQL — the same migration Section D proposes.
- **Section E (Mobile UX):** Sparklines (#41), heatmaps (#43), timeline charts (#42), and the prediction-accuracy badge (#45) all render features from this document.

Features are the plumbing beneath every downstream upgrade.
