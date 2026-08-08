---
date: 2026-07-24
type: concept
tags: [sync, parity, mobile, web, cross-surface, shared]
sources: [../../lib, ../../lib/shared, ../../screens, nuwrrrld-portal/lib, nuwrrrld-portal/app]
---

# Concept — Mobile ⇄ Web Parity (% Synced)

Companion page: [[concept-sync-requirements]] — the concrete work each surface
needs to close the gap. Portal mirror:
`nuwrrrld-portal/docs/wiki-portal/concept-mobile-web-parity.md`.

## The pattern

NuWrrrld Financial ships as **two surfaces over one product**: this Expo/React
Native app (`gcp3-mobile`) and the Next.js 16 portal (`nuwrrrld-portal`). Both
authenticate with Clerk, entitle off `publicMetadata.subscription_status`, and
present the same product domains (signals, Hold/Fold, portfolio, Nu AI, the AI
Council, billing, retention). "Synced" means a feature behaves the same on both
surfaces **and** its business logic is single-sourced rather than re-implemented
per platform (per [[concept-backend-is-source-of-truth]]).

The intended sync mechanism is `lib/shared/` — a folder present in *both* repos
holding platform-agnostic modules meant to be identical. Where a module lives in
`lib/shared/` and is byte-identical across repos, that domain is truly synced.
Where the same filename exists in both `lib/` roots but has drifted, the surfaces
agree in intent but not in code.

> ℹ️ **Portal PR #42 (2026-07-24) assessed, no change.** A signed-out
> landing-page revamp (copy, brand-token alignment, a market-data parsing bug
> fix, Framer Motion/Lenis polish). Touches no `lib/shared/` module and no
> cross-surface business logic; mobile has no directly analogous public
> marketing surface (its nearest equivalent, `OnboardingScreen`, is already
> tracked below as mobile-only). Headline and matrix unchanged by this PR.

> ℹ️ **Portal PR #43 (2026-07-24) assessed, minor matrix addition, headline
> unchanged.** Landing Phase 3+4: a sticky scrollytelling council demo, a
> RISK-seat spotlight, a "how it works" section, and a no-login "ask the
> council" public demo (`/api/council/public`) with shareable OG verdict cards
> (`/api/og/verdict/[ticker]`) and public `/verdict/[ticker]` pages. Reuses the
> existing portal-only AI Council stack (`lib/openrouter.ts`) — no
> `lib/shared/` file touched — so single-source parity is unchanged. Added a
> matrix row since it's a real, if portal-only, extension of the AI Council
> surface (unauthenticated growth/demo, not full deliberation).

> ⚠️ **Portal PR #45 (2026-07-27) assessed — new drift in a previously-identical
> module.** A Stripe checkout production incident fix on the portal side
> (malformed `STRIPE_SECRET_KEY` threw unhandled inside
> `stripe.checkout.sessions.create`, plus Clerk serving a dev-instance key on
> the production domain — see
> `nuwrrrld-portal/docs/wiki-portal/incident-2026-07-27-stripe-checkout-invalid-header.md`):
> defensive try/catch on the Stripe SDK calls, `/api/health` checks for both
> misconfig classes, and a new `parseSubscriptionMetadata()` added to the
> **portal's** `lib/subscription.ts` only. This file was previously
> byte-identical with mobile's copy (per the matrix row below) — porting the
> same function here is the single lowest-effort de-drift item on
> [[concept-sync-requirements]] §1. No feature-domain change; single-source
> parity nudges down slightly.

> ℹ️ **Portal PR #48 (2026-08-06) assessed — CI/lint infra only (env-schema validator, CI test job, eslint flat-config fix). No feature-domain or shared-code changes. Headline unchanged at ~60%.**

> ✅ **Our PR #29 (2026-08-07) — de-drifts `lib/subscription.ts`, first item of [[concept-sync-requirements]] §1.** Ported `parseSubscriptionMetadata()` verbatim from the portal's copy, closing the drift portal PR #45 introduced. Confirmed byte-identical by diff post-port. Single-surface PR on our side only — portal already had this code, so no portal PR was needed for this item.

> ✅ **Portal PR #50 (2026-08-07) — de-drifts `lib/shared/signalFilters.ts` and confirms `lib/shared/prefs.ts`, item #2 of [[concept-sync-requirements]] §1.** Their `signalFilters.ts` had drifted by quote style only; standardized on our single-quote convention, leaving only the necessary import-path seam (our `@/` alias is unconfigured — a separate, pre-existing bug, not sync-batch scope). `prefs.ts` was assessed and confirmed to differ *only* on the intended localStorage/SecureStore storage-backend seam — reclassified to ✅ Aligned rather than edited, since byte-identity there would break the platform split by design. Single-surface fix on their side only — we needed no change.

