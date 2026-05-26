---
date: 2026-05-23
type: entity
tags: [http, api, backend, mobile]
sources: [../lib/api.ts, ../lib/http.ts, ../lib/clients/, ../MULTI_BACKEND_INTEGRATION.md]
---

# Entity: Backend Client (`lib/api.ts` + `lib/clients/`)

The mobile app's HTTP layer. As of PR #5 (2026-05-23), `lib/api.ts` is a **thin backward-compatibility shim** that delegates to [[entity-http]]. The real per-backend clients live in `lib/clients/{gcp3,holdfold,aitext,council}.ts`. Each backend gets its own typed module; `fetchBackend` is preserved only so legacy callers continue to compile.

## What it is

Three things now stack into one HTTP surface:

1. **`lib/http.ts`** — [[entity-http]] — the shared `httpJson<T>(baseUrl, path, options)` primitive. Owns timeout, retry, monitoring. Backend-agnostic.
2. **`lib/clients/{gcp3,holdfold,aitext}.ts`** — typed per-backend modules. Each reads its own `EXPO_PUBLIC_*_BACKEND_URL` env var, sets its own timeouts, and exports typed functions (e.g. `getMarketOverview()`, `analyzeHoldFold(req)`, `ragChat(req)`).
3. **`lib/api.ts`** — the legacy shim. Now ~30 lines: re-exports `fetchBackend` but routes it through `httpJson` against the gcp3 base URL. Existing screens that imported `getMarketData` / `getUserProfile` keep working unchanged.

The single-host assumption tracked by [[concept-single-backend-assumption]] is **paid down** as of PR #5.

## Where used

- [[entity-http]] — the primitive every client wraps
- [[entity-council-composer]] — composes `aitext.ts` + prompt builders to produce the AI Council
- `screens/BriefingScreen.tsx` — calls `lib/clients/gcp3.ts`
- `screens/HoldFoldScreen.tsx` — calls `lib/clients/holdfold.ts` + Council
- `screens/ChatScreen.tsx` — calls `lib/clients/aitext.ts` directly + via Council
- `screens/HomeScreen.tsx` — still imports legacy `fetchBackend` from `lib/api.ts`; works via the shim

## Current shape (post PR #5)

```
lib/
├── http.ts                — httpJson<T>(baseUrl, path, options)
├── api.ts                 — legacy shim → httpJson against gcp3 base URL
└── clients/
    ├── gcp3.ts            — 13 typed functions (signals, agents, market, etc.)
    ├── holdfold.ts        — analyzeHoldFold(req) → HoldFoldVerdict
    ├── aitext.ts          — ragChat(req) → ChatResponse + swing-run proxies
    └── council.ts         — prompt builders + askCouncil() composer (depends on aitext)
```

Each `lib/clients/*.ts` resolves its base URL once at module load via `process.env.EXPO_PUBLIC_{name}_BACKEND_URL`, with a localhost fallback that points at the conventional dev port for that backend (gcp3 → 8080, holdfold → 8081, aitext → 3002).

## Configuration

| Env var | Consumer | Localhost fallback |
|---------|----------|--------------------|
| `EXPO_PUBLIC_GCP3_BACKEND_URL` | `lib/clients/gcp3.ts`, `lib/api.ts` shim | `http://localhost:8080` |
| `EXPO_PUBLIC_HOLDFOLD_BACKEND_URL` | `lib/clients/holdfold.ts` | `http://localhost:8081` |
| `EXPO_PUBLIC_AITEXT_BACKEND_URL` | `lib/clients/aitext.ts` | `http://localhost:3002` |

All three are surfaced as optional configs in [[entity-config-validator]]'s `BACKEND_URL_CONFIGS`. They're not "required" because the localhost fallbacks let the app boot for dev. In production builds they MUST be set via EAS secrets.

## Known failures

None recorded against the new architecture yet. The client layer is fresh as of PR #5. Failures live in the backends (network, 503 from ai-text when ChromaDB or embed-service is down — see [[entity-dev-launcher#aitext-is-actually-three-processes]]).

Two failure modes worth watching:

1. **`getToken()` still returns `null`** in the shim. None of the three backends require a bearer token today, but the moment one does, the shim's no-op `getToken` will silently send unauthenticated requests rather than failing closed.
2. **Per-backend timeouts are hand-tuned.** gcp3 agent endpoints use 30s; everything else 5–10s. If a new endpoint is added without explicit timeout, it inherits the `lib/http.ts` default of 10s, which may be wrong for slow endpoints.

## Open questions

- Should `getToken()` in the shim fetch from Clerk's session at call time? It currently can't — the shim is module-scoped and has no React context.
- When type generation lands (per [[decision-no-handrolled-types]]), the hand-rolled types in `lib/clients/*.ts` get displaced. What's the migration sequence so the generated types coexist with the hand-rolled ones?

## See also

- [[entity-http]] — the shared primitive
- [[entity-council-composer]] — the highest-level composition over `aitext.ts`
- [[concept-single-backend-assumption]] — the debt this entity carried; now resolved
- [[decision-single-backend-url-was-temporary]] — the decision that drove the refactor; now validated
- [[entity-config-validator]] — gates the per-backend URLs
- [[entity-dev-launcher]] — the `npm run dev` command that starts every backend this entity talks to
- [[entity-resilience-layer]] — `withRetry` is consumed by `lib/http.ts`
