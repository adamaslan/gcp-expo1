# Staying Under $5/mo While Integrating Three Backends

How to fold holdemfoldem and ai-text-opt into the [MULTI_BACKEND_INTEGRATION.md](./MULTI_BACKEND_INTEGRATION.md) plan **without breaking the current ~$5/mo Cloud Run + Firestore bill**, and how to set up the system so it scales from 10 to ~100 DAU without the number moving meaningfully.

Companion to:
- [docs/MULTI_BACKEND_INTEGRATION.md](./MULTI_BACKEND_INTEGRATION.md) — what to build
- [docs/wiki-mobile/](./wiki-mobile/) — why things are the way they are
- `gcp3/docs/wiki-gcp3/scheduler-jobs-config.md` — the 5 scheduler jobs that drive cost
- `gcp3/docs/wiki-gcp3/entity-firestore-cache.md` — TTL strategy that keeps reads bounded

---

## The Cost Model in One Paragraph

Cloud Run scales to zero, so idle = $0. Firestore charges per document read/write (not per byte), so cache hits are essentially free at this scale. The $5/mo today is **almost entirely scheduler-driven**: 5 nightly jobs × Cloud Run CPU-seconds during bake + Firestore writes during bake + a small Firestore-read tail from user traffic. User traffic at 10–100 DAU adds pennies — the bake is the budget.

This means: **if you add backends but don't add scheduled work, your bill barely moves.** If you add an LLM call to the user request path, it does.

---

## The Free Tiers You Are Living In

These numbers are conservative (always-free, not promotional). Verify monthly at https://cloud.google.com/free.

| Service | Always-free monthly quota | What you use it for |
|---|---|---|
| Cloud Run | 2M requests, 360k vCPU-sec, 180k GiB-sec, 1 GiB egress to NA | All three backends |
| Firestore (Native) | 50k reads/day, 20k writes/day, 20k deletes/day, 1 GiB storage | gcp3 cache, holdfold cache |
| Cloud Scheduler | 3 jobs free | gcp3 has 5 → 2 are billed at ~$0.10/job/mo |
| Cloud Build | 120 build-minutes/day | Deploys |
| Cloud Logging | 50 GiB ingestion/mo | All three backends |
| Artifact Registry | 0.5 GiB storage | Docker images |
| Secret Manager | 6 active secret versions, 10k access ops/mo | API keys |

At the current load **gcp3 sits inside every one of these except the third scheduler job**, which is why the bill is small but not zero.

---

## Where the Existing ~$5 Actually Comes From

Educated breakdown given "mostly Cloud Run + Firestore" with 5 scheduler jobs:

| Line item | Est. $/mo | Why |
|---|---|---|
| Cloud Scheduler (2 jobs over free tier) | ~$0.20 | 5 jobs - 3 free |
| Cloud Run vCPU/memory during bake | ~$1.00 | ~30s/day of real CPU work across bake stages |
| Cloud Run requests during user traffic | ~$0.05 | well inside 2M free requests |
| Firestore writes (bake) | ~$0.20 | ~12 cache keys/day × 30 days = ~360 writes, free |
| Firestore reads (users + scheduled tasks) | ~$1.50 | this is the one that grows with DAU |
| Cloud Logging (above free) | ~$0.50 | if you log verbosely |
| Cloud Build deploys | ~$0.10 | a few deploys/mo |
| Egress | ~$0.05 | small JSON responses |
| **External: Gemini, Finnhub, etc.** | varies | not on GCP bill but real |

If your real bill is $5 and Firestore reads are the biggest line, **that's the lever**. Everything below is targeted at keeping that lever from moving as you add holdfold and aitext.

---

## The Five Cost Rules (Apply These To Every New Feature)

### Rule 1 — Backends scale to zero or they don't exist

Every backend you add must:
- Have `--min-instances=0` (default; verify with `gcloud run services describe`)
- Have `--max-instances` capped at a sane number (gcp3 uses 5; holdfold should use 3; aitext when it deploys should use 2)
- Have `--cpu=1`, `--memory=512Mi` as the starting envelope; only raise after evidence

