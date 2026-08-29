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

> ℹ️ **Our PR #32 (2026-08-08) assessed — tsc baseline fix + digest.ts bugfix (headline-neutral parts).** Resolved all 38 pre-existing `npx tsc --noEmit` errors on this repo's baseline: missing `@/*` path alias in tsconfig.json, `@vercel/node` types on `api/*.ts` (these are Vercel functions, not Next.js), missing `expo-notifications`/`svix` dependencies, deleted three dead components importing a nonexistent `../backend/schemas/signal` module, plus real type-safety fixes in `lib/api.ts` (generic `getMarketData<T>()`) and `lib/auth-provider.tsx` (`isSignedIn` undefined→null coercion) — same infra-only class as portal PR #48. Also ported a portal PR #52 CodeRabbit-review fix to `lib/digest.ts`: `symbolKey || entry.symbol` never fell back to `entry.symbol` for whitespace-only keys because `symbolKey` (an object key) is always truthy — now trimmed first. See the next entry for the parity-moving part of this same PR.

> ✅ **Our PR #32 (signal-policy/live-price adoption) + our PR #33 (drift-gate CI, 2026-08-08) — item #5 of [[concept-sync-requirements]] §1, closes the `lib/shared/signal-policy.ts` + `lib/shared/live-price.ts` share-debt portal PR #40 created.** Both pure, dependency-free modules (ticker validation, cache freshness/backoff, live-price row/batch parsing) are now byte-identical copies here, tracked by the drift gate on both sides. We don't yet *consume* either module (no live-price feed wired up on this surface), but landing them now — rather than writing our own version later — is the "adopt before drift" ordering [[concept-sync-requirements]] §1 recommends. Our PR #33 also finally adds the drift-gate CI job here (it existed only on the portal side after portal PR #52) plus a real `usePortfolio`/`PortfolioScreen` fix (a 204 empty watchlist was showing "health score unavailable" instead of "add tickers to get scored"). PR #33 supersedes an earlier stale PR #31 whose wiki/code content had already landed on `main` via other merged PRs — only the still-missing CI workflow and portfolio fix were carried forward.

> ℹ️ **Portal PR #59 (2026-08-14) assessed — CI/scheduler infra only, headline unchanged at ~66%.** Adds `afternoon-pipeline.yml` (GitHub Actions cron for their 3:15 PM ET signals→council→theses→distribution run) and `setup-schedulers.sh` (GCP Cloud Scheduler provisioning for the open-check/main-briefing/post-close-scorer jobs) — see portal's `[[decision-afternoon-pipeline-cron-split]]`. Server-side scheduling only; no `lib/`, `lib/shared/`, or app-facing code touched. This app has no equivalent server-side cron layer to compare against, so this PR doesn't create or close a parity gap.

> ℹ️ **Portal PR #64 + #65 (2026-08-17/18) assessed — test tooling + portal-only UI, headline unchanged at ~66%.** #64 added their Playwright e2e suite (credential-gated fault injection, GCP-WIF CI, nulogdash browser-tier merge); #65 was a second-pass review of #64's cheap fix commit that built a dashboard health-status banner (`app/dashboard/HealthBanner.tsx`, polling their `/api/health`) so a required e2e test had a real `data-testid` target instead of a phantom selector, plus doc-consistency fixes. Neither touches any `lib/shared/` module or cross-surface business logic. This app has no Playwright/e2e tier and no `/api/health` dashboard probe to compare against, so neither PR creates or closes a parity gap — candidates only if this surface later grows an equivalent test tier or health banner.

> ℹ️ **Our PR #36 and portal PRs #66 + #67 (2026-08-18) assessed — headline unchanged at ~66%, but one shared module was re-synced.** Portal PR #66 changed `lib/digest.ts` while landing its coverage pipeline: `adaptLiveSignals` now derives `generatedAt`/`isStale` from each symbol's own `updated` field, falling back to the batch-wide timestamp only when a symbol omits one. That closed a real defect — a symbol whose data lagged the batch inherited the batch's fresh timestamp and never tripped `computeIsStale()` — but it landed web-only, so the drift gate went red on **both** repos at once, each comparing against the other's `main`. Our PR #36 ported the same fix verbatim (alongside its `subscription.ts` trialEnd change), which cleared the deadlock and restored `digest.ts` to byte-identical. No new shared module and no new shared domain, so neither denominator moves; this is a *repair* of existing single-source parity, not an extension of it. Portal PR #67 (`scripts/hydrate-local.mjs`) is portal-only tooling — a local runner for their hydration pipeline, indicator math pinned to the Modal Python implementation by a parity test; we have no counterpart and need none.

