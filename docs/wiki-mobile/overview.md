---
date: 2026-05-22
type: overview
tags: [architecture, system-map, mobile]
sources: [../MULTI_BACKEND_INTEGRATION.md, ../ALL_PHASES_GUIDE.md, ../PHASE4_PHASE5_COMPLETION.md]
---

# System Overview — gcp3-mobile

An Expo / React Native client for the gcp3 finance platform. Talks to **three** independent backends — gcp3 (signals, agents, content), holdemfoldem (hold-or-fold verdict), and ai-text-opt (RAG chat). Auth is Clerk Expo with a Google OAuth flow. The app currently treats only the gcp3 backend as wired; the other two are planned.

## Stack

| Layer | Tech | Deployed To |
|-------|------|-------------|
| Mobile shell | Expo SDK 52 + React Native 0.76 | EAS Build → iOS / Android / Web |
| Routing | expo-router 4 | bundled |
| Auth | @clerk/clerk-expo 2.19 | Clerk-hosted |
| OAuth | Google Identity Services via Clerk | Google Cloud |
| Storage | expo-secure-store | device keychain |
| Backend (primary) | FastAPI on Cloud Run | see `gcp3/docs/wiki-gcp3/gcp-deployment-flow.md` |
| Backend (Hold/Fold) | FastAPI on Cloud Run | holdemfoldem repo (separate deploy) |
| Backend (RAG) | Next.js (not yet deployed) | ai-text-opt-1024 repo, local-only today |

## Data Flow

```
React Native screen
       │
       ▼
hooks/use{Feature}      (planned)
       │
       ▼
lib/clients/{gcp3,holdfold,aitext}.ts   (planned)
       │
       ▼
lib/http.ts             (planned — refactor of current lib/api.ts)
       │
       ├─────────────► gcp3 backend (Cloud Run, FastAPI)
       │                 GET /signals, /screener, /market-overview, …
       │                 POST /agents/{kind}/run, …/chat
       │
       ├─────────────► holdemfoldem backend (Cloud Run, FastAPI)
       │                 POST /api/analyze
       │
       └─────────────► ai-text-opt backend (Next.js, no deploy)
                         POST /api/chat (ChromaDB RAG)
```

The dashed boundaries — the per-backend clients and the `httpJson` helper — do not exist yet. They are the work proposed in [[../MULTI_BACKEND_INTEGRATION.md]]. The current code in [[entity-backend-client]] has only one base URL.

## Entity Map

The named components and their relationships. Each has its own wiki page.

- [[entity-clerk-expo]] — auth provider; wraps the app via [[../lib/auth-provider.tsx]]
- [[entity-backend-client]] — `lib/api.ts`; today a single-host fetch wrapper; planned to fan out
- [[entity-resilience-layer]] — `lib/resilience/` network resilience + rate limiter
- [[entity-monitoring]] — `lib/monitoring.ts`; structured event sink
- [[entity-config-validator]] — `lib/config-validator.ts`; gates startup on required env
- [[entity-demo-mode]] — fake-auth path that lets the app run without real Clerk keys

## Current System Health (2026-05-22)

| Component | Status | Notes |
|-----------|--------|-------|
| Clerk Expo wiring | ✅ Wired | Sign-in screen + provider in place; awaiting real keys (Phase 2) |
| Google OAuth | ⚠️ Pending | Credentials not yet pasted into Clerk dashboard |
| Demo mode | ✅ Default-on | Lets local dev work without Clerk keys; see [[decision-demo-mode-default-on]] |
| gcp3 backend client | ⚠️ Single-host only | Hardcoded `EXPO_PUBLIC_BACKEND_URL` in [[entity-backend-client]] |
| holdemfoldem client | ❌ Not started | See [[../MULTI_BACKEND_INTEGRATION.md]] |
| ai-text-opt client | ❌ Not started; backend not deployed | RAG chat blocked until ai-text deploys |
| Resilience layer | ✅ Implemented | Circuit breaker + retry per-call; needs per-backend wiring |
| Type generation from OpenAPI | ❌ Not started | All API shapes hand-rolled today |
| Auth on backends | ❌ None | All three backends are open; mobile sends no bearer token |

## Key Design Decisions

- [[decision-demo-mode-default-on]] — local dev should never need real Clerk keys
- [[decision-single-backend-url-was-temporary]] — `EXPO_PUBLIC_BACKEND_URL` was always meant to be one of three; just hadn't been split yet
- [[decision-no-handrolled-types]] — generate TS from each FastAPI's OpenAPI rather than mirror Python types
- [[concept-single-backend-assumption]] — what the current code assumes and why it's wrong

## Open Issues

1. **Single-backend assumption** — [[entity-backend-client]] hardcodes one URL. Adding holdemfoldem and ai-text without breaking gcp3 callers requires the refactor in [[../MULTI_BACKEND_INTEGRATION.md]] Step 2. See [[concept-single-backend-assumption]].
2. **ai-text-opt has no GCP deploy** — confirmed 2026-05-22: no Dockerfile, no cloudbuild.yaml, no vercel.json at the repo or `backend/` level. Mobile cannot call it in production. See [[decision-aitext-deploy-deferred]].
3. **Auth boundary** — Clerk Expo is wired but the three backends don't verify any JWT. Either backends need middleware or mobile-to-backend traffic must stay internal. No decision recorded yet.
4. **No type generation** — every backend response is hand-typed in mobile. Violates cross-repo rule 2. See [[decision-no-handrolled-types]] (planned).
5. **Cross-repo dependencies not gated** — when a backend schema changes, mobile finds out at runtime. No PR cross-link or CI check enforces the three-checks rule from `.claude/CLAUDE.md` rule 8.

## See Also

All entity, concept, incident, and decision pages are cataloged in [[index]].