Cloud Run bills CPU-seconds *while the container is processing a request*. Idle scale-to-zero containers cost $0. **A backend that uses `--min-instances=1` is a $5+/mo bill on its own.** Do not set it unless cold-start latency is a measured user complaint.

### Rule 2 — Every endpoint is cache-first, no exceptions

The pattern in gcp3 (Firestore TTL-on-read, see `gcp3/backend/firestore.py:get_cache_stale`) is the template. For each new endpoint in holdfold and aitext:

1. Hash the input into a cache key (e.g. `holdfold:AAPL:3mo:moderate`)
2. Read Firestore first; return on hit (one read, ~$0)
3. On miss, compute and write (one read + one write + the upstream cost)
4. Set a TTL appropriate to the data (1h for quotes, 24h for verdicts, see Rule 3)

At 50 DAU × 5 calls/user/day = 250 calls/day. If hit rate is 90%, you do 25 cold computes/day. That's the budget the upstream cost is paid against.

### Rule 3 — TTLs are the throttle

Cache TTL is the only knob between "free" and "Gemini bill". Defaults that hold for 10–100 DAU:

| Data type | Recommended TTL | Why |
|---|---|---|
| Market quotes (Finnhub) | 60s intraday, 1h after-hours | Finnhub free tier is 60 calls/min |
| Technical signals | 1h | Recomputed nightly anyway |
| Hold/Fold verdict per symbol | 6h | Underlying analysis is also cached at 1h+ |
| RAG chat response | Do not cache — user-specific | But cache the *retrieval* step (the ChromaDB query result) for 24h |
| LLM-generated content (blog, summary) | 24h rolling | Already done in gcp3 |

Every TTL you shorten costs upstream calls. Every TTL you lengthen costs freshness. Make the trade explicit, write it on the wiki page for that endpoint, don't tweak silently.

### Rule 4 — LLM calls never on the user request path

This is the rule that breaks $5/mo if violated. Gemini 1.5 Flash is cheap (~$0.30 / 1M tokens) but a chatty endpoint that calls Gemini per request scales linearly with DAU. The gcp3 architecture already follows this: Gemini runs during the nightly bake (5 stages), writes results to Firestore, and user requests just read.

Apply this to the new backends:

- **holdfold** — already does it right. `/api/analyze` uses MCP tools + Firestore cache, no LLM on the request path.
- **aitext** — `/api/chat` calls Gemini per request. **This is the dangerous one.** Mitigations:
  - In-process IP rate limit already exists (60/min, see `app/api/chat/route.ts:11-13`)
  - Add a per-user limit (e.g. 30/day) via Firestore counter
  - Cache the embedding + retrieval step (cheap, deterministic given the query) so the only un-cached cost is the LLM completion itself
  - Consider truncating to a smaller model (Gemini 1.5 Flash-8B if available) for cost-sensitive routes

### Rule 5 — Don't add scheduled jobs, share them

Cloud Scheduler is $0.10/job/month above 3 free. The gcp3 backend already runs 5. Don't add a 6th for holdfold or a 7th for aitext. Instead:

- Piggyback on the existing `gcp3-nightly-cache-purge` job to also purge holdfold's cache (one extra HTTP call from the scheduler payload)
- Aitext doesn't need any scheduled jobs at 10–100 DAU; ChromaDB persistence is the only operational concern and that's a deploy choice, not a cost lever

---

## Integration Strategy: Add Three Backends Without Adding Cost

### gcp3 (already deployed, no change)

Stays as-is. The integration adds **mobile clients**, not backend load. Mobile traffic at 50 DAU × 10 calls/day = 500 requests/day, well inside the 2M free request quota. The new cost is Firestore reads from those calls — projected at <$1/mo at 95% hit rate.

**Knobs to verify before adding mobile traffic:**
- `gcloud run services describe gcp3-backend --region=us-central1 --format='value(spec.template.spec.containerConcurrency)'` should be 80 (default); raise to 100 only if you see throttling
- Confirm `--max-instances=5` is enough; one instance handles ~80 concurrent requests, so 5 = 400 concurrent. At 100 DAU you will not approach this.

