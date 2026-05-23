---
date: 2026-05-22
type: concept
tags: [architecture, debt, mobile]
sources: [../lib/api.ts, ../MULTI_BACKEND_INTEGRATION.md]
---

# Concept: The Single-Backend Assumption

The mobile app was built as if it talked to one server. The codebase still reflects that — one env var, one base URL, one client. In reality the app needs to call three independent services (gcp3, holdemfoldem, ai-text-opt), each owned by a different repo, each deployed independently. The gap between "one host" and "three hosts" is the central architectural debt this wiki tracks.

## The pattern

A "single-backend assumption" is any code that:

- Reads exactly one `*_BACKEND_URL` env var
- Hardcodes the base URL into `fetch` calls
- Type-collapses all responses into one client surface (e.g. one `fetchBackend<T>` that any caller can use for any endpoint)
- Wires resilience scoped to "the backend" rather than "this specific backend"

Each of those is fine when there is one backend. Each becomes a bug when there are three: a holdemfoldem outage looks like a gcp3 outage to the circuit breaker; a new endpoint added to ai-text needs an env var that doesn't exist; a Clerk-authenticated route on one backend forces all backends to need auth.

## Where it appears

- [[entity-backend-client]] — the canonical example. `BACKEND_URL` at [`lib/api.ts:5`](../lib/api.ts#L5) is one constant for one host.
- [[entity-config-validator]] — doesn't check any backend URL at all, so the single-host assumption hides behind a silent default to `http://localhost:3000`.
- [[entity-resilience-layer]] — circuit breaker is per-call today, but the *intent* (per [[../MULTI_BACKEND_INTEGRATION.md]] Step 7) is per-backend. Same word, different scope.
- [[entity-monitoring]] — event shape has no `backend` tag yet; once three clients exist, untagged events are unattributable.

## Contradictions / tensions

- The cross-repo workflow rules (`.claude/CLAUDE.md` rules 1–10) explicitly describe a three-backend reality. The mobile code does not.
- [[../MULTI_BACKEND_INTEGRATION.md]] proposes the fix but is unimplemented. Until it lands, the wiki and the code disagree about how many backends exist.

## Why it persists

Two reasons. First, gcp3 is the only backend the mobile app has actually called in anger; holdfold and ai-text are planned features. Single-host worked for what shipped. Second, [[entity-demo-mode]] makes the single-host default ("`http://localhost:3000`") invisible — the app feels fine in dev because demo mode masks the backend call entirely.

The fix is recorded in [[decision-single-backend-url-was-temporary]] and detailed in [[../MULTI_BACKEND_INTEGRATION.md]] Step 2 (`lib/http.ts` + per-backend clients).

## See also

- [[../MULTI_BACKEND_INTEGRATION.md]] — the integration plan
- [[decision-single-backend-url-was-temporary]] — the planned fix
- [[entity-backend-client]] — the entity carrying the assumption
- [[decision-aitext-deploy-deferred]] — why one of the three backends doesn't yet exist in production