> ✅ **Our PR #30 + portal PR #51 (2026-08-07) — de-drift `lib/digest.ts` (`adaptLiveSignals`) and `lib/signalCard.ts`, resolving open-issue #6, item #3 of [[concept-sync-requirements]] §1.** Real functional drift, not formatting: portal's ticker-precedence code contradicted its own comment claiming the map key is authoritative — our precedence was actually correct and portal was fixed to match. Portal's `dataQualityScore` field (backend-reported freshness) is now ported here too, since both adapters target the same GCP3 `/signals` API. Our more defensive entry-filtering and trimmed/filtered indicators/reasons were adopted by portal. `signalCard.ts`: portal adopted our `encodeURIComponent(signal.id)` fix; we adopted their `_baseAppUrl` unused-param convention. Both files confirmed byte-identical post-merge. First dual-surface (two-PR) item in this batch.

> ⚠️ **Portal PR #46 (2026-07-30) assessed — new portal-only `lib/shared/`
> module, same pattern as portal PR #40.** Fixed the portal's `/api/brief`:
> it was calling a nonexistent `/holdfold` endpoint (always 404→null) and
> fetching `/market-overview` without `sections=brief` (16.4s against a 6s
> timeout, always null), so on every request the model was told to "cite
> specific indices, percentages, or verdicts" with none actually fetched —
> and wrote briefs narrating their own missing data. Fix extracts the
> `/signals`→verdict mapping into **`lib/shared/holdfold-map.ts`** on the
> portal side — but this app's `clients/holdfold.ts` hits a *different*
> backend entirely (`EXPO_PUBLIC_HOLDFOLD_BACKEND_URL`, not gcp3) with an
> incompatible verdict shape (`symbol`/`risk_level`/`volatility_regime`/`atr`
> vs. portal's `ticker`/`confidenceLabel`/`bias`), so this module isn't
> portable here as-is — it's a fourth portal-only `lib/shared/` file (after
> `signal-policy.ts`, `live-price.ts`; see the contradiction below).
> Separately, this assessment surfaced that `BriefingScreen`
> (`buildLongTermPrompt` composing live `getMarketOverview()` +
> `getMacroPulse()` + `getSignals()` into a council prompt) was never in this
> matrix despite being architecturally analogous to portal's `/api/brief` —
> added as its own row, 🔴 Divergent (not a feature gap, both surfaces have
> *a* brief, just structurally different ones). Also notable for us
> specifically: `getMarketOverview()` (`lib/clients/gcp3.ts`) still fetches
> the **unscoped** `/market-overview` on every `BriefingScreen` load — the
> same ~16s-vs-~0.5s cost portal PR #46 just fixed on its side. We do need
> more sections here (`MacroPulseCard` reads beyond `brief`), but scoping to
> just what we render (probably `sections=brief,ai_summary,sentiment`,
> skipping `history`) is worth profiling — see
> [[concept-sync-requirements]] §2.

> ℹ️ **Our PR #32 (2026-08-08) assessed — tsc baseline fix, one bundled shared-drift fix. Headline unchanged at ~64%.** Resolved all 38 pre-existing `npx tsc --noEmit` errors on this repo's baseline: missing `@/*` path alias in tsconfig.json, `@vercel/node` types on `api/*.ts` (these are Vercel functions, not Next.js), missing `expo-notifications`/`svix` dependencies, deleted three dead components importing a nonexistent `../backend/schemas/signal` module, plus real type-safety fixes in `lib/api.ts` (generic `getMarketData<T>()`) and `lib/auth-provider.tsx` (`isSignedIn` undefined→null coercion) — same infra-only class as portal PR #48. Also bundled a portal PR #52 CodeRabbit-review fix ported here to `lib/digest.ts`: `symbolKey || entry.symbol` never fell back to `entry.symbol` for whitespace-only keys because `symbolKey` (an object key) is always truthy — now trimmed first. Confirmed byte-identical with the portal's copy post-fix; `scripts/check-shared-drift.mjs` passes. Not a parity-percentage move (bugfix keeping an already-✅-Synced file in sync), but worth noting since it's a real correctness fix, not just formatting.

## Headline: ~64% synced (2026-08-07, after our PR #30 + portal PR #51)

Two different denominators, deliberately kept separate:

- **Feature-domain parity ≈ 82%** — 9 of 11 shared product domains exist and
  work on both surfaces; only the AI Council is architecturally divergent, and
  one domain (Nu AI) has a drifted implementation (Signals/Digest moved to
  Synced this round). Unchanged by portal PR #40 (which added depth, not a new
  shared domain).
