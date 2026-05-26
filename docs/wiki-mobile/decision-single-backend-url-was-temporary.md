---
date: 2026-05-23
type: decision
tags: [architecture, backend, debt, validated]
sources: [../lib/api.ts, ../lib/http.ts, ../lib/clients/, ../MULTI_BACKEND_INTEGRATION.md]
---

# Decision: The Single `BACKEND_URL` Was Always Temporary

> ✅ **Validated 2026-05-23.** Executed by PR #5 ([feat(infra): multi-backend client architecture](https://github.com/adamaslan/gcp-expo1/pull/5)). The refactor shipped without breaking existing callers because `lib/api.ts` was kept as a shim. See [[entity-backend-client]] and [[entity-http]].

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

- PR #5 merged 2026-05-23 — introduced `lib/http.ts` and `lib/clients/{gcp3,holdfold,aitext}.ts`. The shim at `lib/api.ts` preserves the `fetchBackend` API, so no existing screen broke during the migration. See diff in [entity-backend-client#current-shape-post-pr-5](entity-backend-client.md#current-shape-post-pr-5).
- [[concept-single-backend-assumption]] now carries a `✅ Resolved` banner — kept as historical context per the archive-not-delete policy ([[concept-archive-not-delete]]).

Still open (these were originally listed under "Risks during migration" and are now their own follow-ups):
- Per-backend circuit breakers are not yet wired. Today `lib/http.ts` retries with `withRetry`, but the breaker is per-call. A gcp3 outage doesn't yet protect holdfold/ai-text the way [[../MULTI_BACKEND_INTEGRATION.md]] Step 7 envisioned.
- Type generation from each backend's OpenAPI (`npm run gen:types`) is wired in [package.json](../../package.json) but not yet run; clients still use hand-rolled types. See [[decision-no-handrolled-types]].

## See also

- [[concept-single-backend-assumption]] — the debt this decision pays down
- [[entity-backend-client]] — the entity being refactored
- [[../MULTI_BACKEND_INTEGRATION.md]] — execution plan
