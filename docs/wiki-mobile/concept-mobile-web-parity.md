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

> ℹ️ **Portal PR #89 (2026-08-31) assessed — their billing repair, headline unchanged at ~62%.** A live-Stripe-account audit found the portal's checkout broken on *both* plans: `STRIPE_PRICE_ANNUAL` still held a literal placeholder — the same defect their PR #79 recorded as fixed ten days earlier, where the code and docs were corrected but the value never reached the deployed environment — and `STRIPE_PRICE_MONTHLY` pointed at an archived, inactive price. Separately, their only live webhook endpoint targets the `gcp3-backend` Cloud Run service, so nothing was registered for their `/api/webhooks/stripe` and no subscription events reached the portal at all. All of it is portal-side env wiring and provisioning tooling; `lib/subscription.ts` is untouched and stays byte-identical, and this app has no Stripe price IDs or webhook endpoint of its own, so neither denominator moves. **What is worth carrying here** is the failure mode rather than the fix: a billing identifier marked "repaired" in a doc stayed broken in the running app for ten days because nothing verified the deployed value. This app's store-billing configuration has never had an equivalent audit — see [[concept-sync-requirements]].
>
> ⚠️ **Headline resynced 2026-08-31, body reconciled 2026-09-01 (our PR #39).** On 2026-08-31 this page's headline was corrected from a stale ~66% to ~62% to match `wiki-portal` and clear the cross-wiki lint, but the denominator bullets and the matrix below were left describing the old ~66% world. Our PR #39 finishes the job: feature-domain drops to ≈76% (consent is a 12th, web-only domain), single-source to ≈40%, and the matrix gains the Cookie-consent, DSAR, and Attribution rows. The consent/DSAR asymmetry itself is still open — see [[concept-sync-requirements]] priority #1 — but the page now measures it instead of omitting it.

> ✅ **Our PR #39 (2026-09-01) — adopts `lib/shared/attribution.ts`, matrix + denominators recomputed.** Portal PR #81 landed `attribution.ts` on portal `main` (the pure first-party acquisition model — `nu_attrib` cookie, UTM/gclid/fbclid/referrer, 90-day first-touch, plus a `parseTouch` hardened against a tampered cookie via `cleanKnownKeys` + `isValidTimestamp`). This PR mirrors it verbatim and registers the pair in `scripts/check-shared-drift.mjs` on both repos (`normalize: null`, 9 files gated now). Because portal already carries the file on `main`, the circular drift-gate problem does not arise — CI is green on both sides. We now carry **6** of portal's **16** `lib/shared/` modules; single-source parity ~38% → ~40%. **This PR also recomputes what the 2026-08-31 headline resync left undone**: the matrix gains a Cookie-consent/privacy-rights row, an Attribution row and a DSAR row, and the feature-domain denominator drops to ≈76% (12 domains, consent web-only). No consumer wiring on mobile — the shared model is adopted but nothing captures a touch here; a mobile attribution-capture path is owed ([[concept-sync-requirements]]). Blended holds at **~62%**.

## Headline: ~62% synced (2026-09-01, after portal PRs #77/#78 + mobile PR #39 — consent/DSAR web-only; `attribution.ts` mirrored, matrix + denominators recomputed to match)

Two different denominators, deliberately kept separate:

- **Feature-domain parity ≈ 76%** (was ~82%) — 9 of **12** shared product
  domains work on both surfaces. Portal PRs #77/#78 added a 12th domain,
  **Cookie consent / privacy rights**, a genuine cross-surface obligation
  (GDPR/CPRA bind this app too) that exists on the portal only — counted as a
  gap, not a portal-only bonus. The AI Council is still architecturally
  divergent; Nu AI is still drifted. Unchanged by portal PR #40 (depth, not a
  new domain).