- **Single-source (code-identical) parity ≈ 41%** (was ~39%) — our PR #29
  ported `parseSubscriptionMetadata()`; portal PR #50 reconciled
  `signalFilters.ts` and confirmed `prefs.ts`'s seam; our PR #30 + portal PR
  #51 de-drifted `digest.ts`/`signalCard.ts` (open-issue #6), including a
  genuine bug fix (portal's ticker-precedence code contradicted its own
  documented intent) and porting portal's `dataQualityScore` field here.
  Still owed: portal PR #40 added a whole portal-only real-time signal tier
  (`signal-queue`, `signal-policy`, read-through `signal_cache`, `live-price` +
  `live-price-db`, `/api/signals/drain` + `/live`) with **no mobile
  counterpart**. Two of those modules (`lib/shared/signal-policy.ts`,
  `lib/shared/live-price.ts`) sit in the supposedly-shared `lib/shared/` folder
  yet exist only on the portal — share-debt we should claim before writing our
  own copies. Portal PR #46 adds a fourth portal-only file to `lib/shared/`
  (`holdfold-map.ts`) — not adoptable here without first unifying our Hold/Fold
  backend and verdict schema with the portal's.

The blended **~64%** (up from ~62%) reflects the first three completed items
of a `/sync-pr` de-drift batch (`nuwrrrld-portal/docs/sync-pr-large-scale-run.md`)
— item #4 (a drift-detection CI gate) is next. The portal still pulls ahead on
the signal/Hold-Fold data plane independent of this batch; the risk lives in
the gap between the two denominators.

## Domain parity matrix