> ⚠️ **Portal PR #77 (2026-08-29) assessed — headline ~66% → ~63%. A new cross-surface obligation lands web-only and this app is on the wrong side of it.** The portal added cookie/tracking consent infrastructure (a consent banner + per-category preferences in its root layout, a `nu_consent` first-party cookie via `POST /api/consent`, `consent_records` + `legal_consent_events` tables), an express ToS/Privacy checkbox gating Clerk sign-up, and `/api/privacy/{export,profile,delete}` data-subject-rights endpoints.
>
> Two effects on the number. First, `nuwrrrld-portal/lib/shared/consent.ts` and `.../legal-consent.ts` are **new, pure, and deliberately written to be mirrored here** — but not yet ported, so the portal now carries 15 `lib/shared/` modules to our 5. Unlike `universe-policy.ts`/`holdfold-map.ts`, these two *are* adoptable today: consent has no backend or schema dependency this app lacks, only the prefs storage seam (`lib/shared/prefs.ts` → SecureStore) already solved elsewhere in this matrix.
>
> Second — and more urgent — consent capture is a **compliance obligation that binds this app too**. GDPR (opt-in) and CPRA (opt-out + GPC + "Do Not Sell or Share") apply to the Expo app exactly as to the portal. This app runs `analytics.ts` + `sentry.ts` today with **no consent gate**, and it shares one Clerk identity and one user base with the portal — so a user who opts out on web is still tracked here. Until this app adopts `lib/shared/consent.ts` and gates its analytics init, the *product* is non-compliant even though the portal in isolation now is not. New matrix row below; see `concept-sync-requirements.md` §"Cookie consent / privacy rights" — priority #6.

> ℹ️ **The portal's auth/DSAR/analytics PR (2026-08-29) assessed — headline ~63% → ~62%.** The immediate follow-up to PR #77, built on that branch. Adds a **third** portal-only `lib/shared/` module — `attribution.ts`, first-party acquisition capture (UTM/gclid/fbclid/referrer, `nu_attrib` 90-day first-touch) — taking the portal to 16 shared modules against our 5, so single-source falls ~40% → ~38%. Portable today, same `expo-secure-store` seam as `consent.ts`.

> The feature-domain half is the consequential part. The portal now serves `/api/privacy/{export,profile,delete,rectify}` plus a `privacy_requests` statutory-clock ledger, and a consent-gated analytics sink (`lib/analytics.ts`) that validates events against a written taxonomy and drops them — deliberately no vendor until a DPA is signed. **We serve none of that.** Stacked on the consent contradiction the previous entry logged, that is a second compliance asymmetry on the same Clerk identity: a user can exercise GDPR access, erasure and rectification on web, and has no mechanism here. See [[concept-sync-requirements]] #9 (adopt `attribution.ts`) and #10 (a rights path — linking out to the portal's endpoints keeps the erasure cascade and the ledger single-copy rather than duplicating them). The portal's `docs/privacy-register.md` — cookie table, processor register, retention targets, Art. 6 bases — is the shared input both surfaces' privacy policies should generate from; keeping them identical in substance is a compliance requirement, not a copy nit.

## Headline: ~62% synced (2026-08-29, after the portal's auth/DSAR/analytics PR — data-subject rights land web-only, +1 more portal-only `lib/shared/` module)

Two different denominators, deliberately kept separate:

- **Feature-domain parity ≈ 76%** (was ~82%) — 9 of 12 shared product domains
  exist and work on both surfaces. Portal PR #77 adds a 12th, **Cookie consent /
  privacy rights**, a real cross-surface obligation that today exists on the
  portal only — counted as a gap, not a portal-only bonus. The AI Council is
  still architecturally divergent; Nu AI is still drifted.
- **Single-source (code-identical) parity ≈ 40%** (was ~44%) — no module was
  de-drifted or adopted this round, and portal PR #77 adds two more portal-only
  files under `lib/shared/` (`consent.ts`, `legal-consent.ts`), so the
  denominator grows while the numerator holds; the portal now carries 15
  `lib/shared/` modules to our 5. Prior progress unchanged: our PR #29
  ported `parseSubscriptionMetadata()`; portal PR #50 reconciled
  `signalFilters.ts` and confirmed `prefs.ts`'s seam; our PR #30 + portal PR
  #51 de-drifted `digest.ts`/`signalCard.ts` (open-issue #6), including a
  genuine bug fix (portal's ticker-precedence code contradicted its own
  documented intent) and porting portal's `dataQualityScore` field here; our
  PR #32 adopted `lib/shared/signal-policy.ts` + `lib/shared/live-price.ts`
  verbatim, closing the two-module share-debt portal PR #40 created (we have
  the code but not yet the feature — see the matrix row below). Still owed:
  portal PR #40's wider real-time signal tier (`signal-queue`, `signal_cache`
  read-through, `/api/signals/drain` + `/live`) still has no mobile
  counterpart, and portal PR #46 adds a fourth portal-only `lib/shared/` file
  (`holdfold-map.ts`), not adoptable without first unifying our Hold/Fold
  backend and verdict schema with the portal's.

