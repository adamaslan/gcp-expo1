# Multi-Backend Integration Guide

How to surface features from three existing backends inside this Expo mobile app
**without modifying or deleting any of them**. Each backend stays where it is,
keeps its own deploy, owns its own data. The mobile app becomes a thin client
that fans out to all three.

> 💰 **Cost constraint:** this plan must stay inside the current ~$5/mo GCP
> bill while scaling to 10–100 DAU. See [Step 9](#step-9--cost--staying-under-5mo)
> below, and the full breakdown in
> [COST_OPTIMIZATION_5_DOLLAR.md](./COST_OPTIMIZATION_5_DOLLAR.md).

---

## The Three Backends

| Backend | Path | Stack | Role |
|---|---|---|---|
| **gcp3** | `/Users/adamaslan/code/gcp3/backend` | FastAPI (Python) | Market signals, swing/growth agents, screener, earnings radar, macro pulse, industry intel, content |
| **holdemfoldem** | `/Users/adamaslan/code/holdemfoldemapp/backend` | FastAPI (Python) on Cloud Run | Single-symbol Hold/Fold verdict with options strategy, fib levels, position P&L |
| **ai-text-opt** | `/Users/adamaslan/code/ai-text-opt-1024/backend` | Next.js (TS) | ChromaDB RAG chat, swing-run / growth-run proxy with fixtures |

This mobile app currently has one `BACKEND_URL` in [lib/api.ts](../lib/api.ts#L5).
That single-host assumption is the only thing blocking integration.

---

## Guiding Rules

1. **Never edit the other repos from this session.** Add API surface in the
   mobile client only. If a backend genuinely needs a new endpoint, write a
   handoff doc in `gcp3/docs/handoff/` and switch sessions (see rule 6 in
   [.claude/CLAUDE.md](../.claude/CLAUDE.md)).
2. **No hand-maintained TS mirrors of Python types.** Generate request/response
   types from each FastAPI's `/openapi.json` (see "Type Generation" below).
3. **Backend = source of truth.** If a shape isn't in a backend schema, the
   mobile app doesn't invent it.
4. **Archive, don't delete.** The existing single-backend `lib/api.ts` keeps
   working — new code goes in a new client module, old usages migrate over
   time. If we ever retire it, move it to `docs/archived/`.
5. **Verify before claiming wired-in.** Every feature added below ships with a
   smoke test in `scripts/` that pings the live endpoint.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│            gcp3-mobile (Expo)                │
│                                              │
│  screens/  ─►  hooks/   ─►  lib/clients/     │
│                              │  ├─ gcp3.ts   │
│                              │  ├─ holdfold.ts
│                              │  └─ aitext.ts │
│                              ▼               │
│                       lib/http.ts (shared)   │
└──────────────┬───────────────┬───────────────┘
               │               │
        ┌──────▼─────┐  ┌──────▼─────┐  ┌──────────────┐
        │   gcp3     │  │ holdfold   │  │ ai-text-opt  │
        │  FastAPI   │  │ Cloud Run  │  │   Next.js    │
        └────────────┘  └────────────┘  └──────────────┘
```

One HTTP helper, three typed clients, one config block. No backend changes.

---

## Step 1 — Config

Add three URLs to `.env.local` and to EAS/Expo public env:

```bash
EXPO_PUBLIC_GCP3_BACKEND_URL=https://gcp3-backend-…run.app
EXPO_PUBLIC_HOLDFOLD_BACKEND_URL=https://holdfold-…run.app
EXPO_PUBLIC_AITEXT_BACKEND_URL=https://ai-text-opt.vercel.app
```

Update [lib/config-validator.ts](../lib/config-validator.ts) to require all
three on production and warn (not fail) in dev so demo mode still works.

---

## Step 2 — Shared HTTP helper

Refactor [lib/api.ts](../lib/api.ts) into `lib/http.ts` that takes a
`baseUrl` rather than reading one env var. Keep `fetchBackend` as a re-export
that points at gcp3 so existing screens keep compiling.

```ts
// lib/http.ts
export async function httpJson<T>(
  baseUrl: string,
  path: string,
  init?: { method?: string; body?: unknown; params?: Record<string,string>; token?: string }
): Promise<T> { /* same shape as current fetchBackend, baseUrl injected */ }
```

The current `BACKEND_URL` indirection at [lib/api.ts:5](../lib/api.ts#L5)
moves into `lib/clients/gcp3.ts`. No behavior change for existing callers.

---

## Step 3 — One client module per backend

### `lib/clients/gcp3.ts`

Wraps the gcp3 FastAPI. The endpoints worth surfacing on mobile first:

| Mobile feature | gcp3 route | Notes |
|---|---|---|
| Daily signals list | `GET /signals` | high-signal-density home feed |
| Per-ticker signal | `GET /signals/{ticker}` | drill-in from list |
| Swing predictions | `GET /swing-predictions` | tab |
| Screener | `GET /screener` | filter UI |
| Earnings radar | `GET /earnings-radar` | upcoming earnings cards |
| Macro pulse | `GET /macro-pulse` | "market mood" widget |
| Market overview | `GET /market-overview` | dashboard summary |
| Industry returns | `GET /industry-returns` | sector heatmap |
| Industry intel | `GET /industry-intel` | sector commentary |
| Content | `GET /content` | reads `daily_blog.py` output |
| Swing agent run | `POST /agents/swing/run` then `GET /agents/swing/{run_id}` | async agent |
| Growth agent run | `POST /agents/growth/run` then `GET /agents/growth/{run_id}` | async agent |
| Agent chat | `POST /agents/{kind}/{run_id}/chat` | follow-ups |

Skip the `/admin/*` and `/refresh/*` routes from mobile — those are operator
tooling, not user features.

### `lib/clients/holdfold.ts`

The holdemfoldem backend has exactly one user route plus health:

| Mobile feature | holdfold route |
|---|---|
| Hold-or-Fold verdict | `POST /api/analyze` (returns `HoldFoldVerdict`) |
| Health | `GET /health` |

The `AnalyzeRequest` model at [main.py:218](../../holdemfoldemapp/backend/main.py#L218)
takes symbol, period, optional options strategy, optional position lots. Mobile
sends a thin form; backend does all the math.

### `lib/clients/aitext.ts`

Next.js routes from [ai-text-opt-1024/backend/app/api](../../ai-text-opt-1024/backend/app/api):

| Mobile feature | aitext route |
|---|---|
| RAG chat | `POST /api/chat` — `{ message, trader_filter? }` |
| Swing runs (proxied) | `GET /api/swing/runs`, `POST /api/swing/runs`, `GET /api/swing/runs/{id}`, `POST /api/swing/runs/{id}/chat` |
| Growth runs (proxied) | same shape as swing |
| Standalone swing preds | `GET /api/swing-predictions` |
| Health | `GET /api/health` |

Note: the swing/growth routes here are **proxies** to gcp3 with fixture
fallback (see [route.ts:8-11](../../ai-text-opt-1024/backend/app/api/swing/runs/route.ts#L8-L11)).
On mobile, prefer hitting **gcp3 directly** for these; only fall back to the
ai-text proxy if `EXPO_PUBLIC_GCP3_BACKEND_URL` is unset. This avoids a
double-hop in production.

The chat route is unique to ai-text — it does the ChromaDB retrieval +
LLM call inline. Always route mobile chat through ai-text.

---

## Step 4 — Type Generation (no hand-rolled TS)

Rule 2 from the cross-repo workflow forbids hand-mirroring Python types.
Generate them. One-time setup per backend:

```bash
# For each FastAPI backend (gcp3, holdfold) — they expose /openapi.json
npx openapi-typescript https://<gcp3-url>/openapi.json \
  -o lib/clients/gcp3.types.ts

npx openapi-typescript https://<holdfold-url>/openapi.json \
  -o lib/clients/holdfold.types.ts
```

For ai-text (Next.js, no auto-OpenAPI), the routes are small enough that we
hand-type them — but keep the types in `lib/clients/aitext.types.ts` and add
a top-of-file comment pointing at the four `route.ts` files they mirror, so
the next change is easy to spot.

Add the generated files with this header so reviewers know not to edit:

```ts
// AUTOGENERATED — do not edit
// Source: https://<backend>/openapi.json
// Regenerate: npm run gen:types
```

Add `gen:types` to [package.json](../package.json) so it's one command, and
commit the generated files (CI doesn't need to regenerate to build).

---

## Step 5 — Auth (the part that needs care)

The mobile app uses Clerk Expo (see [package.json](../package.json#L11)).
Each backend has different expectations:

- **gcp3**: today the routes have no auth middleware. Adding one is a
  backend change — **out of scope for this doc**. Until then, ship mobile
  calls unauthenticated and treat the backend as internal.
- **holdfold**: same — no auth on `/api/analyze`. Same constraint.
- **ai-text**: in-process IP rate limiter at
  [chat/route.ts:11-13](../../ai-text-opt-1024/backend/app/api/chat/route.ts#L11-L13).
  No bearer auth. Fine for mobile, but expect 429s under load.

When/if any backend grows real auth, the `httpJson` helper already accepts a
`token` — we'll plug Clerk's `getToken()` in then. Don't anticipate it now.

---

## Step 6 — Feature mapping (mobile → backend)

This is the concrete checklist. Each row is one mobile-side task.

| Mobile screen / surface | Backend(s) | Endpoint(s) |
|---|---|---|
| Home dashboard | gcp3 | `GET /market-overview`, `GET /macro-pulse` |
| Signals tab | gcp3 | `GET /signals`, `GET /signals/{ticker}` |
| Screener tab | gcp3 | `GET /screener` |
| Earnings tab | gcp3 | `GET /earnings-radar` |
| Industry tab | gcp3 | `GET /industry-returns`, `GET /industry-intel` |
| Swing predictions tab | gcp3 (primary), ai-text (fallback) | `GET /swing-predictions` |
| Agent runs (swing+growth) | gcp3 | `POST /agents/{kind}/run`, `GET /agents/{kind}/{id}`, `POST /agents/{kind}/{id}/chat` |
| Content / daily blog | gcp3 | `GET /content` |
| Hold-or-Fold modal | holdfold | `POST /api/analyze` |
| Chat (RAG) | ai-text | `POST /api/chat` |
| Health diagnostic screen | all three | `GET /health` × 3 |

---

## Step 7 — Resilience

The mobile app already has a resilience layer at
[lib/resilience/](../lib/resilience/) and monitoring at
[lib/monitoring.ts](../lib/monitoring.ts). Wire each new client through them:

- One circuit breaker **per backend** (not per endpoint) — if gcp3 is down,
  holdfold and ai-text should still work.
- Timeouts: 5s for list endpoints, 30s for `/agents/*/run` (those are slow).
- Retry only on 5xx and network errors, never on 4xx.
- Log a structured event per call so [lib/monitoring.ts](../lib/monitoring.ts)
  can attribute failures to a specific backend.

---

## Step 8 — Verification

Before claiming a feature is wired in (rule 3 from
[.claude/CLAUDE.md](../.claude/CLAUDE.md)):

1. Add a smoke test in `scripts/smoke-<backend>.ts` that hits the endpoint
   with realistic params and asserts the response shape.
2. Run it against the live backend, not a mock.
3. Render the data in at least one screen and confirm on an iOS simulator.

Don't write a "section A/B"–style summary doc claiming things are integrated
until those three steps are done.

---

## Step 9 — Cost — staying under $5/mo

Full breakdown: [COST_OPTIMIZATION_5_DOLLAR.md](./COST_OPTIMIZATION_5_DOLLAR.md).
The summary that's load-bearing for this integration plan:

The current ~$5/mo bill is dominated by **gcp3's 5 nightly scheduler jobs +
the Cloud Run CPU-seconds + Firestore writes they cause**. User traffic at
10–100 DAU is a rounding error in comparison. That means **integrating two
more backends won't move the bill** *if* the integration follows these five
rules:

1. **Backends scale to zero or they don't exist.** Every Cloud Run service
   has `--min-instances=0`. holdfold uses `--max-instances=3`, aitext (if
   deployed to Cloud Run) uses `--max-instances=2`. gcp3 stays at 5.
2. **Every endpoint is cache-first.** Firestore TTL-on-read, matching the
   gcp3 pattern. Mobile-side adds an AsyncStorage L1 cache with the same TTL
   so repeat taps on the same symbol don't even reach the backend.
3. **TTLs are the throttle.** Quotes 60s, Hold/Fold verdicts 6h, RAG
   retrieval 24h, LLM-generated content 24h. Don't shorten silently.
4. **LLM calls never on the user request path.** gcp3 already does this
   correctly (Gemini runs in the nightly bake, writes to Firestore). holdfold
   does too (no LLM). ai-text's `/api/chat` is the danger — it calls Gemini
   per request. Mitigations: keep the existing 60/min/IP limit, add a
   per-Clerk-user daily cap (start at 30/day), cache the embedding +
   retrieval step.
5. **Don't add scheduled jobs, share them.** Cloud Scheduler is $0.10/job/mo
   over 3 free. gcp3 already has 5. Piggyback on `gcp3-nightly-cache-purge`
   if a new backend needs purging.

**Per-backend cost impact at 10–100 DAU:**

| Backend | Cost delta | Why |
|---|---|---|
| gcp3 | ~$0 | already deployed; new mobile traffic well inside free tiers |
| holdfold | ~$0 | already deployed; verify `--max-instances=3` + mobile-side 6h cache |
| aitext | **+$0** if deployed to Vercel, **+$1–3/mo** if deployed to Cloud Run | Vercel's free tier absorbs the LLM cost; Cloud Run + ChromaDB persistence is awkward at this scale. See [aitext deploy decision](./wiki-mobile/decision-aitext-deploy-deferred.md). |

**Two things to do before any of this integration ships:**

- Set a Cloud Billing budget alert at $10 (2× target) — the `gcloud billing
  budgets create` command is in the cost doc.
- Verify `--min-instances=0` and `--max-instances` on each deployed Cloud Run
  service: `gcloud run services describe <svc> --region=us-central1`.

**Limits this plan doesn't pretend to solve** (also in the cost doc):
ChromaDB persistence on Cloud Run is genuinely awkward, Gemini cost is
unpredictable under viral load, and 200+ DAU will eventually exceed
Firestore's 50k free reads/day — at which point the answer is "add Cloud
CDN", not anything in this plan.

---

## What this guide explicitly does NOT do

- **No backend edits.** Not a single file in `gcp3/`, `holdemfoldemapp/`, or
  `ai-text-opt-1024/` is touched.
- **No new endpoints.** Every feature listed maps to an endpoint that already
  exists in one of the three backends.
- **No data migration.** Each backend keeps its own storage (Firestore for
  gcp3 + holdfold, ChromaDB for ai-text).
- **No deletion.** When `lib/api.ts` is fully superseded by the new clients,
  it gets archived to `docs/archived/`, not removed.

---

## Open questions to resolve before starting

1. Will gcp3 and holdfold get auth before we ship to TestFlight? If yes, we
   need a Clerk → backend JWT verification handoff doc in gcp3 first.
2. ai-text's swing/growth proxies vs gcp3 direct — confirm with the user
   which is canonical. The current code in
   [ai-text-opt-1024/backend/app/api/swing/runs/route.ts](../../ai-text-opt-1024/backend/app/api/swing/runs/route.ts)
   suggests gcp3 is canonical and ai-text is a wrapper, but the file naming
   in ai-text implies that backend "owns" runs too.
3. Per-backend rate limits — only ai-text's `/api/chat` has one in code
   ([60/min/IP](../../ai-text-opt-1024/backend/app/api/chat/route.ts#L11-L13));
   need to confirm Cloud Run / infra-level limits on the other two before
   exposing them to mobile users.