| Domain | Mobile | Portal | Shared module | Status |
|--------|--------|--------|---------------|--------|
| **Auth (Clerk)** | `@clerk/clerk-expo` ([[entity-clerk-expo]]) | `@clerk/nextjs` | — (SDK differs by design) | ✅ Aligned — same provider + entitlement key |
| **Subscription/billing** | `subscription.ts`, `PaywallScreen`, `useSubscription` ([[entity-billing]]) | `subscription.ts`, `stripe.ts`, `dashboard/billing` | `lib/subscription.ts` **byte-identical (our PR #29)** | ✅ Synced — re-synced after portal PR #45 drift |
| **Retention** | `retention.ts`, `useStreak`, `TrialExpiryBanner` ([[entity-retention]]) | `retention.ts`, `/api/retention` | `lib/retention.ts` **identical** | ✅ Synced |
| **Portfolio** | `portfolio.ts`, `PortfolioScreen`, `usePortfolio` ([[entity-portfolio]]) | `portfolio.ts`, `/api/portfolio`, `dashboard/portfolio` | `lib/portfolio.ts` **identical** | ✅ Synced |
| **SSE transport** | `shared/sse.ts` | `shared/sse.ts` | **identical** | ✅ Synced |
| **Signals / Digest** | `digest.ts`, `signalCard.ts`, `DigestScreen` ([[entity-signals-digest]]) | `digest.ts`, `signalCard.ts`, `/api/signals` | `digest.ts`, `signalCard.ts` **byte-identical (our PR #30 + portal PR #51)** | ✅ Synced — was 🟡 Partial (open-issue #6, resolved) |
| **Nu AI chat** | `nuai.ts`, `NuAIScreen`, `useNuAI` ([[entity-nuai]]) | `nuai.ts`, `/api/nuai`, `dashboard/nuai` | `nuai.ts` **diverged** | 🟡 Partial |
| **Hold/Fold** | `clients/holdfold.ts`, `HoldFoldScreen` — different backend, incompatible verdict shape | `/api/holdfold`, `dashboard/holdfold`, holdfold-cache, `/api/brief` (portal PR #46) | `lib/shared/holdfold-map.ts` in portal's `lib/shared/` but portal-only (PR #46) | 🟡 Partial — portal caches + has a shared mapper; mobile calls a different backend live |
| **Daily Brief / Market Briefing** | `BriefingScreen` — live council prompt from `getMarketOverview()` + `getMacroPulse()` + `getSignals()` | `/api/brief` — one-shot LLM completion grounded on scoped market data + Hold/Fold verdicts (portal PR #46) | none | 🔴 Divergent — different data (mobile: full sections + macro; portal: brief-only + verdicts), different output shape (council prose vs. 4-sentence structured brief) |
| **Shared prefs** | `shared/prefs.ts` (SecureStore) | `shared/prefs.ts` (localStorage) | **byte-identical except the storage-backend seam** (confirmed, portal PR #50 assessment) | ✅ Aligned — same seam class as Auth SDK |
| **Shared signal filters** | `shared/signalFilters.ts` (canonical) | `shared/signalFilters.ts` (portal PR #50) | **byte-identical except the import-path seam** (our `@/` alias is unconfigured — separate bug) | ✅ Synced — was 🟡 Partial (quote-style drift), reconciled by portal PR #50 |
| **Feedback** | `feedback.ts` | `/api/feedback` | none | 🟡 Present both, unshared |
| **Push** | `pushNotifications.ts` | `/api/push` | none | 🟡 Present both, unshared |
| **Referral / share** | `shareSheet.ts` | `/api/referral`, `dashboard/share` | none | 🟡 Present both, unshared |
| **AI Council** | `clients/council.ts` composer → ai-text RAG backend ([[entity-council-composer]]) | 6-seat OpenRouter deliberation, server-side | none | 🔴 Divergent architectures |
| **Public council demo + share cards** | — | `/api/council/public`, `/api/og/verdict/[ticker]`, `/verdict/[ticker]` (portal PR #43) | none (reuses portal's `lib/openrouter.ts`) | ⬅️ Portal-only, unauthenticated growth surface |
| **Backtest** | — | `/api/backtest`, `backtest.ts` | — | ⬅️ Portal-only |
| **Watchlist store** | folded into `usePortfolio` | `watchlist-store.ts` (add now enqueues a signal refresh, PR #40) | — | ⬅️ Portal-only |
| **Signal cache / queue** | — | `signal-queue.ts`, `signal-policy.ts`, `signal_cache`, `/api/signals/drain` | `signal-policy.ts` in `lib/shared/` but portal-only | ⬅️ Portal-only (PR #40) |
| **Real-time price tier** | — | `live-price.ts`, `live-price-db.ts`, `live_prices`, `/api/signals/live` (Finnhub WS) | `live-price.ts` in `lib/shared/` but portal-only | ⬅️ Portal-only (PR #40) |
| **Onboarding** | `OnboardingScreen` | — | — | ➡️ Mobile-only |
| **Analytics / Sentry** | `analytics.ts`, `sentry.ts` ([[entity-monitoring]]) | — | — | ➡️ Mobile-only |
| **Schwab health** | `schwab-health.ts` | — | — | ➡️ Mobile-only |

Legend: ✅ synced · 🟡 partial · 🔴 divergent · ⬅️ portal-only · ➡️ mobile-only.

## Contradictions / tensions

> ⚠️ Contradiction: `lib/shared/` is meant to be the single source of truth, but
> `prefs.ts` and `signalFilters.ts` already differ between repos *inside that very
> folder* — and portal PR #40 added `signal-policy.ts` + `live-price.ts`, PR #46
> added `holdfold-map.ts`, all three portal-only with no mobile counterpart. A
> "shared" module that isn't byte-identical is worse than an obviously
> per-platform one, because it hides drift — and `holdfold-map.ts` specifically
> can't be adopted here without first switching our Hold/Fold backend and
> verdict schema to match the portal's. See [[concept-sync-requirements]].

> ⚠️ Contradiction: [[concept-backend-is-source-of-truth]] argues for one
> canonical adapter, yet `digest.ts` / `signalCard.ts` exist as two independently-
> evolved copies. This is [[overview#open-issues|overview open-issue #6]].

> ❓ Open question: the AI Council is the flagship feature and is the *least*
> synced — portal runs a self-contained 6-seat OpenRouter debate while mobile taps
> a RAG backend via [[entity-council-composer]]. Is convergence a goal, or are these
> deliberately different products (deep desktop deliberation vs. lightweight mobile
> tap-in per [[concept-council-tap-in]])? Decision not recorded.

## Where it appears

- Shared backbone: `lib/shared/` in both repos (only `sse.ts` is truly shared today)
- Identical logic modules: `lib/subscription.ts`, `lib/retention.ts`, `lib/portfolio.ts`
- The `nuwrrrld-fullstack` skill exists specifically to single-source cross-surface
  business logic and keep Clerk parity — the mechanism this page measures.

## See also

- [[concept-sync-requirements]] — the checklist to raise the number
- [[concept-backend-is-source-of-truth]] — the principle the drift violates
- [[entity-signals-digest]] · [[entity-portfolio]] · [[entity-nuai]] · [[entity-billing]] · [[entity-council-composer]]
- `nuwrrrld-portal/docs/wiki-portal/overview.md` — the portal sibling
- `nuwrrrld-portal/docs/wiki-portal/incident-2026-07-27-stripe-checkout-invalid-header.md` — the PR #45 incident that introduced the `lib/subscription.ts` drift
