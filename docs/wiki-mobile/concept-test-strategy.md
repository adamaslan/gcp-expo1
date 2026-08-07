---
date: 2026-07-30
type: concept
tags: [testing, quality, confidence, gap, expo, smoke]
sources: [../../package.json, ../../scripts/smoke-backends.ts, nuwrrrld-portal/vitest.config.ts]
---

# Concept — Test Strategy (Currently: None)

This page documents an absence honestly rather than describing an aspiration.
**The mobile app has no test framework and no test files.** Recording that as a
concept page — with the shape of what should exist — is more useful than
leaving the gap undocumented and rediscovering it every few months.

## The pattern

Today the pattern is **manual verification plus one backend smoke script**.

- `npm run smoke` → `npx ts-node scripts/smoke-backends.ts` — checks that the
  three backends (gcp3, holdfold, aitext) are reachable and shaped as expected.
  This is a *connectivity* probe, not a test suite: it validates the world, not
  this app's logic.
- `npm run gen:types` regenerates `lib/clients/*.types.ts` from each backend's
  live OpenAPI schema. This is the closest thing to a contract test the repo
  has — a backend that changes shape produces a type error at build time
  rather than a runtime surprise. It is genuinely valuable and underrated as a
  correctness mechanism ([[decision-no-handrolled-types]]).
- Everything else is verified by running the app.

There is no `jest`, `vitest`, `@testing-library/react-native`, `detox`, or
`maestro` in `package.json` — neither dependencies nor devDependencies.

## What should exist (and why, in this order)

The portal's three-layer split
(`nuwrrrld-portal/docs/wiki-portal/concept-test-strategy.md`) is a reasonable
template, but mobile should not copy it wholesale — the value is concentrated
differently here.

1. **Pure-logic unit tests first.** The highest-value targets are the modules
   that already exist as platform-agnostic logic and are *supposed* to be
   byte-identical with the portal: `lib/subscription.ts`, `lib/retention.ts`,
   `lib/portfolio.ts`, `lib/shared/*`. These need no React Native runtime, no
   device, and no emulator — plain Vitest in a `node` environment works.
   Testing them here also creates a **drift detector**: if mobile and portal
   run the same assertions against modules meant to be identical, divergence
   fails a test instead of silently accumulating
   ([[concept-sync-requirements]] §1).
2. **Resilience-policy tests.** [[entity-resilience-layer]] encodes real policy
   choices — which errors retry, backoff shape, circuit-breaker thresholds.
   That is pure logic with branchy edge cases and is exactly what unit tests
   are good at. It currently has none.
3. **Client/adapter tests with stubbed fetch.** `lib/clients/*` and the digest
   adapters carry the field-mapping logic flagged in
   [[overview#open-issues|open-issue #6]]. Stubbed-fetch tests would pin the
   mapping and make the portal↔mobile adapter divergence concrete.
4. **Component tests last.** React Native component testing needs more setup
   for less marginal safety than the three layers above. Worth doing, but not
   first.
5. **Device/E2E (Detox/Maestro) only if a real flow keeps breaking.** High
   maintenance cost; defer until there's evidence it's needed.

A pragmatic starting point is Vitest in `node` for items 1–3, since it requires
no RN test renderer and matches the portal's tooling — which keeps the shared
modules' tests genuinely portable between repos.

## Where it appears

- `package.json` — `smoke` and `gen:types`; note the absence of any `test` script
- `scripts/smoke-backends.ts` — the backend reachability probe
- `lib/clients/*.types.ts` — generated types, the de facto contract check
- `lib/resilience/` — the untested policy code ([[entity-resilience-layer]])
- `lib/subscription.ts`, `lib/retention.ts`, `lib/portfolio.ts` — the
  cross-surface modules where tests would double as drift detection

## Contradictions / tensions

> ⚠️ Contradiction: [[concept-backend-is-source-of-truth]] argues correctness
> flows from the backend contract, and `gen:types` genuinely enforces that at
> the boundary. But the *adapters* that translate those types into UI shapes
> (`digest.ts`, `signalCard.ts`) are hand-written, divergent from the portal's,
> and completely untested — so the one place the backend contract stops
> protecting us is the one place with no coverage at all.

> ⚠️ Contradiction: `lib/subscription.ts`, `lib/retention.ts`, and
> `lib/portfolio.ts` are counted as **✅ Synced / byte-identical** on
> [[concept-mobile-web-parity]], yet nothing verifies that claim on this side.
> The portal has tests for its copy; mobile has none for the module it is
> supposed to match. Parity is asserted, not enforced — and portal PR #45 drifted
> `subscription.ts` without anything here noticing.

> ❓ Open question: should mobile's tests for shared modules be *the same file*
> as the portal's (imported from a shared location) rather than a parallel copy?
> A duplicated test suite drifts exactly like duplicated source. Unresolved,
> and it depends on the still-unanswered shared-package question in
> [[concept-sync-requirements]].

> ❓ Open question: is there a CI runner for this repo at all? No workflow
> directory was found during this assessment, so even if tests existed there is
> currently nothing to run them on merge.

## See also

- [[concept-sync-requirements]] — the de-drift work tests would protect
- [[concept-mobile-web-parity]] — the parity claims currently unverified here
- [[entity-resilience-layer]] — highest-value untested logic
- [[decision-no-handrolled-types]] — why generated types are the existing contract check
- [[concept-backend-is-source-of-truth]] — the principle, and where it stops applying
- `nuwrrrld-portal/docs/wiki-portal/concept-test-strategy.md` — the portal's three-layer suite
