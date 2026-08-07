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
| `lib/shared/prefs.ts` | Diff the two copies; reconcile to one. Already lives in `shared/` on both sides, so it should be the *easiest* to fix and is the most embarrassing to leave drifted. |
| `lib/shared/signalFilters.ts` | Reconcile filter predicates so a "watchlist"/"muted" filter means the same thing on both surfaces. |
| `lib/shared/signal-policy.ts` | New on the portal (PR #40), mobile-absent. Pure ticker validation / cache-freshness / backoff. **Adopt before mobile writes its own**, so it never drifts to begin with. |
| `lib/shared/live-price.ts` | New on the portal (PR #40), mobile-absent. Pure live-price parse/validate; share if mobile consumes `/api/signals/live`. |
| `lib/shared/holdfold-map.ts` | New on the portal (PR #46), mobile-absent. Pure `/signals`→verdict mapper. **Not a drop-in adopt** — our `clients/holdfold.ts` targets a different backend (`EXPO_PUBLIC_HOLDFOLD_BACKEND_URL`) with a different verdict schema entirely (`symbol`/`risk_level`/`volatility_regime`/`atr` vs. this module's `ticker`/`confidenceLabel`/`bias`/`adx`). Adopting it means switching our Hold/Fold backend first, not just importing a file. |
| `lib/digest.ts` | Resolve the `adaptLiveSignals` error-handling split (throw vs. null) and field mappings flagged in [[overview#open-issues|open-issue #6]] and [[entity-signals-digest#open-questions]]. Pick one adapter; move it to `lib/shared/`. |
| `lib/signalCard.ts` | Reconcile card-shape derivation so a signal renders identically. Move to `lib/shared/`. |
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
| **Signal cache/queue + drain** (portal PR #40) | Portal's watchlist-add enqueues a `pending_signals` refresh drained into `signal_cache`. Mobile could call the same `/api/signals/live`/cached data or stay backend-live. `lib/shared/signal-policy.ts` (ticker validation, cache-freshness, backoff) is a **prime module to adopt as-is** rather than reimplement. |
| **Real-time price tier** (portal PR #40) | Portal added a Finnhub WS → `/api/signals/live` → `live_prices` lane. Mobile needs either a `clients/` call to `GET /api/signals/live` for sub-second quotes, or a decision that live quotes stay web-only. `lib/shared/live-price.ts` parsing is reusable. |
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
2. `lib/shared/prefs.ts` + `signalFilters.ts` de-drift — already in `shared/`, low effort, high symbolic value. **Next up** in the `/sync-pr` batch (`nuwrrrld-portal/docs/sync-pr-large-scale-run.md`).
3. `digest.ts` + `signalCard.ts` de-drift — resolves standing open-issue #6.
4. Add a drift-detection CI gate so `lib/shared/` can't silently diverge again.
5. Record the AI Council convergence decision.
6. Port observability (analytics/Sentry) to portal; port backtest to mobile (or decide against).

## Where it appears

This page is the actionable half of the parity pair — where
[[concept-mobile-web-parity]] measures, this one plans. The work it describes
lands in:

- `lib/shared/` in both repos — the target destination for every §1 de-drift
  item, and the folder whose portal-only files (`signal-policy.ts`,
  `live-price.ts`, `holdfold-map.ts`) generate most of the current gap.
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
