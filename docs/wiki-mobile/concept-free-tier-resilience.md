---
date: 2026-07-30
type: concept
tags: [free-tier, cost, resilience, gcp, quota, budget, backends]
sources: [../COST_OPTIMIZATION_5_DOLLAR.md, ../../lib/resilience, ../../lib/clients, nuwrrrld-portal/lib/openrouter.ts]
---

# Concept — Staying Robust on a Free Tier

Both surfaces run at effectively $0 marginal cost, but along **different axes**,
and the distinction matters when reasoning about failure.

- **Portal:** free *model* inference — OpenRouter `:free` models, capped by a
  request quota.
- **Mobile:** free *infrastructure* — GCP always-free tiers, capped by
  scheduler jobs and Firestore operations. Mobile does no direct model
  inference; it calls backends that do.

This page covers the mobile side and the shared discipline.

## The pattern

**Scale to zero, pay for the bake.** Cloud Run idles at $0, and Firestore
charges per document operation rather than per byte, so cache hits are
essentially free at this scale. The steady ~$5/mo is almost entirely
**scheduler-driven**: nightly bake jobs consuming Cloud Run CPU-seconds and
Firestore writes. User traffic at 10–100 DAU adds pennies. The consequence is
counter-intuitive but load-bearing: **cost scales with cron frequency, not with
users.** Optimizing user-path efficiency saves almost nothing; changing bake
cadence changes the bill.

**Live inside the always-free quotas deliberately.** The quotas are treated as
a design constraint, not a happy accident — e.g. Cloud Scheduler's 3-free-job
allowance against gcp3's 5 jobs, where the 2 overflow jobs are a known, priced
decision rather than a surprise. See `../COST_OPTIMIZATION_5_DOLLAR.md`.

**Absorb transient backend failure on the client.** Because mobile depends on
three separate backends (gcp3, holdfold, aitext), a free-tier backend that
cold-starts or throttles is normal, not exceptional.
[[entity-resilience-layer]] encodes the response: jittered exponential retry on
network errors and 5xx only, a circuit breaker, and client-side rate limiting.
This is mobile's structural equivalent of the portal's model-fallback chain —
redundancy against a flaky free dependency.

**Degrade to something honest.** [[entity-demo-mode]] and the cached-read paths
mean a backend outage yields stale-or-mock data with an indication, rather than
a crash — the mobile expression of the portal's
`nuwrrrld-portal/docs/wiki-portal/concept-graceful-degradation.md`.

## The shared lesson from the portal's 2026-07-30 outage

The portal discovered that OpenRouter's free tier caps the **API key**, not the
model: 50 requests/day across all free models. Every model 429s at once, so
model-level redundancy provides no protection at all.

The transferable principle: **enumerate which of your free-tier limits are
per-resource and which are per-account.** Redundancy only helps against the
former. Mobile's exposure to the same class of problem:

- Firestore free-tier operations are a **per-project** daily quota shared by
  every client and every bake job — the same correlated-failure shape.
- Cloud Scheduler's free-job allowance is per-project, not per-job.
- The three backends are independent for *availability* but may share a GCP
  project for *quota* — a distinction the circuit breaker cannot see, since it
  scopes to network failure, not quota exhaustion.

## Concrete hardening (highest value first)

1. **Stop retrying 429s.** *Confirmed 2026-07-30 — this is live, not
   hypothetical.* `withRetry`'s default predicate in
   `lib/resilience/network-resilience.ts:22` is
   `shouldRetry = (error) => !error.message.includes("validation")`, which
   retries **every** error not containing that substring — 4xx and 429
   included — up to 3 attempts. So a quota-exhausted backend gets hit three
   times instead of once, spending the budget that is already gone.
   [[entity-resilience-layer]]'s policy table claims "Retry on 4xx: Never";
   the code disagrees. Invert the default to opt-in (network + 5xx only) and
   treat 429 as terminal unless `Retry-After` says otherwise.
2. **Scope the circuit breaker per backend.** Already flagged as an open
   question on [[entity-resilience-layer]] — a gcp3 quota problem shouldn't
   trip Hold/Fold. Quota exhaustion makes this more urgent than plain outages did.
3. **Surface budget state, don't just absorb it.** [[entity-monitoring]] should
   record quota-shaped failures distinctly, so "we're rate-limited" is visible
   rather than looking like flakiness.
4. **Keep bake cadence under review.** It is the actual cost driver; a cadence
   change is worth more than any client-side optimization.

## Where it appears

- `../COST_OPTIMIZATION_5_DOLLAR.md` — the cost model, free-tier table, and
  where the ~$5 actually goes
- `lib/resilience/` — retry, circuit breaker, rate limiter
  ([[entity-resilience-layer]])
- `lib/clients/` — the three backend clients whose free-tier behavior this
  absorbs ([[entity-backend-client]], [[concept-single-backend-assumption]])
- [[entity-demo-mode]] — the honest-degradation fallback

## Contradictions / tensions

> ⚠️ Contradiction (verified in code, 2026-07-30): the resilience layer is
> *described* as retrying only availability failures (network, 5xx), but
> `network-resilience.ts:22` defaults to retrying everything except errors
> whose message contains "validation". Retry is the correct response to an
> outage and an actively harmful response to a quota failure — it consumes the
> exhausted budget faster. The layer does not distinguish them, and
> [[entity-resilience-layer]]'s policy table asserts the opposite of what the
> code does.

> ⚠️ Contradiction: [[concept-single-backend-assumption]] documents that the
> app was built assuming one backend and now has three. For cost that matters
> more than it first appears — three backends may be independent for uptime
> while sharing a single project-level quota pool, so "independent backends"
> is true for outages and possibly false for budget.

> ❓ Open question: does mobile ever call an LLM path that lands on the
> portal's OpenRouter free tier (via aitext/`ragChat`), and therefore inherit
> the portal's 50/day account cap? If the council tap-in shares that budget,
> mobile has an undocumented dependency on a quota it cannot see. Unresolved —
> depends on how the ai-text backend sources its inference.

## See also

- [[entity-resilience-layer]] — retry/circuit-breaker policy
- [[entity-demo-mode]] — degradation when a free backend is unavailable
- [[concept-single-backend-assumption]] · [[entity-backend-client]] — the multi-backend shape
- [[concept-council-tap-in]] — the cost framing behind the lightweight council
- [[concept-test-strategy]] — testing the policy code this page relies on
- `nuwrrrld-portal/docs/wiki-portal/concept-free-tier-resilience.md` — the portal counterpart (model quota, not infra quota)