### holdemfoldem (already deployed, slight tuning)

Today: `cloud-run/Dockerfile` on Cloud Run with micromamba. The image is heavy (mamba base) — that's a deploy-time cost, not a runtime cost.

**Cost-relevant settings to verify:**

```bash
gcloud run services describe holdemfoldem-backend \
  --region=us-central1 \
  --format='value(spec.template.spec.containers[0].resources, spec.template.metadata.annotations)'
```

Want to see:
- `cpu: "1"`, `memory: "512Mi"` (or smaller — `/api/analyze` is not memory-heavy)
- `autoscaling.knative.dev/maxScale: "3"` (lower than gcp3 because it's single-symbol, no fan-out)
- `autoscaling.knative.dev/minScale: "0"` (must be 0)
- Container concurrency 80+ (one analyze call is mostly waiting on yfinance)

**Cache strategy** — `/api/analyze` already uses Firestore via `MCPFirestoreCache` (see `holdemfoldemapp/backend/main.py:_cached_or_fetch`). The 1-hour TTL there is sensible. Don't touch it.

**Mobile-side strategy** — the mobile client should cache the verdict for 6 hours per `(symbol, period, options_strategy)` tuple in AsyncStorage. A user who taps "AAPL hold or fold?" at 9am and again at 11am should not hit the backend twice.

### ai-text-opt (not deployed yet, deploy carefully when you do)

This is the highest-risk backend for the $5/mo budget because it calls Gemini per request. Two deploy paths:

**Path A — Cloud Run with ChromaDB on a persistent volume (recommended)**

```
cpu: 1, memory: 1Gi  (ChromaDB is memory-heavier than the FastAPIs)
min-instances: 0
max-instances: 2
cpu-throttling: enabled (cheaper, fine for non-realtime chat)
```

ChromaDB persistence is the real question. Options:
- **GCS-mounted volume** via Cloud Storage FUSE — cheap (~$0.02/GiB/mo storage, free egress within region), survives restarts
- **Embedded SQLite (ChromaDB default)** in `/tmp` — ephemeral on Cloud Run, must re-ingest on cold start, fine for small (<10MB) corpora
- **Separate Cloud Run service for ChromaDB** — overkill at this scale

For 10–100 DAU and a small document set, **embedded SQLite + GCS for the persistence dir** is the cheap and simple path. Cost: <$0.10/mo storage + the LLM token bill.

**Path B — Vercel (the project's web sibling already lives there)**

Free tier is generous. Pulls aitext off the GCP bill entirely. Trade-off: separate auth model, separate logs, no shared Firestore. **For the $5 budget this is actually the better answer if you have spare Vercel headroom** — moves the LLM cost onto Vercel's plan and keeps the GCP bill clean. Pending the open question in `docs/wiki-mobile/decision-aitext-deploy-deferred.md`.

**Per-user rate limits** — required regardless of platform. The in-process IP limiter in `chat/route.ts:11-13` is enough for abuse but not for cost control. Add a Firestore-backed counter keyed by Clerk user ID with a daily cap (start at 30/day, raise if usage proves the cap is too tight).

---

## Mobile Side: Optimize So The Backend Doesn't Have To

Every backend call you avoid is a Firestore read you don't pay for. The mobile app has four levers:

### 1. AsyncStorage as L1 cache

Wrap each client in `lib/clients/*.ts` with an AsyncStorage layer that respects the same TTL as Firestore. For each request:
1. Check AsyncStorage; return on hit
2. Hit backend; cache the response with the TTL the backend reports (or a sensible default)

For Hold/Fold, where the user might tap the same symbol several times in a session, this turns 5 backend calls into 1.

### 2. SWR / React Query, not raw fetch

Already implied by Step 3 of MULTI_BACKEND_INTEGRATION.md but worth being explicit: use a library with stale-while-revalidate semantics. The mobile app shows cached data instantly and refetches in the background only when stale. The user perceives "fast"; the backend sees fewer requests.

### 3. Don't poll, push (later)

At 10–100 DAU polling is fine. Around 200+ DAU consider:
- Firestore real-time listeners (free reads if you stay under daily quota)
- Or accept eventual consistency and lengthen TTLs

Do not pre-emptively add WebSocket/SSE infrastructure for 50 users.

### 4. Batch reads where the backend supports it

gcp3 has `/signals` (list) and `/signals/{ticker}` (single). The mobile app should fetch the list once on tab open and read individual tickers from that list, not refetch per-ticker. One Firestore read on the backend, dozens of UI renders on the device.

---

## Web Side: Same Levers, Different Cache

The Next.js web sibling already uses ISR (Incremental Static Regeneration) with a 60s revalidate window (see `gcp3/docs/wiki-gcp3/overview.md`). That is the equivalent of "cache for 60s at the edge". The mobile app's AsyncStorage cache complements it: web has ISR, mobile has local storage, both keep Firestore reads bounded.

For shared content between web and mobile (e.g. the daily blog), have **only the web side hit the gcp3 `/content` endpoint** and serve mobile from the web's ISR cache via a public read endpoint. This is a future optimization — not needed at $5/mo budget today, but the path is open.

---

## Monitoring: How To Know Before The Bill Arrives

Two things to check weekly:

### 1. Cloud Run revision-level metrics

```bash
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container/billable_instance_time"' \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --interval-start-time=$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ)
```

Or just the Cloud Run console: each service's "Metrics" tab shows billable instance time. If holdfold's billable time is climbing while DAU is flat, something is scheduling against it that shouldn't be.

### 2. Firestore reads/writes per day

```bash
gcloud monitoring time-series list \
  --filter='metric.type="firestore.googleapis.com/document/read_count"'
```

Free tier is 50k reads/day. At 95% cache hit and 100 DAU × 20 calls/day = 2000 reads/day. You have ~25× headroom. If you ever see >20k reads/day, a cache TTL got shortened or a hit rate dropped.

### 3. Budget alert (do this today)

```bash
gcloud billing budgets create \
  --billing-account=<your-billing-account-id> \
  --display-name="gcp3-mobile-monthly" \
  --budget-amount=10 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

Set the budget at $10 (2× target) so you get warnings before you blow through $5. The alerts hit email immediately — there is no excuse not to have this set.

---

## The Honest Limits

Three things this plan does not pretend to solve:

1. **ChromaDB persistence on Cloud Run is genuinely awkward.** GCS FUSE works but adds latency. The cheap right answer for aitext at 10–100 DAU is probably "deploy it to Vercel and accept that ai-text isn't on GCP", which is also what `decision-aitext-deploy-deferred.md` ends up suggesting.

2. **Gemini cost is unpredictable at scale.** Prompt caching helps, model choice helps, but a viral moment where 500 users each ask 10 questions of the chat endpoint can run $5 in an afternoon. The per-user daily cap in Rule 4 is the only real defense.

3. **At 200+ DAU you will exceed something.** Most likely Firestore daily reads. The mitigation path then is to add a CDN cache (Cloud CDN or Cloudflare in front of Cloud Run) so static-ish endpoints serve from edge cache and never touch Firestore. That's a separate doc — don't do it now.

---

## TL;DR Action List

Do these in order:

1. Set the $10 budget alert above. Today.
2. Verify `--min-instances=0` and `--max-instances` are set on gcp3 and holdfold via `gcloud run services describe`.
3. When you deploy aitext (whenever), put it on Vercel unless you have a hard reason to use Cloud Run.
4. Add a per-user daily cap (Firestore counter) to ai-text's `/api/chat` before it sees real traffic.
5. Wrap each mobile client in `lib/clients/*.ts` with AsyncStorage + TTL matching the backend's TTL.
6. Don't add a 6th scheduler job. Piggyback on `gcp3-nightly-cache-purge` if a new backend needs purging.
7. Weekly: glance at Cloud Run billable instance time and Firestore daily reads. If either jumps without a DAU jump, find the regression before the bill confirms it.
