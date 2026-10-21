---
date: 2026-10-14
type: concept
tags: [sync, parity, mobile, web, cross-surface, shared]
sources: [../../lib, ../../lib/shared, ../../screens, nuwrrrld-portal/lib, nuwrrrld-portal/app, nuwrrrld-portal/app/dashboard/page.tsx, nuwrrrld-portal/app/page.tsx, nuwrrrld-portal/docs/r02-safe-data-backup-audit-2026-10-21.md]
---

# Concept — Mobile ⇄ Web Parity (% Synced)

## Portal PR #306 — 2026-10-21

The portal R02 audit records Neon development-branch lineage, snapshot and
restore gaps, and the production-host guard's limits. It changes only portal
documentation and wiki pages; no mobile client, shared module, or API contract
changed. The historical ~62% headline and feature matrix remain unchanged.
This is a scoped review, not a fresh parity measurement; no mobile port is
required. See `nuwrrrld-portal/docs/r02-safe-data-backup-audit-2026-10-21.md`.

Companion page: [[concept-sync-requirements]] — the concrete work each surface
needs to close the gap. Portal mirror:
`nuwrrrld-portal/docs/wiki-portal/concept-mobile-web-parity.md`.

## Portal PR #293 — 2026-10-17

The portal's followed-ticker observer and paper portfolio workflows now use
New York timezone schedules instead of paired seasonal UTC schedules. This
reduces workflow starts while keeping the intended local slots. The PR
changes no mobile feature, API contract, or shared module. The historical
~62% headline and feature-domain matrix remain unchanged; this is a scoped
assessment rather than a fresh parity audit.

> ℹ️ **Mobile PR feat/mobile-dsar (2026-10-14) — builds the mobile data-subject-rights path, headline stays ~62% (percentages not recomputed).** The portal's `/api/privacy/{export,profile,rectify,delete}` routes (delete is a two-step preview-token plus explicit confirm flow) had no mobile caller, the largest compliance asymmetry in the matrix. The app now has a typed client (`lib/clients/portalPrivacy.ts`, Clerk Bearer token supplied by the caller, 429 surfaced as a retry-after) and a "Privacy & data" screen (`screens/PrivacyScreen.tsx`: export, correction request, two-step deletion, and a blocking sign-out-retry view if sign-out fails after a successful erasure). It is reachable from the live shell only: Briefing → Account card → "Privacy & data" → full-screen Modal in `App.tsx`; the `app/` expo-router tree is dead code, so nothing was added there. The DSAR row moves from portal-only to partial. **Unverified:** nothing ran on a device or against the deployed portal; whether the portal's edge `auth.protect()` accepts a Clerk mobile Bearer token on these routes is unconfirmed (it does for the subscription route); large-export share behaviour on Android is untested. Open portal-side item: `/api/privacy/rectify` is absent from the portal proxy matcher and relies only on its handler's `auth()`.

