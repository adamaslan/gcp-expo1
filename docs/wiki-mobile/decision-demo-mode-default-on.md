---
date: 2026-05-22
type: decision
tags: [demo, auth, dev-experience]
sources: [../PHASE2_START_HERE.md, ../docs/PHASE2_STATUS.md, ../lib/mock-auth.tsx]
---

# Decision: Demo Mode Defaults On in Development

## Decision

Local development runs with `EXPO_PUBLIC_DEMO_MODE=true` by default. Real Clerk credentials are required only for staging and production builds.

## Date

Implicit in Phase 1; recorded explicitly in Phase 2 docs (~2026-04 timeframe). This page captures the rationale after the fact.

## Context

Phase 2 introduced [[entity-clerk-expo]] but the Google OAuth credentials required to drive Clerk were not yet provisioned. Without a fallback, every new developer would be blocked at sign-in. The choice was either (a) ship Phase 2 with no usable local flow, or (b) ship a mock-auth path that satisfies the same React context surface.

Demo mode is option (b), implemented in [`lib/mock-auth.tsx`](../lib/mock-auth.tsx) and gated by `EXPO_PUBLIC_DEMO_MODE`.

## Alternatives considered

- **Require real Clerk keys to run locally.** Rejected — onboarding tax too high; every developer would need a personal Clerk dev instance or a shared one with leaked keys.
- **Use Clerk's test mode.** Possible but still requires a Clerk account and a publishable key. Doesn't help the "fresh clone" case.
- **Stub at the network layer instead of the auth provider.** Rejected — would require mocking Clerk's React context shape anyway; same code, more layers.

## Consequences

**Enables:**
- `git clone && npm install && npm start` works on day one
- Local development continues when Clerk has an outage
- E2E tests can run without provisioning real auth

**Rules out / risks:**
- **Silent activation in production** if the EAS build profile doesn't pin `EXPO_PUBLIC_DEMO_MODE=false`. See [[entity-demo-mode#known-failures]].
- Tests written against demo mode don't exercise the real Clerk SDK — a class of bugs (token format, expiry handling, refresh flow) is invisible to local CI.
- Demo mode bypasses [[entity-config-validator]] checks for Clerk env vars, which weakens the validator's signal.

## Validated by

No incidents yet. The decision will be validated (or invalidated) by:
- Whether a production build is ever observed running in demo mode → if yes, this decision was wrong without a runtime guardrail
- Whether Clerk-integration bugs reach production despite passing local QA → if yes, demo mode has hidden too much

## See also

- [[entity-demo-mode]]
- [[entity-clerk-expo]]
- [[entity-config-validator]]
