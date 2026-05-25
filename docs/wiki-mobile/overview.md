---
date: 2026-05-23
type: overview
tags: [architecture, system-map, mobile]
sources: [../MULTI_BACKEND_INTEGRATION.md, ../ALL_PHASES_GUIDE.md, ../PHASE4_PHASE5_COMPLETION.md, ../lib/clients/, ../lib/http.ts, ../scripts/dev-all.sh]
---

# System Overview — gcp3-mobile

An Expo / React Native client for the gcp3 finance platform. Talks to **three** independent backends — gcp3 (signals, agents, content), holdemfoldem (hold-or-fold verdict), and ai-text-opt (RAG chat). Auth is Clerk Expo with Google OAuth. As of PR #5 + #6 (2026-05-23) all three clients are wired, three feature screens are live, and `npm run dev` orchestrates the entire local stack.

## Stack

| Layer | Tech | Deployed To |
|-------|------|-------------|
| Mobile shell | Expo SDK 54 + React Native 0.81 + React 19.1 | EAS Build → iOS / Android / Web |
| Routing | expo-router 6 (installed but not currently used — App.tsx is the entry) | bundled |
| Auth | @clerk/clerk-expo 2.19 | Clerk-hosted |
| OAuth | Google Identity Services via Clerk | Google Cloud |
| Storage | [[entity-secure-storage]] (Keychain on native, localStorage on web) | device-local |
| HTTP | [[entity-http]] (`lib/http.ts`) + per-backend clients | n/a |
| Backend (primary) | FastAPI on Cloud Run | see `gcp3/docs/wiki-gcp3/gcp-deployment-flow.md` |
| Backend (Hold/Fold) | FastAPI on Cloud Run | holdemfoldem repo (separate deploy) |
| Backend (RAG) | Next.js + ChromaDB + embed-service (3 processes) | local only — see [[decision-aitext-deploy-deferred]] |

## Data Flow (post-PR-#5)

```
React Native screen (BriefingScreen / HoldFoldScreen / ChatScreen)
       │
       ▼
lib/clients/{gcp3,holdfold,aitext,council}.ts   (typed per-backend)
       │
       ▼
lib/http.ts → httpJson<T>(baseUrl, path, options)
       │     (timeout, withRetry, monitoring)
       │
       ├─────────────► gcp3 backend (Cloud Run, FastAPI)
       │                 GET /signals, /screener, /market-overview, /macro-pulse
       │                 POST /agents/{kind}/run, …/chat
       │
       ├─────────────► holdemfoldem backend (Cloud Run, FastAPI)
       │                 POST /api/analyze
       │
       └─────────────► ai-text-opt (Next.js :3002)
                         POST /api/chat → ChromaDB :8000 + embed-service :8001 → Gemini
```

The Council composer at [[entity-council-composer]] builds prompts and calls `aitext.ts`'s `ragChat()`; it's not a separate transport.

## Entity Map

The named components and their relationships. Each has its own wiki page.

**Auth + config**
- [[entity-clerk-expo]] — auth provider; wraps the app via `lib/auth-provider.tsx`. Now enforces a 1h client-side session cap (see [[decision-1h-session-cap]]).
- [[entity-secure-storage]] — `lib/secure-storage.ts` cross-platform shim (Keychain on native, localStorage on web)
- [[entity-config-validator]] — startup gate, now includes backend URL configs
- [[entity-demo-mode]] — fake-auth path that lets the app run without real Clerk keys

**HTTP + backends**
- [[entity-http]] — `lib/http.ts`; the shared HTTP primitive
- [[entity-backend-client]] — `lib/api.ts` shim + `lib/clients/{gcp3,holdfold,aitext}.ts`; fully fanned out as of PR #5
- [[entity-council-composer]] — `lib/clients/council.ts`; the prompt-building layer on top of `aitext.ts`
- [[entity-resilience-layer]] — `lib/resilience/` retries + rate limiter
- [[entity-monitoring]] — `lib/monitoring.ts`; structured event sink

**Dev tooling**
- [[entity-dev-launcher]] — `scripts/dev-all.sh` + `npm run dev`; starts gcp3, holdfold, chromadb, embed-service, ai-text Next.js, and Expo together

## Current System Health (2026-05-23)

