---
date: 2026-05-23
type: concept
tags: [architecture, debt, mobile, resolved]
sources: [../lib/api.ts, ../lib/http.ts, ../lib/clients/, ../MULTI_BACKEND_INTEGRATION.md]
---

# Concept: The Single-Backend Assumption

> ✅ **Resolved 2026-05-23 by PR #5** ([feat(infra): multi-backend client architecture](https://github.com/adamaslan/gcp-expo1/pull/5)). The debt is paid: `lib/http.ts` exists, `lib/clients/{gcp3,holdfold,aitext,council}.ts` exist, three env vars are wired through [[entity-config-validator]], and [[entity-backend-client]] is a thin shim for legacy callers. This page is kept for historical context — DO NOT use it to reason about current architecture; see [[entity-backend-client]] and [[entity-http]] for what's true today.

---

## Original concept (pre-PR-#5, kept for context)

The mobile app was built as if it talked to one server. The codebase still reflects that — one env var, one base URL, one client. In reality the app needs to call three independent services (gcp3, holdemfoldem, ai-text-opt), each owned by a different repo, each deployed independently. The gap between "one host" and "three hosts" is the central architectural debt this wiki tracks.

## The pattern

A "single-backend assumption" is any code that:

- Reads exactly one `*_BACKEND_URL` env var
- Hardcodes the base URL into `fetch` calls
- Type-collapses all responses into one client surface (e.g. one `fetchBackend<T>` that any caller can use for any endpoint)
- Wires resilience scoped to "the backend" rather than "this specific backend"

Each of those is fine when there is one backend. Each becomes a bug when there are three: a holdemfoldem outage looks like a gcp3 outage to the circuit breaker; a new endpoint added to ai-text needs an env var that doesn't exist; a Clerk-authenticated route on one backend forces all backends to need auth.

## Where it appears (historical — now resolved)

- ~~[[entity-backend-client]]~~ — was the canonical example. `lib/api.ts` is now a shim over [[entity-http]] with proper per-backend resolution.
- ~~[[entity-config-validator]]~~ — now exposes a `BACKEND_URL_CONFIGS` list with all three env vars; see [[entity-config-validator#backend-urls]].
- [[entity-resilience-layer]] — circuit breaker scope was never split per-backend (still per-call). The follow-up work is to attribute retries to a specific backend in [[entity-monitoring]] events. Still open.
- [[entity-monitoring]] — events now include the hostname in the metric name (e.g. `http:localhost:8081:/api/analyze`) so retries ARE attributable to a backend. But the structured tag-shape is implicit, not explicit. Worth tightening.

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