> ℹ️ **Mobile PR fix/portfolio-health-guard (2026-10-14) — repairs existing parity, headline unchanged at ~62%.** `lib/portfolio.ts` had silently drifted from the portal's copy (about 30 lines): the portal added runtime guards (`isHealthFactor()` / `isPortfolioHealth()`) so an unadapted upstream payload cannot render as a silent "score 0 / Grade F" (see the portal's 2026-07-26 portfolio-health-endpoint-missing incident). This matrix had listed the file as "identical", but it was never drift-gated, so CI could not see the drift. The PR ports the file byte-identically, makes `usePortfolio` validate the health response (an invalid payload goes to the hook's existing error state; a failed fetch clears stale health), and adds `lib/portfolio.ts` and `lib/retention.ts` to the mobile drift gate (now 13 gated files). The portal's gate still needs the mirror entries (portal PR pending; `portfolio.ts` only after this merges). `lib/nuai.ts` stays divergent and ungated, a separate known item. The single-source figure was likely overstated before this fix; percentages not recomputed.

> ℹ️ **Portal PRs #261–#272 (2026-10-13) assessed — portal-only changes, headline unchanged at ~62%.** A drain of the portal PR queue: a paper-arena comparison page (with nav links and a real last-run status for paper portfolios), a `/api/health` check that flags a placeholder Stripe webhook secret, lighter data loading on the dashboard and homepage, the CI alert lifecycle (deduplicated issues, closed on recovery, optional push), plus a skipped malformed-digest e2e case, agent-tier docs, a model-usage report and a free-model chain refresh. Portal-only paper-trading modules changed or were added under `lib/shared/` (`paper-view.ts` edited in #261, `paper-arena-view.ts` added in #262); mobile has no counterpart and needs none, so the feature-domain matrix and headline stay at ~62% (the portal-only shared-module count rose; percentages not recomputed). The arena page extends the paper-trading domain on the web only; porting it to mobile is optional and creates no new sync requirement. Each PR had a static review by a second model; none were verified on a deployed environment.

> ℹ️ **Mobile PR feat/attribution-capture (2026-10-14) — first mobile consumer of `attribution.ts`, built but unverified on a device; headline unchanged at ~62%.** `lib/attribution-capture.ts` and `lib/useAttributionCapture.ts` are mounted in the live `App.tsx` (the `app/` expo-router tree is dead code). The hook reads launch and deep-link URLs, keeps a 90-day first touch locally, and reports it once to the portal's attribution route, only when the user is signed in and analytics consent is loaded and granted. Consent is default-deny, re-checked right before persisting and right before the request, and revoking it deletes the stored touch and stops reporting. A touch counts as sent only on a 200 body of `ok` plus `captured`, with a real bearer token. Limits: only launch and deep-link URLs are seen, so Play Install Referrer and App Store install referrers are NOT captured; consent and first-touch values travel in a Cookie header because the portal route reads consent from a cookie, which is unverified on a device (native fetch may treat that header differently per platform); nothing ran against the deployed portal. The consent prompt has been reachable since mobile PR #54 (merged 2026-10-14), so capture is no longer inert (still unverified on a device). No `lib/shared` file changed; percentages not recomputed.

## The pattern

**2026-10-12 portal slowness assessment:** portal `app/dashboard/page.tsx` now requests `/market-overview?sections=brief`, and the earlier portal PR #269 bounded the homepage's optional council sample fetch at 5 seconds in `app/page.tsx`; that bound was later replaced by portal PR #281, which reads the stored sample instead, so current `app/page.tsx` calls `getCouncilSample()` with no timeout. No feature domain or shared module is added, removed, or edited; no interactive council budget changes. For this change, the existing domain matrix and recorded feature-domain ≈76%, code-identical ≈40%, blended ~62% figures remain unchanged. This is a scoped change assessment, not a fresh audit of all shared modules. Mobile’s existing full-overview briefing and council implementation remain separate; no new mobile port or de-drift item is introduced.

**2026-10-14 mobile overview timeout fix:** mobile-only change in `lib/clients/gcp3.ts` and `BriefingScreen`; it splits the fast overview call (`brief,sentiment`) from the slow `ai_summary` call, replacing the unscoped fetch that always timed out (see [[concept-sync-requirements]] performance note, and the stale "still fetches the unscoped" remark in the 2026-07-30 entry below, now resolved). No `lib/shared` module is added, removed or edited, and no feature domain changes, so the domain matrix and the ~62% headline are unchanged.

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

> ⚠️ **Portal PR #101 (2026-09-03) assessed — their signal-engine three-phase plan, headline unchanged at ~62%; re-drifts a module we already carry.** Lands loud hydration-failure alerting, an out-of-writer freshness check, Alpaca pagination, `BRK-B`→`BRK.B` symbology normalization, a real `dataQuality` score, and — the one line that reaches us — `isCryptoShaped()` added to `lib/shared/signal-policy.ts`, which our PR #32 adopted verbatim back on 2026-08-08. The rest is portal-only (their ticker universe, hydration lane, card ranking — none of which we have or need). No mobile caller for the new function (we have no ticker-registration route), but the module is in the drift-gated single-source set, so their addition re-drifts us the moment it lands unless we port it same-day.
>
> ✅ **Our PR #43 (2026-09-04) — closes that drift the same day.** Ports `isCryptoShaped()` into our copy of `lib/shared/signal-policy.ts`, byte-identical again (confirmed by diff, not assumed). We have no test runner at all in this repo (no vitest/jest, no `test` script), so their companion unit test wasn't mirrored — it would be dead code with nothing to execute it; verified with a clean `tsc --noEmit` instead. Neither denominator moves — this restores existing parity on a module already counted as synced, it doesn't extend the count.

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

> ℹ️ **Mobile PR fix/holdfold-fib-type (2026-09-26) assessed — mobile type fix only, headline unchanged at ~62%.** `clients/holdfold.ts` now declares the Fibonacci response the backend actually sends (`FibLevel { name, price, distance_pct, strength, type }`, `fib_confluence_zones`, `nearest_fib_support/resistance`), replacing `{ level, price }` whose `level` never arrived. Nothing in the mobile app reads these fields yet, so no behavior changed. Mobile and portal now agree on the *type*; the portal's `lib/shared/fib-levels.ts` (portal PR #185) is deliberately not copied into mobile until that PR merges, since the drift gate compares against the other repo's `main`. No denominator moves.

> ℹ️ **Portal PR #185 (2026-09-26) assessed — portal-only, headline unchanged at ~62%.**
> The portal's Hold/Fold panel now draws a Fibonacci ladder from data the backend
> already returned, via a new portal-only `lib/shared/fib-levels.ts`. Nothing in
> this repo changed in that PR. Our `clients/holdfold.ts` had typed `FibLevel` as
> `{ level, price }` while the backend sends `{ name, price, distance_pct, strength,
> type }`; that type was since fixed by mobile PR #49 (now on `main`), so the
> drift is closed. No screen renders Fibonacci data yet (`fib_levels` is only
> declared in the client type). The module is portable as-is and is a port
> candidate, not a drift.

## Domain parity matrix

| Domain | Mobile | Portal | Shared module | Status |
|--------|--------|--------|---------------|--------|
| **Auth (Clerk)** | `@clerk/clerk-expo` ([[entity-clerk-expo]]) | `@clerk/nextjs` | — (SDK differs by design) | ✅ Aligned — same provider + entitlement key |
| **Subscription/billing** | `subscription.ts`, `PaywallScreen`, `useSubscription` ([[entity-billing]]) | `subscription.ts`, `stripe.ts`, `dashboard/billing`; portal-only `subscription-admin.ts` + `beta-testers.ts` | `lib/subscription.ts` **byte-identical (our PR #29)** | ✅ Admin and beta overrides reach mobile through the effective tier returned by `/api/subscription/tier`; override administration remains portal-only (verified in the effective-tier row) |
| **Retention** | `retention.ts`, `useStreak`, `TrialExpiryBanner` ([[entity-retention]]) | `retention.ts`, `/api/retention` | `lib/retention.ts` **identical** | ✅ Synced |
| **Portfolio** | `portfolio.ts`, `PortfolioScreen`, `usePortfolio` ([[entity-portfolio]]) | `portfolio.ts`, `/api/portfolio`, `dashboard/portfolio` | `lib/portfolio.ts` re-synced 2026-10-14 (had drifted; now byte-identical and drift-gated) | ✅ Synced |
| **SSE transport** | `shared/sse.ts` | `shared/sse.ts` | **identical** | ✅ Synced |
| **Signals / Digest** | `digest.ts`, `signalCard.ts`, `DigestScreen` ([[entity-signals-digest]]) | `digest.ts`, `signalCard.ts`, `/api/signals` | `digest.ts`, `signalCard.ts` **byte-identical (our PR #30 + portal PR #51)** | ✅ Synced — was 🟡 Partial (open-issue #6, resolved) |
| **Nu AI chat** | `nuai.ts`, `NuAIScreen`, `useNuAI` ([[entity-nuai]]) | `nuai.ts`, `/api/nuai`, `dashboard/nuai` | `nuai.ts` **diverged** | 🟡 Partial |
| **Hold/Fold** | `clients/holdfold.ts`, `HoldFoldScreen` — different backend, incompatible verdict shape | `/api/holdfold`, `dashboard/holdfold`, holdfold-cache, `/api/brief` (portal PR #46) | `lib/shared/holdfold-map.ts` in portal's `lib/shared/` but portal-only (PR #46) | 🟡 Partial — portal caches + has a shared mapper; mobile calls a different backend live |
| **Daily Brief / Market Briefing** | `BriefingScreen` — live council prompt from `getMarketOverview()` + `getMacroPulse()` + `getSignals()` | `/api/brief` — one-shot LLM completion grounded on scoped market data + Hold/Fold verdicts (portal PR #46) | none | 🔴 Divergent — different data (mobile: full sections + macro; portal: brief-only + verdicts), different output shape (council prose vs. 4-sentence structured brief) |
| **Shared prefs** | `shared/prefs.ts` (SecureStore) | `shared/prefs.ts` (localStorage) | **byte-identical except the storage-backend seam** (confirmed, portal PR #50 assessment) | ✅ Aligned — same seam class as Auth SDK |
| **Shared signal filters** | `shared/signalFilters.ts` (canonical) | `shared/signalFilters.ts` (portal PR #50) | **byte-identical except the import-path seam** (our `@/` alias is unconfigured — separate bug) | ✅ Synced — was 🟡 Partial (quote-style drift), reconciled by portal PR #50 |
| **Cookie consent / privacy rights** | `ConsentSheet` first-run modal (Accept all / Reject all, equal weight; **reachable in the live app only as of fix/mount-consent-live-entry, 2026-10-14** — see correction below), record persisted via `lib/consent-store.ts` → `prefs.ts` under the same `nu_consent` key; `analytics.ts` + `sentry.ts` gated on `analytics` consent (our feat/adopt-shared-consent PR) | `ConsentBanner`+`ConsentPreferences` in root layout, `nu_consent` cookie, `/api/consent`, `/api/legal-consent`, `LegalConsentGate` on sign-up (portal PRs #77/#78) | `lib/shared/consent.ts`, `lib/shared/legal-consent.ts` — **byte-identical, drift-gated** (11 files gated here) | 🟡 Tracking consent synced; as of 2026-10-14 (feat/consent-ui-signup) also done: `ConsentPreferences` component, fail-closed ToS/Privacy checkbox on the live sign-in screen, best-effort server sync of consent + legal acceptance. `ConsentPreferences` is now mounted in Privacy & data ("Cookies & tracking"), so in-app withdrawal exists; on-device verification still owed |
| **Data-subject rights (DSAR)** | `lib/clients/portalPrivacy.ts` + `PrivacyScreen` (Briefing → Account → Privacy & data modal) | `/api/privacy/{export,profile,delete,rectify}`, `privacy_requests` statutory-clock ledger, rate-limited (portal PR #78) | none | 🟡 Partial — mobile now calls the portal routes (export, rectify request, two-step deletion; feat/mobile-dsar, 2026-10-14), so the **compliance asymmetry** is closed in code but **unverified on device and against the deployed portal** (Bearer acceptance on these routes unconfirmed) |
| **Attribution** | `lib/shared/attribution.ts` present, consumed by `lib/attribution-capture.ts` (unverified) | `lib/shared/attribution.ts`, `nu_attrib` cookie, `user_attribution` table, `/api/attribution`, `AttributionCapture` client (portal PRs #78/#81) | `lib/shared/attribution.ts` **byte-identical (our PR #39)** | 🟡 Partial — module shared + drift-gated; mobile capture path now exists (feat/attribution-capture, 2026-10-14, launch/deep-link URLs only) but is unverified on device (consent prompt reachable since PR #54, 2026-10-14) |
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

> ℹ️ **Portal PR #123 (2026-09-11) assessed — headline unchanged at ~62%, two
> new response-provenance headers, neither read here yet.**
> `nuwrrrld-portal/docs/wiki-portal/decision-local-portfolio-scoring-over-upstream-wait.md`
> and its sibling
> `.../decision-local-signal-chat-over-missing-gcp3-agent.md` both close the same
> shape of outage: a gcp3 route the portal called (`/api/portfolio/health`,
> `/api/signals/{ticker}/chat`) was never actually deployed/registered, so the
> portal now answers locally when upstream doesn't, upstream still tried first.
>
> **Free fix for us on one of the two.** `lib/usePortfolio.ts` already calls
> `/api/portfolio/health`, so its panel goes from scoring against a route that
> has never once succeeded (47-day outage, `nuwrrrld-portal/docs/wiki-portal/incident-2026-07-26-portfolio-health-endpoint-missing.md`)
> to a working score, with zero change on our side — the same payoff every prior
> single-source port has had. The signal-chat fix has no effect here yet: nothing
> in this repo calls `/api/signals/{ticker}/chat`.
>
> **The label wasn't free, but this PR paid for it — half of it.** Both routes
> now emit `X-Portfolio-Health-Source` / `X-Signal-Chat-Source` (`upstream` vs.
> `local`). `usePortfolio.ts` now reads the health one, so a locally-computed
> score is labeled instead of rendering identically to a fresh gcp3 one; the
> chat header stays unread since nothing here calls that route yet. Filed as a
> new gap class in [[concept-sync-requirements]] (response-contract parity,
> not file identity) — two instances now (health, chat) make it a pattern
> worth a permanent row, not a one-off note.
>
> Neither denominator moves: no `lib/shared/` module changed, and a header is not
> a shared module.

## Where it appears

- Shared backbone: `lib/shared/` in both repos (only `sse.ts` is truly shared today)
- Identical logic modules: `lib/subscription.ts`, `lib/retention.ts`, `lib/portfolio.ts`
- The `nuwrrrld-fullstack` skill exists specifically to single-source cross-surface
  business logic and keep Clerk parity — the mechanism this page measures.

> ⚠️ **Portal beta-tester Pro allowlist (2026-09-13) assessed — headline
> unchanged at ~62%, and the third instance of the response-contract blind spot
> recorded above.** The portal added `lib/beta-testers.ts`, resolving an
> allowlisted Clerk primary-verified address to `pro` inside its `resolveTier()`
> — beta testers exercise every Pro feature with no Stripe subscription. It sits
> in portal-only `lib/subscription-admin.ts`, so `lib/subscription.ts` stays
> byte-identical with ours and neither denominator moves.
>
> **The matrix row still moved ✅ → 🟡.** We derive tier ourselves from
> `lib/subscription.ts` + Clerk metadata and know nothing about either override
> list (the admin one, from portal PR #119, has the same effect and was never
> ingested here — this entry backfills it). The same signed-in beta tester is
> therefore **Pro on web and Free in this app**. Nothing CI can see: no shared
> file drifted, and the divergence lives in a portal file that is correctly
> portal-only.
>
> **Unlike portfolio health, this is not a free fix.** Portal-owned logic reaches
> us for free only where we call a portal *route*; tier resolution is local. The
> cheap path is `useSubscription` reading `GET /api/stripe/subscription`, which
> already returns the override-aware tier — not porting the override modules,
> which would put an email allowlist in a shipped binary. Filed in
> [[concept-sync-requirements]].
>
> Mirrored from `nuwrrrld-portal/docs/wiki-portal/concept-mobile-web-parity.md`.

> ✅ **Our feat/adopt-shared-consent PR (2026-09-24) — adopts `lib/shared/consent.ts` + `legal-consent.ts`, closes the tracking half of priority #1.** Both modules are copied byte-for-byte from portal `main` and added to `scripts/check-shared-drift.mjs` (11 gated files). A new `lib/consent-store.ts` persists the same serialized record the portal keeps in its `nu_consent` cookie, under the same key, through the existing `prefs.ts` / expo-secure-store seam. Every non-necessary category stays **denied** until that store loads and the user has chosen under the current `CONSENT_VERSION`. `track()` / `identify()` are no-ops without `analytics` consent, and PostHog is never constructed before it's granted. Sentry, which was never actually started before this PR, now starts only once consent is granted and closes if it's revoked. A first-run `ConsentSheet` offers "Accept all" and "Reject all" with identical styling. We now carry **8** of portal's **28** `lib/shared/` entries (was 6). **Headline number intentionally not recomputed here.** The portal is at its 3-open-PR cap, so the mirror page can't move in the same window, and a one-sided change would fail the cross-wiki headline check. The recompute belongs to the portal follow-up that also adds `attribution` / `consent` / `legal-consent` to the portal's drift gate. Expected direction: single-source up about 2 points, and the consent domain moves from ⬅️ to 🟡, not ✅.

> ⚠️ **Correction 2026-10-14 (fix/mount-consent-live-entry).** The 2026-09-24 entry above overstated what shipped: `ConsentSheet` was mounted only in `app/_layout.tsx`, the expo-router tree, which is dead code (the entry is `index.ts` → `registerRootComponent(App)` from `App.tsx`). In the live app consent could never be granted, so analytics and Sentry stayed off (fail-safe) and the prompt was unreachable. This PR mounts the sheet once in `App.tsx`, inside the auth provider, covering both the signed-out and signed-in shells; a stored choice is honoured on relaunch. The consent row's status is unchanged (🟡) and the headline stays ~62%, not recomputed.

> ✅ **Our feat/consent-ui-signup PR (2026-10-14) — consent UI, sign-up legal consent and server sync; headline stays ~62%, not recomputed.** Three owed items land. (1) A self-contained `ConsentPreferences` component gives per-category toggles with "Strictly necessary" locked on and equal-weight Save / Reject all / Accept all, so withdrawal is as easy as giving; the consent-store listeners already reset analytics and close Sentry the moment a record changes, so revocation is immediate. (2) The required, never-pre-checked ToS/Privacy checkbox sits on the live auth screen (`screens/SignInScreen.tsx`). Google OAuth is the only sign-in path and creates accounts implicitly, so the box gates every sign-in, existing users included. It is fail-closed: if the acceptance cannot be stored, the session is not activated. A pending acceptance carries a 15-minute TTL and a one-shot nonce and is cleared on sign-out, so it cannot be attributed to a different account. (3) `lib/clients/portalConsent.ts` and `lib/usePortalConsentSync.ts` push the consent record and legal acceptance to the portal's consent endpoints for signed-in users, best-effort, serialized and latest-wins, never logging the token. **Entry point:** `ConsentPreferences` is mounted as a "Cookies & tracking" card in the DSAR `PrivacyScreen` (Briefing → Account → Privacy & data), so users can withdraw in-app; the blocking post-deletion view still takes precedence. The `app/` expo-router tree is dead code, so nothing was added there. Unverified: nothing ran on a device or against the deployed portal.

## See also

- [[concept-sync-requirements]] — the checklist to raise the number
- [[concept-backend-is-source-of-truth]] — the principle the drift violates
- [[entity-signals-digest]] · [[entity-portfolio]] · [[entity-nuai]] · [[entity-billing]] · [[entity-council-composer]]
- `nuwrrrld-portal/docs/wiki-portal/overview.md` — the portal sibling
- `nuwrrrld-portal/docs/wiki-portal/incident-2026-07-27-stripe-checkout-invalid-header.md` — the PR #45 incident that introduced the `lib/subscription.ts` drift