The blended **~63%** (down from ~66%) reflects the earlier de-drift batch
progress, minus portal PR #77's two effects: a new required cross-surface domain
that exists on one surface, and two more unadopted `lib/shared/` modules. The
number sat at ~66% from 2026-08-08 through portal PR #75 (a run of portal-only
infra PRs); PR #77 is the first feature-scoped change since, and it moves the
number down.

The historical ~66% reflected the four completed items of the original
`/sync-pr` de-drift batch (`nuwrrrld-portal/docs/sync-pr-large-scale-run.md`)
plus a fifth, follow-on item — adopting `signal-policy.ts`/`live-price.ts` —
done once the drift gate made "adopt before it drifts" enforceable. The
drift-detection CI gate now runs on **both** repos (our PR #33 added the job
here; portal PR #52 added it there), covering 8 shared-core files. The portal
still pulls ahead on the signal/Hold-Fold data plane; the risk lives in the
gap between the two denominators.

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
| **Cookie consent / privacy rights** | — (our `analytics.ts`+`sentry.ts` run *without* a consent gate) | consent banner + per-category prefs in root layout, `nu_consent` cookie, `/api/consent`, `/api/legal-consent`, `/api/privacy/{export,profile,delete}`, `consent_records`+`legal_consent_events` (portal PR #77) | `nuwrrrld-portal/lib/shared/consent.ts`, `.../legal-consent.ts` — portal-only so far, **adoptable now** (only the prefs storage seam differs) | ⬅️ Portal-only — **required port, not optional**: GDPR/CPRA bind this app too. See `concept-sync-requirements.md` §"Cookie consent / privacy rights" |
| **Public council demo + share cards** | — | `/api/council/public`, `/api/og/verdict/[ticker]`, `/verdict/[ticker]` (portal PR #43) | none (reuses portal's `lib/openrouter.ts`) | ⬅️ Portal-only, unauthenticated growth surface |
| **Backtest** | — | `/api/backtest`, `backtest.ts` | — | ⬅️ Portal-only |
| **Watchlist store** | folded into `usePortfolio` | `watchlist-store.ts` (add now enqueues a signal refresh, PR #40) | — | ⬅️ Portal-only |
| **Signal cache / queue** | `signal-policy.ts` present, unconsumed | `signal-queue.ts`, `signal-policy.ts`, `signal_cache`, `/api/signals/drain` | `signal-policy.ts` **byte-identical (our PR #32)** | 🟡 Partial — module shared, feature still portal-only |
| **Real-time price tier** | `live-price.ts` present, unconsumed | `live-price.ts`, `live-price-db.ts`, `live_prices`, `/api/signals/live` (Finnhub WS) | `live-price.ts` **byte-identical (our PR #32)** | 🟡 Partial — module shared, feature still portal-only |
| **Onboarding** | `OnboardingScreen` | — | — | ➡️ Mobile-only |
| **Analytics / Sentry** | `analytics.ts`, `sentry.ts` ([[entity-monitoring]]) — **runs with no consent gate; portal PR #77 makes this the product's compliance gap** | — | — | ➡️ Mobile-only |
| **Schwab health** | `schwab-health.ts` | — | — | ➡️ Mobile-only |

Legend: ✅ synced · 🟡 partial · 🔴 divergent · ⬅️ portal-only · ➡️ mobile-only.

## Contradictions / tensions

> ⚠️ Contradiction: `lib/shared/` is meant to be the single source of truth, but
> `prefs.ts` and `signalFilters.ts` differ between repos *inside that very
> folder* on documented seams — and portal PR #46 added `holdfold-map.ts`,
> portal-only with no mobile counterpart. `signal-policy.ts` + `live-price.ts`
> (portal PR #40) were the same standing-drift-invitation pattern until our PR
> #32 adopted them verbatim. `holdfold-map.ts` can't follow the same path —
> we'd first need to switch our Hold/Fold backend and verdict schema to match
> the portal's. See [[concept-sync-requirements]].

> ⚠️ Contradiction: [[concept-backend-is-source-of-truth]] argues for one
> canonical adapter, yet `digest.ts` / `signalCard.ts` exist as two independently-
> evolved copies. This is [[overview#open-issues|overview open-issue #6]].

> ⚠️ Contradiction: this app ships `analytics.ts` + `sentry.ts` (client tracking)
> with **no consent gate**, while the portal (its PR #77) now blocks all
> non-necessary tracking until the user opts in and honors GPC/DNT. The two
> surfaces share one Clerk identity and one user base, so a user who opts out on
> web is still tracked in the app. Until this app adopts
> `nuwrrrld-portal/lib/shared/consent.ts` and gates its analytics init (see
> `concept-sync-requirements.md` §"Cookie consent / privacy rights", priority
> #6), the *product* is non-compliant even though the portal in isolation is not.

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