| Component | Status | Notes |
|-----------|--------|-------|
| Clerk Expo wiring | ✅ Wired | Sign-in screen + provider + Google OAuth via `useOAuth` |
| Google OAuth | ✅ Wired in code | Real prod credentials still pending — see [[../PRODUCTION_CLERK.md]] |
| Demo mode | ✅ Default-on | `EXPO_PUBLIC_DEMO_MODE=true` in `.env.local` bypasses sign-in; production must pin to `false` |
| Session lifetime | ✅ 1h client-side cap | See [[decision-1h-session-cap]]. Server-side cap needs Clerk Dashboard setting per runbook. |
| gcp3 backend client | ✅ Typed client | `lib/clients/gcp3.ts` — 13 functions; consumed by BriefingScreen + agents |
| holdemfoldem client | ✅ Typed client | `lib/clients/holdfold.ts` — `analyzeHoldFold()` returns the real HOLD EM / FOLD EM / NEUTRAL shape |
| ai-text-opt client | ✅ Typed client; backend local-only | `lib/clients/aitext.ts` — `ragChat()` + swing-run proxies. Backend not yet deployed; see [[decision-aitext-deploy-deferred]] |
| AI Council | ✅ Wired | `lib/clients/council.ts` composer with short-term, long-term, agreement prompt builders. Tap-in via `components/CouncilPanel.tsx`. See [[concept-council-tap-in]]. |
| Dual-view chat | ✅ Wired | ChatScreen "All" filter fires short + long in parallel; ★ Agree button opt-in. See [[decision-dual-view-with-agree]]. |
| Resilience layer | ✅ Implemented + consumed | `withRetry` is called inside `lib/http.ts`. Circuit breaker still per-call, not per-backend. |
| Per-backend circuit breaker | ❌ Not yet | Original [[../MULTI_BACKEND_INTEGRATION.md]] Step 7 goal — still open. |
| Type generation from OpenAPI | ⚠️ Wired in package.json, not run | `npm run gen:types` exists; hand-rolled types remain in clients |
| Auth on backends | ❌ None | All three backends still open; mobile sends no bearer token. `getToken()` in shim returns `null`. |
| Dev launcher | ✅ `npm run dev` | Starts 5 backend processes + Expo with trap-cleanup. See [[entity-dev-launcher]]. |

## Key Design Decisions

- [[decision-demo-mode-default-on]] — local dev should never need real Clerk keys
- [[decision-single-backend-url-was-temporary]] — **validated 2026-05-23** by PR #5
- [[decision-no-handrolled-types]] — generate TS from each FastAPI's OpenAPI rather than mirror Python types
- [[decision-aitext-deploy-deferred]] — ai-text-opt stays local until a deploy target is chosen
- [[decision-1h-session-cap]] — client-side 1h enforcement plus the Dashboard-side counterpart
- [[decision-dual-view-with-agree]] — parallel short+long with opt-in synthesis instead of auto-agreement

## Key Concepts

- [[concept-backend-is-source-of-truth]] — generated types, never hand-mirrored
- [[concept-archive-not-delete]] — when something goes obsolete, move it; do not `rm`
- [[concept-council-tap-in]] — LLM calls never auto-fire; user must tap explicitly (rule 4 of the cost guardrail)
- [[concept-single-backend-assumption]] — **resolved 2026-05-23**; kept for historical context

## Open Issues

1. **No bearer auth on any backend** — Clerk JWT is available client-side but no backend verifies it. Either backends grow middleware or mobile-to-backend traffic stays internal. Cross-cutting; affects [[entity-clerk-expo]], [[entity-http]], and all three clients.
2. **ai-text-opt has no GCP deploy** — confirmed still true 2026-05-23: no Dockerfile or cloudbuild.yaml at the repo or `backend/` level. Mobile cannot use it in production. See [[decision-aitext-deploy-deferred]].
3. **Per-backend circuit breaker missing** — [[entity-resilience-layer]] retries per-call, not per-backend. A gcp3 outage doesn't yet isolate holdfold/ai-text. See [[decision-single-backend-url-was-temporary#validated-by]].
4. **No type generation run** — `npm run gen:types` is in package.json but hand-rolled types remain in `lib/clients/*.ts`. Violates [[decision-no-handrolled-types]] over time as backend schemas drift.
5. **Server-side session cap not configured** — client-side 1h cap is enforced in [[entity-clerk-expo]], but Clerk Dashboard "Token lifetime" must be set to 3600s for defense in depth. Tracked in [[../PRODUCTION_CLERK.md]].

## See Also

All entity, concept, incident, and decision pages are cataloged in [[index]].
