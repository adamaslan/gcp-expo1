---
date: 2026-10-12
type: concept
tags: [sync, parity, requirements, roadmap, mobile, web, shared]
sources: [../../lib, ../../lib/shared, ../../screens, nuwrrrld-portal/lib, nuwrrrld-portal/app/dashboard/page.tsx, nuwrrrld-portal/app/page.tsx]
---

# Concept — What Each Surface Needs to Sync

Companion page: [[concept-mobile-web-parity]] — the current ~62% measurement this
page is a plan to raise. Portal mirror:
`nuwrrrld-portal/docs/wiki-portal/concept-sync-requirements.md`.

## The pattern

**2026-10-12 portal slowness assessment:** portal `app/dashboard/page.tsx` now requests `/market-overview?sections=brief`, and the earlier portal PR #269 bounded the homepage's optional council sample fetch at 5 seconds in `app/page.tsx`; that bound was later replaced by portal PR #281, which reads the stored sample instead, so current `app/page.tsx` calls `getCouncilSample()` with no timeout. No feature domain or shared module is added, removed, or edited; no interactive council budget changes. For this change, the existing domain matrix and recorded feature-domain ≈76%, code-identical ≈40%, blended ~62% figures remain unchanged. This is a scoped change assessment, not a fresh audit of all shared modules. Mobile’s existing full-overview briefing and council implementation remain separate; no new mobile port or de-drift item is introduced.

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
| ~~`lib/shared/signal-policy.ts`~~ | **Done — our PR #32 (2026-08-08); re-synced our PR #43 (2026-09-04).** Adopted verbatim (pure ticker validation / cache-freshness / backoff) before we grew our own copy. Portal PR #101 added `isCryptoShaped()` to the shared module the same week; our PR #43 ported it same-day to restore byte-identity. Tracked by the drift gate. Not consumed by a feature here yet — see §2's Signal cache/queue row. |
| ~~`lib/shared/live-price.ts`~~ | **Done — our PR #32 (2026-08-08).** Adopted verbatim (pure live-price row/batch parsing). Byte-identical, tracked by the drift gate. We don't call `/api/signals/live` yet — see §2's Real-time price tier row. |
| `lib/shared/holdfold-map.ts` | New on the portal (PR #46), mobile-absent. Pure `/signals`→verdict mapper. **Not a drop-in adopt** — our `clients/holdfold.ts` targets a different backend (`EXPO_PUBLIC_HOLDFOLD_BACKEND_URL`) with a different verdict schema entirely (`symbol`/`risk_level`/`volatility_regime`/`atr` vs. this module's `ticker`/`confidenceLabel`/`bias`/`adx`). Adopting it means switching our Hold/Fold backend first, not just importing a file. |
| `lib/shared/fib-levels.ts` | New (portal PR #185), portal-only. Types the holdfold Fibonacci response and derives the ladder rows. Portable as-is. Mobile's `clients/holdfold.ts` `FibLevel` type was already corrected to `{ name, price, distance_pct, strength, type }` by mobile PR #49, so no type fix remains; adopt the module if mobile grows a Fibonacci surface (no screen renders the ladder today). Do it via `/syncpr` so both wikis update together. |
| ~~`lib/shared/attribution.ts`~~ | **Adopted — our PR #39 (2026-09-01).** Mirrored verbatim from portal `main` (portal PR #81): pure first-party acquisition model (`nu_attrib` cookie, UTM/gclid/fbclid/referrer, 90-day first-touch) with a `parseTouch` hardened against a tampered cookie (`cleanKnownKeys` filters to known string keys; `isValidTimestamp` guards `ts`). Byte-identical, `normalize: null` in the drift gate on both repos. Portal already had it on `main`, so no circular-gate stall. **Capture path now built (feat/attribution-capture, 2026-10-14; priority #8), unverified.** |
| `lib/shared/consent.ts`, `lib/shared/legal-consent.ts` | ✅ **Adopted 2026-09-24** (feat/adopt-shared-consent): byte-identical, drift-gated; `analytics.ts` + `sentry.ts` now gated on `analytics` consent via `lib/consent-store.ts` and a first-run `ConsentSheet`. **2026-10-14 (feat/consent-ui-signup):** `ConsentPreferences` component, fail-closed sign-in ToS/Privacy checkbox, and best-effort server sync now exist. The preferences component is mounted in Briefing → Account → Privacy & data ("Cookies & tracking"), so withdrawal is reachable in-app. Remaining: the **portal** drift gate still lacks all three of `attribution`/`consent`/`legal-consent`. |
| ~~`lib/digest.ts`~~ | **Re-synced — our PR #36 + portal PR #66 (2026-08-18)**, after portal's per-symbol `updated` staleness fix landed web-first and drifted for part of one day; see [[concept-mobile-web-parity]]. Originally: **logic done — our PR #30 + portal PR #51 (2026-08-07).** Fixed a real ticker-precedence bug in portal's copy (contradicted its own comment); ported portal's `dataQualityScore` here. Both copies confirmed byte-identical. Still open: physically moving the file into `lib/shared/` — a bigger, lower-priority restructuring, not required for parity. Resolves [[overview#open-issues\|open-issue #6]] and [[entity-signals-digest#open-questions]]. |
| ~~`lib/signalCard.ts`~~ | **Logic done — same PRs.** We adopted portal's `_baseAppUrl` unused-param convention; portal adopted our `encodeURIComponent(signal.id)`. Move to `lib/shared/` still open, same as `digest.ts`. |
| `lib/nuai.ts` | Reconcile chat contract (token budget, refusal guardrails, prompt-chip grounding — see [[entity-nuai]]). Ensure request/response types match the portal `/api/nuai`. |

**Definition of done:** each file exists once in `lib/shared/`, is byte-identical
as consumed by both repos, and CI fails if the two copies drift (a checksum/diff
gate).

> ⚠️ **Known limitation — the gate is circular (found 2026-08-18, our PR #36 +
> portal PR #66/#67).** Our `shared-drift-check` checks out the portal's default
> branch and theirs checks out ours, so a change to a gated file can only be
> green on one side at a time: whichever PR carries it first fails against the
> other repo's not-yet-updated `main`, and the mirror PR fails symmetrically.
> Neither can go green first. The working procedure is to open both PRs, merge
> the one whose repo the change originated in while its drift job is still red,
> then re-run the sibling's job, which now passes. The expected failure must be
> **read**, not just tolerated — confirm its output names only the file being
> ported, since an unrelated drift would otherwise ride along invisibly inside
> a failure everyone has agreed to ignore.

## 2. Port — one-surface features

### Portal has, mobile lacks
| Feature | To sync mobile needs… |
|---------|----------------------|
| **Effective-tier overrides** ([[entity-billing]]) | ✅ **Already done, verified 2026-09-24.** `lib/useSubscription.ts:30` fetches `${PORTAL_URL}/api/stripe/subscription` and uses the returned (override-aware) `tier` directly, so admin/beta overrides from the portal's `resolveTier()` do reach this app. The original concern — local tier derivation from `lib/subscription.ts` + Clerk metadata — no longer describes the code. No email allowlist ships in the binary. |
| **Backtest** | A mobile screen + a `clients/` call hitting the portal `/api/backtest/[symbol]`, or a decision that backtest stays web-only (heavier UI, desktop-first). |
| **Watchlist store** | Confirm [[entity-portfolio|usePortfolio]]'s watchlist and the portal's `watchlist-store.ts` agree on shape and persistence; ideally share the store logic. |
| **Hold/Fold cache** | Decide whether mobile should read the portal's cached verdicts or keep calling the holdemfoldem backend live. Today portal caches; mobile does not. |
| **Signal cache/queue + drain** (portal PR #40) | Portal's watchlist-add enqueues a `pending_signals` refresh drained into `signal_cache`. `lib/shared/signal-policy.ts` (ticker validation, cache-freshness, backoff) is now shared (our PR #32) — we have the pure logic but not the queue/cache feature built on top of it. |
| **Real-time price tier** (portal PR #40) | Portal added a Finnhub WS → `/api/signals/live` → `live_prices` lane. `lib/shared/live-price.ts` parsing is now shared (our PR #32) — we still need either a `clients/` call to `GET /api/signals/live` for sub-second quotes, or a decision that live quotes stay web-only. |
| **Public council demo + share cards** (portal PR #43) | Portal-only by nature — a growth/marketing surface, not core product. If mobile ever wants an app-store-listing teaser or a deep-link share flow, copy the pattern: ticker-only input (no free text from anonymous callers), fail-closed quota, cache-then-quota ordering. |
| **Daily Brief** (`/api/brief`, portal PR #46) | Grounded, structured (market overview + Hold/Fold verdicts), 4-sentence one-shot completion — cheap and fast (~0.5–1.3s to gather data) vs. our `BriefingScreen`'s full long-term council prompt. To offer this lighter format here we'd first need a Hold/Fold data source normalized to the portal's verdict shape (see §1's `holdfold-map.ts` row) — not a simple port. |

### Response-contract parity — a new gap class, not yet in the table above

**2026-09-11, from portal PR #123.** The portal's `/api/portfolio/health` now
carries `X-Portfolio-Health-Source: upstream | local`, and its new
`/api/signals/{ticker}/chat` carries `X-Signal-Chat-Source: upstream | local` —
both name which path actually answered (gcp3, or the portal's own fallback
computation) after gcp3's route for each turned out to be undeployed/unregistered.
`lib/usePortfolio.ts` already calls the first endpoint and, as of this same PR,
reads `X-Portfolio-Health-Source`; no caller here hits the second route yet, so
`X-Signal-Chat-Source` remains unread.

This does not move either denominator — no `lib/shared/` module changed, and
`X-*-Source` is a header, not a shared function — but it is a real drift `npm
run check:shared-drift` cannot see, because nothing about it is a file. The
portal's own wiki flags the same shape twice now (health, then chat) and calls
it a pattern: **the drift gate needs a notion of response-contract parity, not
just file identity.**

- ✅ `X-Portfolio-Health-Source` — closed in this same PR:
  `usePortfolio.ts` reads it, `PortfolioScreen.tsx` shows a note when the
  answer came from the portal's local fallback rather than gcp3.
- ❓ `X-Signal-Chat-Source` — still open. If/when a per-ticker chat screen is
  built here, read it from the start rather than adding it later, the same
  gap class this entry exists to flag.

### Mobile-only performance note (not a port item)

**Resolved 2026-10-14 (profiled, then fixed).** `getMarketOverview()`
(`lib/clients/gcp3.ts`) used to fetch the unscoped `/market-overview` with an
8s timeout, while the backend needs roughly 16-20s unscoped, so the call timed
out on every load and neither `HomeScreen` nor `BriefingScreen` ever rendered
overview data. Per-section measurement showed `brief`, `sentiment` and
`history` each answer in about 0.1s; the `ai_summary` section alone accounts
for essentially all of the ~16s. The earlier suggestion here (scope to
`brief,ai_summary,sentiment`) would therefore not have helped, since it keeps
the slow section; that combination measured ~16s too.

Shipped fix: `getMarketOverview()` now requests `sections=brief,sentiment`
(8s timeout), and a new `getMarketOverviewAi()` requests `ai_summary` alone
(25s timeout). `BriefingScreen` renders from the fast call and merges the five
AI fields in when the slow call returns; an AI failure is non-fatal.
`HomeScreen` needs no AI fields and uses only the fast call. Mobile-only; no
shared module involved, so no port or de-drift item.

### Mobile has, portal lacks
| Feature | To sync portal needs… |
|---------|----------------------|
| **Onboarding** (`OnboardingScreen`) | A first-run/onboarding flow in the portal, or a decision that web onboarding is handled by the marketing/landing site — portal PR #42 substantially strengthened that landing site (plain-language copy, brand-aligned tokens, a fixed market-data bug, scroll/parallax motion), making "the landing page is portal's onboarding" a more credible answer than before, though still undecided. |
| **Analytics + Sentry** (`analytics.ts`, `sentry.ts` — [[entity-monitoring]]) | The portal has no client analytics/error-reporting module found. Add equivalents (Vercel Analytics + Sentry Next.js SDK) for observability parity. |
| **Schwab health** (`schwab-health.ts`) | A portal health check for the Schwab integration, if that integration is meant to surface on web. |

**2026-10-14, mobile PR fix/portfolio-health-guard.** Drift-gate coverage item:
`lib/portfolio.ts` and `lib/retention.ts` are now gated on the mobile side (13
gated files). Still open: the portal's gate needs the mirror entries (portal PR
pending; `portfolio.ts` only after this merges), and `lib/nuai.ts` remains
divergent and ungated (26 lines), tracked separately above.

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
6. ~~Adopt `lib/shared/attribution.ts` before we reimplement it.~~ — **done, our PR #39 (2026-09-01).** Byte-identical, drift-gated. Not consumed yet — see #8.
7. ~~**Adopt `lib/shared/consent.ts` + `legal-consent.ts` and gate `analytics.ts` / `sentry.ts` behind them**~~ — **done 2026-09-24** (feat/adopt-shared-consent) for tracking consent. Consent UI, the sign-in ToS/Privacy checkbox and server sync **done 2026-10-14** (feat/consent-ui-signup). `ConsentPreferences` is mounted in `PrivacyScreen` (Privacy & data → "Cookies & tracking"), so the entry point exists. Nothing consent-side remains owed on mobile except on-device verification.
   - 2026-10-14 correction: the first-run prompt was unreachable until `ConsentSheet` was mounted in the live `App.tsx` (fix/mount-consent-live-entry). The prompt is now reachable; the preferences component, sign-in ToS checkbox and server sync landed 2026-10-14 (feat/consent-ui-signup); the preferences entry point now exists in Privacy & data.
8. **Built, pending verification (feat/attribution-capture, 2026-10-14):** the mobile attribution-capture path consuming `lib/shared/attribution.ts` now exists (`lib/attribution-capture.ts`, `lib/useAttributionCapture.ts`, mounted in the live `App.tsx`). It reports a 90-day first touch to the portal route once, only when signed in and analytics consent is granted (default-deny, re-checked before persist and before the request; revocation deletes the stored touch). Still open: it sees only launch and deep-link URLs, so Play Install Referrer and App Store install referrers are NOT captured; consent and first-touch values go in a Cookie header because the portal reads consent from a cookie, unverified on a device; nothing ran against the deployed portal; and consent is now reachable since mobile PR #54 (merged 2026-10-14), so capture is no longer inert (still unverified on a device).
9. ~~Build a mobile DSAR path (export / delete / rectify)~~ — **built, pending verification (feat/mobile-dsar, 2026-10-14).** `lib/clients/portalPrivacy.ts` + `screens/PrivacyScreen.tsx`, reachable Briefing → Account → "Privacy & data". Still open: (a) exercise on a device against the deployed portal; (b) confirm the portal's edge `auth.protect()` accepts a Clerk mobile Bearer token on `/api/privacy/*` (works for the subscription route; unconfirmed here); (c) test large-export sharing on Android; (d) portal-side: `/api/privacy/rectify` is missing from the proxy matcher and relies only on its handler's `auth()`.
10. Record the AI Council convergence decision.
11. Port observability (analytics/Sentry) to portal; port backtest to mobile (or decide against). Wire ourselves up to consume `signal-policy.ts`/`live-price.ts` if the real-time signal tier is ever ported.

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