- **Single-source (code-identical) parity ≈ 40%** (was ~44%) — the denominator
  grew faster than the numerator. Prior progress holds: our PR #29 ported
  `parseSubscriptionMetadata()`; portal PR #50 reconciled `signalFilters.ts`
  and confirmed `prefs.ts`'s seam; our PR #30 + portal PR #51 de-drifted
  `digest.ts`/`signalCard.ts` (open-issue #6), including a real ticker-precedence
  bug fix and porting portal's `dataQualityScore`; our PR #32 adopted
  `signal-policy.ts` + `live-price.ts` verbatim. **Our PR #39 adopts a sixth
  shared module — `lib/shared/attribution.ts`** (pure first-party acquisition
  model: `nu_attrib` cookie, UTM/gclid/fbclid/referrer, hardened `parseTouch`),
  byte-identical and drift-gated. But portal PRs #77/#78 added **three**
  portal-only `lib/shared/` files in the same window — `consent.ts`,
  `legal-consent.ts`, `attribution.ts` (the last now mirrored) — so portal
  carries 16 shared modules to our 6. Still owed: portal PR #40's real-time
  signal tier (`signal-queue`, `signal_cache`, `/api/signals/{drain,live}`) has
  no mobile counterpart; `holdfold-map.ts` (portal PR #46) is not adoptable
  without unifying the Hold/Fold backend first; and `consent.ts` /
  `legal-consent.ts` are portable now and unclaimed ([[concept-sync-requirements]]
  priority #1).

The blended figure reached **~66%** on the four completed items of the
original `/sync-pr` de-drift batch
(`nuwrrrld-portal/docs/sync-pr-large-scale-run.md`) plus a fifth, follow-on
item — adopting `signal-policy.ts`/`live-price.ts` — done once the drift gate
made "adopt before it drifts" enforceable. It has since fallen to the current
**~62%**: portal PRs #77/#78 shipped consent + DSAR web-only, widening the
feature-domain gap and adding two unadopted shared modules, and our PR #39's
`attribution.ts` adoption recovers only a sliver of single-source parity
against that. No shared module has drifted — the CI drift gate (our PR #33 +
portal PR #52) now covers **9** shared-core files including `attribution.ts`.
The portal still pulls ahead on the signal/Hold-Fold data plane and now on
compliance; the risk lives in the gap between the two denominators.

> ℹ️ **Portal PR #91 (2026-08-31) assessed — portal-only bug fix, headline unchanged at ~62%.** The portal repaired its signal-card "Go Deeper" council call, which had rendered every success as an error since the four-field verdict migration (`/api/council` returns `{ verdict, ... }`; the caller still read `data.answer`). Adds a portal-only `lib/shared/councilErrors.ts` and edits the portal's `lib/shared/prompts.ts`. Nothing mobile-reachable: this repo has no `/api/council` caller and carries neither module, so no drift is introduced and no port is owed. See `nuwrrrld-portal/docs/wiki-portal/incident-2026-08-31-signals-go-deeper-contract-drift.md`. Neither denominator moves.

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
| **Cookie consent / privacy rights** | `analytics.ts` + `sentry.ts` run with **no consent gate** | `ConsentBanner`+`ConsentPreferences` in root layout, `nu_consent` cookie, `/api/consent`, `/api/legal-consent`, `LegalConsentGate` on sign-up (portal PRs #77/#78) | `lib/shared/consent.ts`, `lib/shared/legal-consent.ts` — **portal-only, portable now** (no backend/schema dep we lack; only the `prefs.ts` storage seam) | ⬅️ Portal-only — **required port**, not optional: GDPR/CPRA bind this app too ([[concept-sync-requirements]] priority #1) |
| **Data-subject rights (DSAR)** | — | `/api/privacy/{export,profile,delete,rectify}`, `privacy_requests` statutory-clock ledger, rate-limited (portal PR #78) | none | ⬅️ Portal-only — **compliance asymmetry**: same account can exercise GDPR access/erasure/rectification on web, has no mechanism here |
| **Attribution** | `lib/shared/attribution.ts` present, **unconsumed** | `lib/shared/attribution.ts`, `nu_attrib` cookie, `user_attribution` table, `/api/attribution`, `AttributionCapture` client (portal PRs #78/#81) | `lib/shared/attribution.ts` **byte-identical (our PR #39)** | 🟡 Partial — module shared + drift-gated; capture path still portal-only |
| **Feedback** | `feedback.ts` | `/api/feedback` | none | 🟡 Present both, unshared |
| **Push** | `pushNotifications.ts` | `/api/push` | none | 🟡 Present both, unshared |
| **Referral / share** | `shareSheet.ts` | `/api/referral`, `dashboard/share` | none | 🟡 Present both, unshared |
| **AI Council** | `clients/council.ts` composer → ai-text RAG backend ([[entity-council-composer]]) | 6-seat OpenRouter deliberation, server-side | none | 🔴 Divergent architectures |
| **Public council demo + share cards** | — | `/api/council/public`, `/api/og/verdict/[ticker]`, `/verdict/[ticker]` (portal PR #43) | none (reuses portal's `lib/openrouter.ts`) | ⬅️ Portal-only, unauthenticated growth surface |
| **Backtest** | — | `/api/backtest`, `backtest.ts` | — | ⬅️ Portal-only |
| **Watchlist store** | folded into `usePortfolio` | `watchlist-store.ts` (add now enqueues a signal refresh, PR #40) | — | ⬅️ Portal-only |
| **Signal cache / queue** | `signal-policy.ts` present, unconsumed | `signal-queue.ts`, `signal-policy.ts`, `signal_cache`, `/api/signals/drain` | `signal-policy.ts` **byte-identical (our PR #32)** | 🟡 Partial — module shared, feature still portal-only |
| **Real-time price tier** | `live-price.ts` present, unconsumed | `live-price.ts`, `live-price-db.ts`, `live_prices`, `/api/signals/live` (Finnhub WS) | `live-price.ts` **byte-identical (our PR #32)** | 🟡 Partial — module shared, feature still portal-only |
| **Onboarding** | `OnboardingScreen` | — | — | ➡️ Mobile-only |
| **Analytics / Sentry** | `analytics.ts`, `sentry.ts` ([[entity-monitoring]]) | — | — | ➡️ Mobile-only |
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
