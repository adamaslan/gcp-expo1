# Wiki Index — gcp3-mobile

_Last updated: 2026-05-22 (initial creation)_

Catalog is organized by page type. Read `index.md` first on any query to find relevant pages, then drill in. For the philosophy behind this wiki pattern, see [[ORIGIN]].

---

## Overview

- [[overview]] — system map, stack, current health, what's wired vs. planned

---

## System Entities

One page per named system component. These are the hubs.

- [[entity-clerk-expo]] — auth provider; wraps the app; awaits real credentials
- [[entity-backend-client]] — `lib/api.ts`; single-host today, fans-out planned
- [[entity-resilience-layer]] — retries + circuit breaker + rate limiter from Phase 4–5
- [[entity-monitoring]] — `lib/monitoring.ts`; structured event sink
- [[entity-config-validator]] — startup gate for required env vars
- [[entity-demo-mode]] — mock-auth bypass for local dev

---

## Concepts

Cross-cutting patterns and design philosophy.

- [[concept-single-backend-assumption]] — what the current code assumes about backends and why it's wrong
- [[concept-backend-is-source-of-truth]] — generate types from backend OpenAPI; never hand-mirror
- [[concept-archive-not-delete]] — when docs/code go obsolete, move to archive, never `rm`

---

## Decisions

Recorded design decisions with rationale, alternatives rejected, and validation history.

- [[decision-demo-mode-default-on]] — local dev runs without real Clerk keys by default
- [[decision-single-backend-url-was-temporary]] — the `BACKEND_URL` env var was always a placeholder for three
- [[decision-no-handrolled-types]] — generate TS from each backend's `/openapi.json`
- [[decision-aitext-deploy-deferred]] — ai-text-opt isn't deployed on GCP; mobile waits

---

## Incidents

Production failures. Each incident updates the entity pages it touches.

_None recorded yet._ This wiki was created before any mobile-specific incident landed. The first incident page will go here.

---

## Architecture

- [[../MULTI_BACKEND_INTEGRATION.md]] — the multi-backend integration plan (lives at `docs/`, not `docs/wiki-mobile/`, because it is a user-curated source, not a synthesized wiki page)

---

## Runbooks

User-curated operational guides. Lives at `docs/` like architecture pages.

- [[../PRODUCTION_CLERK.md]] — moving from `pk_test_` to `pk_live_` Clerk keys for App Store / TestFlight builds

---

## Sources (raw/)

Immutable source documents. LLM reads; never modifies.

The `raw/` directory is empty as of 2026-05-22. The wiki was synthesized from:

| File | What it is | Lives at |
|------|------------|----------|
| `MULTI_BACKEND_INTEGRATION.md` | Plan: integrate three backends without editing them | `docs/` |
| `CLAUDE.md` (project root) | Documentation policy + Phase 2 status | `/` |
| `.claude/CLAUDE.md` | Cross-repo workflow rules | `.claude/` |
| `PHASE2_START_HERE.md`, `PHASE3_COMPLETE.md`, `PHASE4_PHASE5_COMPLETION.md` | Phase summaries | `/` and `docs/` |
| `lib/api.ts`, `lib/auth-provider.tsx`, `lib/mock-auth.tsx`, `lib/config-validator.ts`, `lib/resilience/*`, `lib/monitoring.ts` | Live code | `lib/` |

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
