---
date: 2026-05-22
type: entity
tags: [resilience, retry, circuit-breaker, mobile]
sources: [../lib/resilience/network-resilience.ts, ../lib/resilience/rate-limiter.ts, ../PHASE4_PHASE5_COMPLETION.md]
---

# Entity: Resilience Layer (`lib/resilience/`)

Network resilience primitives delivered in Phase 4–5. Three files: `network-resilience.ts` (retries + circuit breaker), `rate-limiter.ts` (client-side throttle), `auth-logger.ts` (structured auth-flow events). Lives at [`lib/resilience/`](../lib/resilience/).

## What it is

A vendor-free implementation of three patterns:

- **Retry with backoff** — exponential, jittered, capped attempt count, only on network errors and 5xx
- **Circuit breaker** — opens after N consecutive failures, half-opens after a cooldown, closes on first success
- **Rate limiter** — token-bucket throttle to keep the client under a backend's per-IP cap (relevant for ai-text's `/api/chat`, which is 60/min)

It is intentionally not a generic library. It encodes the mobile app's policy choices: which errors retry, which don't, how long to wait, and what to log.

## Where used

- [[entity-backend-client]] — `fetchBackend` is intended to be wrapped per-call (not yet wired everywhere)
- [[entity-monitoring]] — `auth-logger.ts` feeds structured events to the monitoring sink
- Planned: one circuit breaker **per backend** (gcp3, holdfold, aitext) so a gcp3 outage doesn't break Hold/Fold

## Policy

| Concern | Setting |
|---------|---------|
| Retry on 4xx | **Intended: never. Actual: yes** — see contradiction below |
| Retry on 5xx | Yes, up to 3 attempts |
| Retry on network error | Yes, up to 3 attempts |
| Backoff base | 500ms |
| Backoff jitter | ±25% |
| Circuit threshold | 5 consecutive failures |
| Circuit cooldown | 30s |
| Timeout — list endpoints | 5s |
| Timeout — agent run endpoints | 30s |

(Values verified against [`lib/resilience/network-resilience.ts`](../lib/resilience/network-resilience.ts) — if they drift, update this page.)

## Known failures

> ⚠️ Contradiction (found 2026-07-30): this page says **"Retry on 4xx: Never"**
> and claims the values were verified against the source. The code does not do
> that. `withRetry`'s default predicate is
> `shouldRetry = (error) => !error.message.includes("validation")` —
> i.e. it retries **every** error whose message doesn't happen to contain the
> string "validation", including 4xx, and including **429**. Callers that don't
> pass an explicit `shouldRetry` get up to 3 attempts against a rate-limited or
> quota-exhausted backend.
>
> This matters beyond correctness: retrying a quota error *consumes the budget
> that is already exhausted*, converting one rejected request into three. See
> [[concept-free-tier-resilience]] — the portal hit exactly this class of
> failure on 2026-07-30 with an account-wide daily cap.
>
> Fix direction: make the default predicate opt-*in* to retry (network errors
> and 5xx only) rather than opt-out by substring match, and treat 429 as
> terminal unless a `Retry-After` says otherwise.

Beyond the above, no runtime failures recorded — resilience landed in Phase 4–5 but the integration with [[entity-backend-client]] is partial. Failures will surface once real backend traffic is flowing in production.

## Open questions

- Is the circuit breaker scoped per-backend or per-endpoint? [[../MULTI_BACKEND_INTEGRATION.md]] Step 7 says per-backend; the code today is per-call. Reconcile.
- What happens to in-flight retries when the app backgrounds on iOS? React Native's fetch is not guaranteed to survive a backgrounded JS thread.
- Should the rate limiter share state across screens? Currently each component holds its own.

## See also

- [[entity-backend-client]] — the thing being wrapped
- [[entity-monitoring]] — the observer
- [[concept-single-backend-assumption]] — once we have three clients, the circuit breaker scope matters
