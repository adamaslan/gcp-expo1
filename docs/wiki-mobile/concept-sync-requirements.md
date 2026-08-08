---
date: 2026-07-24
type: concept
tags: [sync, parity, requirements, roadmap, mobile, web, shared]
sources: [../../lib, ../../lib/shared, ../../screens, nuwrrrld-portal/lib]
---

# Concept — What Each Surface Needs to Sync

Companion page: [[concept-mobile-web-parity]] — the current ~62% measurement this
page is a plan to raise. Portal mirror:
`nuwrrrld-portal/docs/wiki-portal/concept-sync-requirements.md`.

## The pattern

Closing the parity gap is not one project — it is three distinct kinds of work,
each with a different owner and risk profile:

1. **De-drift** existing duplicated modules (make "shared" actually shared).
2. **Port** features that exist on only one surface to the other (or record a
   decision that they intentionally stay single-surface).
3. **Converge** the one architecturally divergent domain (the AI Council) or
   formally split it.

Everything below is framed as: *what has to be true for the domain to count as
synced.*

## 1. De-drift — promote to a real single source

These modules are duplicated by filename but have drifted. The target end-state is
one copy in `lib/shared/`, imported by both repos (via a shared package, git
subtree, or the `nuwrrrld-fullstack` skill's single-sourcing workflow). This is
[[concept-backend-is-source-of-truth]] applied to client logic.

| Module | What's needed |
|--------|---------------|
| ~~`lib/subscription.ts`~~ | **Done — our PR #29 (2026-08-07).** Ported `parseSubscriptionMetadata()` verbatim from the portal copy; confirmed byte-identical by diff. See [[entity-billing]] and `nuwrrrld-portal/docs/wiki-portal/incident-2026-07-27-stripe-checkout-invalid-header.md`. |
| ~~`lib/shared/prefs.ts`~~ | **Done — portal PR #50 (2026-08-07).** Confirmed to differ only on the intended localStorage/SecureStore storage-backend seam; reclassified ✅ Aligned rather than edited. |
| ~~`lib/shared/signalFilters.ts`~~ | **Done — portal PR #50 (2026-08-07).** Quote-style drift reconciled; only the `@/lib/digest` vs `../digest` import-path seam remains, tracked by the drift gate. |
| ~~`lib/shared/signal-policy.ts`~~ | **Done — our PR #32 (2026-08-08).** Adopted verbatim (pure ticker validation / cache-freshness / backoff) before we grew our own copy. Byte-identical, tracked by the drift gate. Not consumed by a feature here yet — see §2's Signal cache/queue row. |
| ~~`lib/shared/live-price.ts`~~ | **Done — our PR #32 (2026-08-08).** Adopted verbatim (pure live-price row/batch parsing). Byte-identical, tracked by the drift gate. We don't call `/api/signals/live` yet — see §2's Real-time price tier row. |
| `lib/shared/holdfold-map.ts` | New on the portal (PR #46), mobile-absent. Pure `/signals`→verdict mapper. **Not a drop-in adopt** — our `clients/holdfold.ts` targets a different backend (`EXPO_PUBLIC_HOLDFOLD_BACKEND_URL`) with a different verdict schema entirely (`symbol`/`risk_level`/`volatility_regime`/`atr` vs. this module's `ticker`/`confidenceLabel`/`bias`/`adx`). Adopting it means switching our Hold/Fold backend first, not just importing a file. |
| ~~`lib/digest.ts`~~ | **Logic done — our PR #30 + portal PR #51 (2026-08-07).** Fixed a real ticker-precedence bug in portal's copy (contradicted its own comment); ported portal's `dataQualityScore` here. Both copies confirmed byte-identical. Still open: physically moving the file into `lib/shared/` — a bigger, lower-priority restructuring, not required for parity. Resolves [[overview#open-issues\|open-issue #6]] and [[entity-signals-digest#open-questions]]. |
| ~~`lib/signalCard.ts`~~ | **Logic done — same PRs.** We adopted portal's `_baseAppUrl` unused-param convention; portal adopted our `encodeURIComponent(signal.id)`. Move to `lib/shared/` still open, same as `digest.ts`. |
| `lib/nuai.ts` | Reconcile chat contract (token budget, refusal guardrails, prompt-chip grounding — see [[entity-nuai]]). Ensure request/response types match the portal `/api/nuai`. |

**Definition of done:** each file exists once in `lib/shared/`, is byte-identical
as consumed by both repos, and CI fails if the two copies drift (a checksum/diff
gate).

## 2. Port — one-surface features

### Portal has, mobile lacks
| Feature | To sync mobile needs… |
|---------|----------------------|
| **Backtest** | A mobile screen + a `clients/` call hitting the portal `/api/backtest/[symbol]`, or a decision that backtest stays web-only (heavier UI, desktop-first). |
| **Watchlist store** | Confirm [[entity-portfolio|usePortfolio]]'s watchlist and the portal's `watchlist-store.ts` agree on shape and persistence; ideally share the store logic. |
| **Hold/Fold cache** | Decide whether mobile should read the portal's cached verdicts or keep calling the holdemfoldem backend live. Today portal caches; mobile does not. |
| **Signal cache/queue + drain** (portal PR #40) | Portal's watchlist-add enqueues a `pending_signals` refresh drained into `signal_cache`. `lib/shared/signal-policy.ts` (ticker validation, cache-freshness, backoff) is now shared (our PR #32) — we have the pure logic but not the queue/cache feature built on top of it. |
| **Real-time price tier** (portal PR #40) | Portal added a Finnhub WS → `/api/signals/live` → `live_prices` lane. `lib/shared/live-price.ts` parsing is now shared (our PR #32) — we still need either a `clients/` call to `GET /api/signals/live` for sub-second quotes, or a decision that live quotes stay web-only. |
| **Public council demo + share cards** (portal PR #43) | Portal-only by nature — a growth/marketing surface, not core product. If mobile ever wants an app-store-listing teaser or a deep-link share flow, copy the pattern: ticker-only input (no free text from anonymous callers), fail-closed quota, cache-then-quota ordering. |
| **Daily Brief** (`/api/brief`, portal PR #46) | Grounded, structured (market overview + Hold/Fold verdicts), 4-sentence one-shot completion — cheap and fast (~0.5–1.3s to gather data) vs. our `BriefingScreen`'s full long-term council prompt. To offer this lighter format here we'd first need a Hold/Fold data source normalized to the portal's verdict shape (see §1's `holdfold-map.ts` row) — not a simple port. |

### Mobile-only performance note (not a port item)

Our own `getMarketOverview()` (`lib/clients/gcp3.ts`) fetches `/market-overview`
with no `sections=` param on every `BriefingScreen` load — the same ~16.4s
unscoped call portal PR #46 just fixed on its side by adding
`?sections=brief`. We do need more than just `brief` (`MacroPulseCard` reads
beyond it), but if we don't actually use the `history` section (the most
expensive one per the backend's `days` param), scoping to something like
`sections=brief,ai_summary,sentiment` would likely cut this well below 16s
with no behavior change. Worth a quick profiling pass before assuming the
full fetch is load-bearing.

### Mobile has, portal lacks
| Feature | To sync portal needs… |
|---------|----------------------|
| **Onboarding** (`OnboardingScreen`) | A first-run/onboarding flow in the portal, or a decision that web onboarding is handled by the marketing/landing site — portal PR #42 substantially strengthened that landing site (plain-language copy, brand-aligned tokens, a fixed market-data bug, scroll/parallax motion), making "the landing page is portal's onboarding" a more credible answer than before, though still undecided. |
| **Analytics + Sentry** (`analytics.ts`, `sentry.ts` — [[entity-monitoring]]) | The portal has no client analytics/error-reporting module found. Add equivalents (Vercel Analytics + Sentry Next.js SDK) for observability parity. |
| **Schwab health** (`schwab-health.ts`) | A portal health check for the Schwab integration, if that integration is meant to surface on web. |

## 3. Converge — the AI Council

The flagship is the least synced domain and needs an explicit decision, not a
silent port:

- **Mobile**: [[entity-council-composer]] builds prompts and calls the ai-text RAG
  backend (`ragChat()`); tap-in only, per [[concept-council-tap-in]].
- **Portal**: self-contained 6-seat OpenRouter `:free` deliberation, server-side,
  with compile-time grounding.

**What's needed:** a recorded `decision-*.md` (on both wikis) answering — do the
surfaces converge on the portal's OpenRouter engine (mobile calls a portal
`/api/council/*` endpoint), or do they stay deliberately different (deep desktop
deliberation vs. lightweight mobile tap-in)? Until that decision exists, "council
parity" is undefined and should not be counted for or against the sync %.

## Priority order (highest ROI first)

1. ~~`lib/subscription.ts` de-drift~~ — **done, our PR #29 (2026-08-07)**.
2. ~~`lib/shared/prefs.ts` + `signalFilters.ts` de-drift~~ — **done, portal PR #50 (2026-08-07)**.
3. ~~`digest.ts` + `signalCard.ts` de-drift~~ — **done, our PR #30 + portal PR #51 (2026-08-07)**. Resolved standing open-issue #6.
4. ~~Add a drift-detection CI gate so `lib/shared/` can't silently diverge again.~~ — **done, our PR #33 + portal PR #52 (2026-08-08).** (An earlier PR #31 attempting this went stale — its content had landed on `main` via other PRs by the time it was reviewed — and was closed in favor of #33, rebased clean.) Original `/sync-pr` batch closed out.
5. ~~Adopt `lib/shared/signal-policy.ts` + `live-price.ts` before we reimplement them.~~ — **done, our PR #32 (2026-08-08).** Byte-identical, tracked by the drift gate. Neither is consumed by a feature here yet — that's still #6/#7 below.
6. Record the AI Council convergence decision.
7. Port observability (analytics/Sentry) to portal; port backtest to mobile (or decide against). Wire ourselves up to consume `signal-policy.ts`/`live-price.ts` if the real-time signal tier is ever ported.

## Where it appears

This page is the actionable half of the parity pair — where
[[concept-mobile-web-parity]] measures, this one plans. The work it describes
lands in:

- `lib/shared/` in both repos — the target destination for every §1 de-drift
  item. `holdfold-map.ts` remains the one portal-only file generating share-debt;
  `signal-policy.ts` and `live-price.ts` were adopted here in our PR #32.
- `lib/subscription.ts`, `lib/digest.ts`, `lib/signalCard.ts`, `lib/nuai.ts` —
  the duplicated-by-filename modules §1 tracks.
- `lib/clients/` — where the divergent Hold/Fold and council integrations that
  block several §1 items actually live on this surface.
- The `nuwrrrld-fullstack` skill — the intended mechanism for single-sourcing
  cross-surface business logic.

## Contradictions / tensions

> ❓ Open question: is there a shared package (npm workspace / git subtree) planned,
> or does "shared" mean "manually kept in sync"? Manual sync is why `prefs.ts` and
> `signalFilters.ts` already drifted. The de-drift work in §1 is wasted without a
> mechanism to keep them identical.

## See also

- [[concept-mobile-web-parity]] — the measurement this page targets
- [[concept-backend-is-source-of-truth]] — the principle behind §1
- [[entity-signals-digest]] · [[entity-nuai]] · [[entity-portfolio]] · [[entity-council-composer]] · [[entity-billing]]
- [[overview#open-issues]] — open-issue #6 (adapter divergence)
- `nuwrrrld-portal/docs/wiki-portal/concept-sync-requirements.md` — the portal mirror
