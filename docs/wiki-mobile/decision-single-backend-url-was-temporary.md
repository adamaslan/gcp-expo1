---
date: 2026-05-22
type: decision
tags: [architecture, backend, debt]
sources: [../lib/api.ts, ../MULTI_BACKEND_INTEGRATION.md]
---

# Decision: The Single `BACKEND_URL` Was Always Temporary

## Decision

`EXPO_PUBLIC_BACKEND_URL` was introduced in early development as a single env var because only one backend (gcp3) was being called. It will be replaced by three named env vars — `EXPO_PUBLIC_GCP3_BACKEND_URL`, `EXPO_PUBLIC_HOLDFOLD_BACKEND_URL`, `EXPO_PUBLIC_AITEXT_BACKEND_URL` — and three per-backend client modules.

## Date

Original commit: pre-2026-04 (Phase 1).
Recorded as a deliberate decision (rather than incidental code): 2026-05-22.
Planned execution: see [[../MULTI_BACKEND_INTEGRATION.md]] Step 2.

## Context

The mobile app was bootstrapped against the gcp3 FastAPI backend. At that time there was no plan in code to talk to holdemfoldem or ai-text-opt — those were separate repos with their own frontends. Phase 4/5 expanded the scope: the mobile app is intended to be the user-facing surface for all three. The single `BACKEND_URL` is now actively wrong.

## Alternatives considered

- **Keep one URL and put a reverse proxy in front.** Rejected — the three backends have different auth needs, different deploy cadences, and live in different repos. A proxy hides the boundary that the cross-repo workflow rules are trying to make visible.
- **Per-endpoint URL config.** Rejected — too granular; the natural boundary is per-backend, not per-endpoint.
- **Hardcode hostnames in client modules.** Rejected — must be configurable per environment (dev / staging / prod).

## Consequences

**Enables:**
- Independent circuit breakers per backend (see [[entity-resilience-layer]])
- Independent timeouts per backend (gcp3 agent endpoints are slow; holdfold is fast; ai-text chat is medium)
- Per-backend monitoring attribution (see [[entity-monitoring]])
- Auth strategy can differ per backend (today none of them require auth; in future they may diverge)

**Rules out:**
- A simple "just point at the proxy" deploy story
- Sharing a single client cache across backends

**Risks during migration:**
- Existing screens calling `fetchBackend(...)` must keep compiling. Plan: re-export `fetchBackend` from `lib/api.ts` pointing at the new `gcp3.ts` client. See [[../MULTI_BACKEND_INTEGRATION.md]] Step 2.

## Validated by

Not yet — the refactor hasn't shipped. Will be validated when:
- A gcp3 outage no longer breaks Hold/Fold (proves per-backend circuit breakers work)
- The wiki page [[concept-single-backend-assumption]] can be archived (proves the debt is paid)

## See also

- [[concept-single-backend-assumption]] — the debt this decision pays down
- [[entity-backend-client]] — the entity being refactored
- [[../MULTI_BACKEND_INTEGRATION.md]] — execution plan
