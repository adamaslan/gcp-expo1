# Wiki Index — gcp3-mobile

_Last updated: 2026-08-07 (our PR #29 + portal PR #50 — subscription.ts/signalFilters.ts/prefs.ts de-drift batch; parity headline ~60%→~62%)_

Catalog is organized by page type. Read `index.md` first on any query to find relevant pages, then drill in. For the philosophy behind this wiki pattern, see [[ORIGIN]].

---

## Overview

- [[overview]] — system map, stack, current health, what's wired vs. planned

---

## System Entities

One page per named system component. These are the hubs.

**Auth + config**
- [[entity-clerk-expo]] — auth provider; 1h client-side session cap as of PR #6
- [[entity-secure-storage]] — cross-platform storage shim (Keychain on native, localStorage on web)
- [[entity-config-validator]] — startup gate, includes backend URL configs as of PR #5
- [[entity-demo-mode]] — mock-auth bypass for local dev

**HTTP + backends**
- [[entity-http]] — `lib/http.ts`; shared HTTP primitive with timeout + retry + monitoring
- [[entity-backend-client]] — `lib/api.ts` shim + `lib/clients/{gcp3,holdfold,aitext}.ts`; fully fanned out as of PR #5
- [[entity-council-composer]] — `lib/clients/council.ts`; prompt builders + AI Council composition
- [[entity-resilience-layer]] — retries + circuit breaker + rate limiter from Phase 4–5
- [[entity-monitoring]] — `lib/monitoring.ts`; structured event sink

**Dev tooling**
- [[entity-dev-launcher]] — `npm run dev` and the 5-process orchestration rule

**Product (added 2026-07-02)**
- [[entity-billing]] — subscription status, Settings tab, authenticated checkout (PR #14, #21, #22)
- [[entity-retention]] — streak, push opt-in, share sheet, trial banner (PR #19, #20)
- [[entity-signals-digest]] — schema-versioned digest + `adaptLiveSignals` + `SignalDigestCard` (PR #16)
- [[entity-nuai]] — chat contract, guardrails, SSE streaming fix, prompt chips + ticker grounding (PR #16, #24, #28)
- [[entity-portfolio]] — health score + watchlist; first real UI consumer of `usePortfolio` (PR #28)

---

## Concepts

Cross-cutting patterns and design philosophy.

- [[concept-council-tap-in]] — LLM calls never auto-fire; user must tap (Rule 4 of the $5/mo cost guard)
- [[concept-test-strategy]] — documents an absence: no test framework exists; what to build first and why
- [[concept-free-tier-resilience]] — GCP infra free tiers (cost scales with cron, not users) and quota-vs-outage failure
- [[concept-backend-is-source-of-truth]] — generate types from backend OpenAPI; never hand-mirror
- [[concept-mobile-web-parity]] — how synced this app and the web portal are (~62%, 2026-08-07 after our PR #29 + portal PR #50) + full parity matrix
- [[concept-sync-requirements]] — what each surface needs to reach parity (de-drift, port, converge)
- [[concept-archive-not-delete]] — when docs/code go obsolete, move to archive, never `rm`
- ~~[[concept-single-backend-assumption]]~~ — **resolved 2026-05-23** by PR #5; kept for historical context

---

## Decisions

Recorded design decisions with rationale, alternatives rejected, and validation history.

**Validated**
- [[decision-single-backend-url-was-temporary]] — ✅ validated 2026-05-23 by PR #5

**Active**
- [[decision-demo-mode-default-on]] — local dev runs without real Clerk keys by default
- [[decision-no-handrolled-types]] — generate TS from each backend's `/openapi.json`
- [[decision-aitext-deploy-deferred]] — ai-text-opt isn't deployed on GCP; mobile waits
- [[decision-1h-session-cap]] — 1h hard cap on both client and server
- [[decision-dual-view-with-agree]] — "All" filter fires both views in parallel; Agree is opt-in
- [[decision-neon-dark-theme-palette]] — adopt portal-aligned neon-cyan palette; removes indigoDeep (PR #27)

---

## Incidents

Production failures. Each incident updates the entity pages it touches.

_None recorded yet._ Two near-incidents caught during PR #6 dogfooding (SecureStore web error, sign-in screen unreachable) — documented as "Known failures" in [[entity-clerk-expo]] rather than as standalone incidents since neither reached users.

---

## Architecture

- [[../MULTI_BACKEND_INTEGRATION.md]] — the multi-backend integration plan (lives at `docs/`, not `docs/wiki-mobile/`, because it is a user-curated source, not a synthesized wiki page)
- [[../COST_OPTIMIZATION_5_DOLLAR.md]] — the $5/mo budget rules and per-backend cost-delta table

---

## Runbooks

User-curated operational guides. Lives at `docs/` like architecture pages.

- [[../PRODUCTION_CLERK.md]] — moving from `pk_test_` to `pk_live_` Clerk keys for App Store / TestFlight builds; includes the 1h server-side session-lifetime setting

---

## Sources (raw/)

Immutable source documents. LLM reads; never modifies.

The `raw/` directory is empty as of 2026-05-23. The wiki was synthesized from:

| File | What it is | Lives at |
|------|------------|----------|
| `MULTI_BACKEND_INTEGRATION.md` | Plan: integrate three backends without editing them | `docs/` |
| `COST_OPTIMIZATION_5_DOLLAR.md` | $5/mo budget rules | `docs/` |
| `PRODUCTION_CLERK.md` | Production Clerk + session cap runbook | `docs/` |
| `CLAUDE.md` (project + .claude/) | Documentation policy + Dev Mode rule | `/` and `.claude/` |
| `PHASE2_START_HERE.md`, `PHASE3_COMPLETE.md`, `PHASE4_PHASE5_COMPLETION.md` | Phase summaries | `/` and `docs/` |
| `lib/http.ts`, `lib/clients/`, `lib/secure-storage.ts`, `lib/ui/theme.ts`, `lib/auth-provider.tsx`, `lib/config-validator.ts`, `lib/resilience/*`, `lib/monitoring.ts` | Live code | `lib/` |
| `App.tsx`, `screens/{Briefing,HoldFold,Chat,SignIn}Screen.tsx`, `components/{CouncilPanel,TabBar}.tsx` | UI surfaces | `/`, `screens/`, `components/` |
| `scripts/dev-all.sh` | The orchestration | `scripts/` |

When source files stabilize, copy or link them into `docs/wiki-mobile/raw/` so the wiki has an immutable evidence layer per [[SCHEMA#three-layers]].

---

## Cross-Repo

The mobile app talks to backends documented in their own wikis. Do not edit those wikis from a mobile session (cross-repo rule 7).

- `gcp3/docs/wiki-gcp3/` — gcp3 backend wiki (Cloud Run, signals, agents, content)
- holdemfoldem and ai-text-opt have no wiki yet

---

## Meta

- [[SCHEMA]] — wiki conventions, page types, required sections, workflows
- [[ORIGIN]] — philosophy and why mobile has its own wiki
- [[log]] — append-only operations log
- [[Welcome]] — Obsidian vault entry point

---

## Open Cross-Wiki Items

- Signal digest adapter divergence between mobile and `nuwrrrld-portal` — see [[entity-signals-digest#open-questions]]
- Legal consent checkbox parity between mobile and portal — see [[overview#open-issues]] item 7

## Slash commands

- `/update-wiki` — sync, ingest, refresh, lint, or archive wiki pages. Lives at `.claude/commands/update-wiki.md`. Always read [[SCHEMA]] first; never write secrets; never edit other repos.
