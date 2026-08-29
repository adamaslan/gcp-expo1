# Wiki Operations Log

Append-only chronological record of every wiki operation. See [[SCHEMA#log-format]] for the entry format. Parseable with `grep "^## \[" log.md | tail -10`.

---

## [2026-07-30] ingest | testing + free-tier robustness pages (mirror) | pages touched: 3

Created the mobile counterparts to the portal's two new concept pages.

- `concept-test-strategy.md` — documents an **absence** honestly: this repo has
  no test framework and no test files (no jest/vitest/testing-library/detox in
  package.json). What exists is `npm run smoke` (backend reachability, not a
  test suite) and `npm run gen:types`, which is the de facto contract check —
  a backend shape change becomes a build-time type error. Argues the first
  tests should target `lib/subscription.ts`, `lib/retention.ts`,
  `lib/portfolio.ts` and `lib/shared/*`: pure logic needing no RN runtime, and
  testing them here turns [[concept-mobile-web-parity]]'s "byte-identical"
  claims into something *enforced* rather than asserted. Portal PR #45 drifted
  `subscription.ts` and nothing on this side noticed.
- `concept-free-tier-resilience.md` — mobile's free tier is a different axis
  from the portal's: GCP always-free infra, not free model inference. Key
  framing recorded: **cost scales with cron cadence, not users** (the nightly
  bake is the budget; 10–100 DAU adds pennies). Carries across the portal's
  2026-07-30 lesson — enumerate which free-tier limits are per-resource vs.
  per-account, because redundancy only helps against the former.

Sharpest finding, **verified in code**: [[entity-resilience-layer]]'s policy
table claims "Retry on 4xx: Never" and states the values were checked against
the source — but `withRetry`'s default is
`shouldRetry = (error) => !error.message.includes("validation")`
(`lib/resilience/network-resilience.ts:22`), which retries every error not
containing that substring, 4xx and **429** included, up to 3 attempts. Retry is
right for an outage and harmful for a quota failure: it spends the budget that
is already exhausted, turning one rejected request into three. Marked as a
contradiction on `entity-resilience-layer.md` (page vs. code) and recorded as
hardening item #1 on the new free-tier page. Not fixed — code change, not a
docs change.

## [2026-07-30] sync | portal PR #46 parity check (mirror) — new lib/shared/holdfold-map.ts, Daily Brief row added | pages touched: 3

Portal fixed `/api/brief` (was calling a nonexistent `/holdfold` endpoint and
an unscoped, 16.4s `/market-overview` — both always failed silently) by
extracting a `/signals`→verdict mapper into `lib/shared/holdfold-map.ts`.
Not adoptable here as-is: our `clients/holdfold.ts` hits a different backend
with an incompatible verdict schema, so this is a fourth portal-only
`lib/shared/` file, same share-debt pattern as `signal-policy.ts` /
`live-price.ts`. Also added a new "Daily Brief / Market Briefing" matrix row
(🔴 Divergent) — our `BriefingScreen` was never tracked despite being the
mobile analogue of portal's `/api/brief`, just architecturally different
(full council prompt vs. one-shot structured completion). Flagged our own
`getMarketOverview()` as carrying the same unscoped-fetch cost portal just
fixed — worth profiling whether we actually need `history`. Headline
~61%→~60% (single-source ~37%→~36%; feature-domain ~82% unchanged).

## [2026-07-27] sync | portal PR #45 parity check (mirror) — `lib/subscription.ts` newly drifted | pages touched: 3

Mirror of the portal-side check after nuwrrrld-portal PR #45 — a Stripe
checkout production incident fix (`nuwrrrld-portal/docs/wiki-portal/incident-2026-07-27-stripe-checkout-invalid-header.md`):
a malformed `STRIPE_SECRET_KEY` threw an unhandled `ERR_INVALID_CHAR` inside
`stripe.checkout.sessions.create`, plus Clerk was found serving a dev-instance
key (`pk_test_...`) on the production domain. Fix added defensive try/catch on
the Stripe SDK calls, `/api/health` checks for both misconfig classes, and —
the piece that matters for this wiki — a new `parseSubscriptionMetadata()` in
`lib/subscription.ts` **on the portal side only**. Confirmed via `diff`
against this repo's `lib/subscription.ts` that the two files were
byte-identical before that change; this is new, real drift in a module the
parity matrix previously counted as one of only four fully-synced shared
modules. Single-source parity ~38%→~37%, blended ~62%→~61%. Updated
`concept-mobile-web-parity.md` (assessment note + matrix row downgraded to
🟡 Partial) and `concept-sync-requirements.md` (new #1-priority de-drift row:
port `parseSubscriptionMetadata()` here verbatim). Full portal-side ingest —
new `entity-billing.md` and the incident page — lives in
`nuwrrrld-portal/docs/wiki-portal/`, referenced by path per this wiki's
cross-repo convention, not duplicated here.

---

## [2026-07-24] sync | portal PR #43 parity check (mirror) — +1 matrix row | pages touched: 3

Mirror of the portal-side check after nuwrrrld-portal PR #43 (landing Phase
3+4: sticky scrollytelling council demo, RISK-seat spotlight, "how it works"
section, plus a no-login public council demo, OG verdict share cards, and
public verdict pages). Reuses the existing portal-only `lib/openrouter.ts` AI
Council stack — no `lib/shared/` file touched — so single-source parity is
unchanged. Added one matrix row ("Public council demo + share cards",
portal-only) since it's a real AI-Council-adjacent surface worth tracking.
Updated `concept-mobile-web-parity.md` and `concept-sync-requirements.md`
(noted as a pattern to copy if mobile ever wants an app-store teaser). Portal
mirror: `nuwrrrld-portal/docs/wiki-portal/`.

---

## [2026-07-24] sync | portal PR #42 parity check (mirror) — no change | pages touched: 3

Mirror of the portal-side check after nuwrrrld-portal PR #42 (signed-out
landing-page revamp: plain-language copy, brand-token alignment onto the neon
palette, a fixed market-data shape bug, and Framer Motion/Lenis/parallax
polish). Touches no `lib/shared/` module and no cross-surface business logic —
it's the portal's public marketing surface, which this app has no direct
analog for (nearest equivalent, `OnboardingScreen`, already tracked as
mobile-only). Headline (~62%) and matrix left unchanged; added a dated
assessment note to `concept-mobile-web-parity.md` and updated the Onboarding
row in `concept-sync-requirements.md`. Portal mirror:
`nuwrrrld-portal/docs/wiki-portal/`.

---

## [2026-07-24] sync | portal PR #40 parity recompute (mirror) | pages touched: 3

Mirror of the portal-side sync after nuwrrrld-portal PR #40 (real-time signal
tier: pending_signals queue, read-through signal_cache, Finnhub WS live-price
lane). Headline dropped ~65% → **~62%** — feature-domain parity held (~82%) but
single-source parity fell ~44% → ~38% because the portal added several
signal-plane modules with no mobile counterpart, two of them
(`lib/shared/signal-policy.ts`, `lib/shared/live-price.ts`) inside the
supposedly-shared folder. Updated `concept-mobile-web-parity.md` (headline +
matrix), `concept-sync-requirements.md` (new adopt-before-drift + port rows),
and `index.md`. Portal mirror: `nuwrrrld-portal/docs/wiki-portal/`.

---

## [2026-05-22] init | initial wiki creation | pages created: 13

Initial scaffolding of `docs/wiki-mobile/` following the pattern from `gcp3/docs/wiki-gcp3/`. Pages created:

- Meta: `Welcome.md`, `SCHEMA.md`, `ORIGIN.md`, `index.md`, `log.md`, `overview.md`
- Entities: `entity-clerk-expo`, `entity-backend-client`, `entity-resilience-layer`, `entity-demo-mode`, `entity-config-validator`, `entity-monitoring`
- Concepts: `concept-single-backend-assumption`, `concept-backend-is-source-of-truth`, `concept-archive-not-delete`
- Decisions: `decision-demo-mode-default-on`, `decision-single-backend-url-was-temporary`, `decision-no-handrolled-types`, `decision-aitext-deploy-deferred`

Sources synthesized: `docs/MULTI_BACKEND_INTEGRATION.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, `PHASE2_START_HERE.md`, `PHASE3_COMPLETE.md`, `PHASE4_PHASE5_COMPLETION.md`, `lib/api.ts`, `lib/auth-provider.tsx`, `lib/mock-auth.tsx`, `lib/config-validator.ts`, `lib/resilience/`, `lib/monitoring.ts`, plus inspection of `holdemfoldemapp/backend/` and `ai-text-opt-1024/backend/` to confirm deploy status.

Open questions surfaced for future ingests:
- Clerk JWT format vs. backend verification
- `NEXT_PUBLIC_*` vs. `EXPO_PUBLIC_*` env var naming inconsistency in [[entity-config-validator]]
- Demo-mode pinning in EAS production builds
- Circuit breaker scope (per-backend vs per-call) in [[entity-resilience-layer]]
- ai-text-opt deploy ownership

No incidents recorded — there are none yet.

---

## [2026-05-23] sync | sources: PR #5 + PR #6 + new /update-wiki slash command | pages touched: 14

First full sync since the initial wiki creation. Triggered by the merge of:

- **PR #5** ([feat(infra): multi-backend client architecture + dev launcher](https://github.com/adamaslan/gcp-expo1/pull/5)) — `lib/http.ts`, `lib/clients/{gcp3,holdfold,aitext,council}.ts`, `lib/secure-storage.ts`, `lib/ui/theme.ts`, `components/{CouncilPanel,TabBar}.tsx`, `scripts/dev-all.sh`, three new docs (MULTI_BACKEND_INTEGRATION, COST_OPTIMIZATION_5_DOLLAR, PRODUCTION_CLERK)
- **PR #6** ([feat(ui): three feature screens with AI Council tap-in + dual-view chat](https://github.com/adamaslan/gcp-expo1/pull/6)) — `screens/{Briefing,HoldFold,Chat,SignIn}Screen.tsx`, App.tsx (tabs + 1h session cap)

**Stale pages updated (7):**
- `entity-backend-client.md` — rewrote to reflect `lib/clients/` and the shim, removed "planned" framing
- `concept-single-backend-assumption.md` — added ✅ Resolved banner; struck-out "Where it appears" entries
- `decision-single-backend-url-was-temporary.md` — marked ✅ Validated with PR #5 link
- `overview.md` — full re-sync: SDK 54, new entity map, data flow no longer dashed, health table mostly ✅
- `entity-clerk-expo.md` — added Google OAuth wiring, 1h session cap section, [[entity-secure-storage]] dependency, two near-incidents
- `entity-config-validator.md` — added `BACKEND_URL_CONFIGS`; updated naming-inconsistency note
- `index.md` — added new pages, grouped entities by domain, struck out resolved concept

**New pages created (7):**
- `entity-http.md` — the shared HTTP primitive
- `entity-council-composer.md` — the prompt builders + askCouncil composer
- `entity-secure-storage.md` — cross-platform storage shim
- `entity-dev-launcher.md` — `npm run dev` + 5-process orchestration
- `concept-council-tap-in.md` — LLM-on-demand pattern, Rule 4 enforcement
- `decision-1h-session-cap.md` — client + server double-cap rationale
- `decision-dual-view-with-agree.md` — parallel viewpoints + opt-in synthesis

**Open questions surfaced for future ingests:**
- Should `lib/http.ts`'s `shouldRetry` heuristic ("error message contains '4'") be replaced with a proper `HttpError(code)` class? ([[entity-http#open-questions]])
- Should the agreement prompt be cached by `hash(question + shortView + longView)` to save Gemini cost on repeat-tap? ([[entity-council-composer#open-questions]])
- Does the 1h client cap fire correctly across iOS app suspend/resume? ([[entity-clerk-expo#open-questions]])
- Should the dev launcher detect first-run (embed model not cached) and warn? ([[entity-dev-launcher#open-questions]])

**Tooling shipped alongside:**
- `.claude/commands/update-wiki.md` — the slash command that orchestrates this kind of sync going forward. Supports sub-commands: `sync` (default), `ingest <path>`, `refresh <page>`, `lint`, `archive <page>`. Documents the audit → plan → apply → self-check pipeline.

**Schema compliance check:**
- All new entity pages have required sections (What it is, Where used, Known failures, Open questions, See also): ✅
- All new pages in index.md under their type sections: ✅
- No secrets in any new page (no Clerk keys, no Cloud Run URLs, no GCP project IDs): ✅
- All new pages have ≥3 cross-links to other wiki pages: ✅
- log.md entry present: ✅ (this entry)

## [2026-07-02] sync | PR #12–#24 (12 PRs, Weeks 1-14 product build) | pages touched: 8

Wiki was 5+ weeks stale (last sync 2026-05-23). Since then, 12 PRs shipped a
near-complete product build: auth hardening + rebrand (#12), landing pages
(#13), billing/paywall (#14), stability + beta (#15), signal digest + Nu AI
(#16), portfolio hooks (#17), app store metadata (#18), push + share (#19),
retention streak/trial banner (#20), settings/billing UI (#21), authenticated
checkout (#22), and a streaming regression fix (#24).

**New pages created (4):**
- `entity-billing.md` — Clerk-sourced subscription status, Settings tab, authenticated checkout (not browser redirect, as of PR #22)
- `entity-retention.md` — streak tracking, push opt-in (never-prompt-on-first-launch), native share sheet, trial expiry banner
- `entity-signals-digest.md` — schema-versioned `lib/digest.ts`, `adaptLiveSignals`, `SignalDigestCard`
- `entity-nuai.md` — chat contract, refusal guardrails, token budget, SSE streaming fix (PR #24)

**Updated pages (4):**
- `overview.md` — full re-sync: health table +6 rows, entity map +4 entities, open issues +2 (digest adapter divergence, legal consent parity)
- `index.md` — added Product section (4 new entities), Open Cross-Wiki Items section
- `log.md` — this entry

**Cross-repo finding surfaced this sync:**
- `nuwrrrld-portal`'s `docs/live-data-wiring.md` (2026-06-27) independently drafts an `adaptLiveSignals` adapter that disagrees with mobile's `lib/digest.ts` version on error handling and field mapping. Flagged as an open issue in both this wiki (`overview.md` #6) and the new `nuwrrrld-portal` wiki being created in this same session — needs a real reconciliation pass, not just documentation.
- `docs/todo1.md` in `nuwrrrld-portal` requires ToS/Privacy consent checkboxes at sign-up on **both** apps; portal has the routes, mobile parity unconfirmed — flagged as `overview.md` open issue #7.

**Not covered this sync (lower priority / needs deeper read):**
- `lib/portfolio.ts` (Week 7-8 portfolio intelligence hooks, PR #17) — no entity page yet
- `lib/schwab-health.ts`, `lib/sentry.ts`, `lib/analytics.ts` — cross-cutting utilities added across several PRs, not yet given entity pages
- `landing/` static HTML pages (PR #12/#13 rebrand) — not wiki-linked
- App Store submission status (metadata present per PR #18, but submission itself not verifiable from repo state)

**Schema compliance check:**
- New entity pages have required sections (What it is, Where used, Known failures, Open questions, See also): ✅
- New pages added to `index.md` under Entities: ✅
- No secrets in any new page: ✅
- All new pages have ≥3 cross-links: ✅
- log.md entry present: ✅ (this entry)

## [2026-07-15] ingest | PR #27 style(mobile): migrate all screens to dark neon theme palette | pages touched: 3

PR #27 replaced the indigo-based dark palette in `lib/ui/theme.ts` with the portal-aligned neon-cyan palette (`#2fd8ff` accent, `#06070d` base). Five screen StyleSheets migrated from hardcoded hex to theme tokens: NuAIScreen, OnboardingScreen, DigestScreen, HomeScreen, SignInScreen. CouncilPanel fixed to use `theme.accent.indigo` instead of removed `theme.accent.indigoDeep`.

**Pages created (1):**
- `decision-neon-dark-theme-palette.md` — records the palette unification decision, alternatives rejected, and open question about a shared `@nuwrrrld/tokens` package

**Pages updated (2):**
- `index.md` — added new decision under Active Decisions
- `log.md` — this entry

## [2026-07-21] ingest | PR #28 Prompt chips, signals workbench, watchlist screen, haptics, skeletons | pages touched: 4

PR #28 closed most of the mobile Phase B/C catch-up items from `homebase/interactivity-15.md`: Nu AI prompt chips + a watchlist-context chip, `lib/shared/signalFilters.ts` + search/filter/sort on DigestScreen (persisted via new `lib/shared/prefs.ts`), `expo-haptics` across HoldFold/Digest/NuAI taps, a new Portfolio tab wiring the previously-unused `usePortfolio` hook, and skeleton loading placeholders in `StateView`. Companion portal-side PR (adamaslan/nuwrrrld-portal#39) added ticker-mention grounding to Nu AI's system prompt and extracted the matching `signalFilters.ts`/`prompts.ts` there.

**Pages created (1):**
- `entity-portfolio.md` — new entity; documents `usePortfolio`/`portfolio.ts` getting a real UI consumer for the first time, plus the same-day portal env-var incident that broke its health score data source

**Pages updated (3):**
- `entity-nuai.md` — `lib/sse.ts` relocation to `lib/shared/`, prompt chips, watchlist-context chip, portal-side ticker grounding
- `entity-signals-digest.md` — new `lib/shared/signalFilters.ts` + `lib/shared/prefs.ts`, DigestScreen search/filter/sort
- `index.md` — added `entity-portfolio`, updated `entity-nuai` line, bumped last-updated date

## [2026-07-24] sync | cross-surface parity analysis | pages touched: 4 (concept-mobile-web-parity, concept-sync-requirements, index; portal mirror)

## [2026-07-26] cross-repo | Portfolio health endpoint never implemented | pages touched: 2 (entity-portfolio, log)

The portal-side investigation into "Health score unavailable" found the root
cause is not env-var corruption (the 2026-07-21 fix recorded on
`entity-portfolio`) but a **missing gcp3 route** — `/api/portfolio/health` was
never registered; `portfolio_analyzer.py` is orphaned. Mobile's Portfolio tab is
broken by the same route via `usePortfolio()`.

Recorded on `entity-portfolio` that the env-var fix moved the failure from 503
to 502 while rendering the *same* user-facing string, which is why the real
cause stayed hidden — flagged explicitly so this isn't re-diagnosed as an env
problem. Also noted mobile inherits the portal↔gcp3 contract drift: a missing
`score` coerces to `0`, which would show **Grade F for every user** on this
screen once the route lands.

Full write-up:
`nuwrrrld-portal/docs/wiki-portal/incident-2026-07-26-portfolio-health-endpoint-missing.md`

## [2026-08-06] ingest | Portal PR #48 feat(ci): env-schema validator, CI test job, lint fix | pages touched: 1
## [2026-08-07] ingest | Our PR #29 fix(subscription): port parseSubscriptionMetadata() — single-surface de-drift, headline ~60%→~61% | pages touched: 3
## [2026-08-07] ingest | Portal PR #50 fix(shared): reconcile signalFilters.ts/prefs.ts with us — single-surface de-drift, headline ~61%→~62% | pages touched: 4
## [2026-08-07] ingest | Our PR #30 + portal PR #51 fix(shared): reconcile digest.ts/signalCard.ts — dual-surface de-drift + ticker-precedence bugfix, resolves open-issue #6, headline ~62%→~64% | pages touched: 4
## [2026-08-08] ingest | Our PR #32 fix(mobile): resolve all 38 tsc --noEmit errors on baseline + adopt lib/shared/signal-policy.ts + live-price.ts from portal — headline ~64%→~66% (single-source ~41%→~44%) | pages touched: 1
## [2026-08-08] ingest | Our PR #33 feat(ci): shared-core drift-detection gate (our side) — supersedes stale PR #31 (closed, content already on main), also fixes usePortfolio 204 empty-watchlist bug, headline unchanged ~66% | pages touched: 3
## [2026-08-14] ingest | Portal PR #59 feat(ci): afternoon pre-close pipeline workflow + GCP scheduler setup script — CI/scheduler infra only, no shared-code or feature-domain change, headline unchanged ~66% | pages touched: 1
## [2026-08-18] ingest | Portal PR #64 + #65 assessed — e2e test tooling (#64) + second-pass review adding a portal-only dashboard health-status banner (#65); no lib/shared/ or feature-domain change, no mobile counterpart (no e2e tier / no /api/health probe here), headline unchanged ~66% | pages touched: 2
## [2026-08-18] ingest | Our PR #36 fix(subscription): trialEnd only while trialing + ported portal's lib/digest.ts per-symbol timestamp fix — restores digest.ts to byte-identical, headline unchanged ~66% | pages touched: 2

Portal PR #66 changed `lib/digest.ts` web-only: `adaptLiveSignals` now derives `generatedAt`/`isStale` from each symbol's own `updated` field, falling back to the batch-wide timestamp only when a symbol omits one — fixing a symbol whose data lagged the batch inheriting the batch's fresh timestamp and never tripping `computeIsStale()`. Because each repo's `shared-drift-check` checks out the *other* repo's default branch, that one-sided change turned the gate red on both repos at once, and neither could clear first. Porting the identical fix here broke the deadlock: merge portal #66 → re-run our job (green) → merge this PR → re-run theirs (green). `digest.ts` is byte-identical again. No new shared module, so neither denominator moves — a repair of existing single-source parity, not an extension.

## [2026-08-29] cross-repo | Portal PR #77 feat(consent): cookie consent + sign-up legal consent + privacy rights — headline ~66% → ~63% | pages touched: 2

Portal PR #77 (Phases 2, 1.4, 6 of `nuwrrrld-portal/docs/todo-auth-cookies-tracking.md`) added
cookie/tracking consent to the portal: a consent banner + per-category preferences in its root
layout, the `nu_consent` first-party cookie via `POST /api/consent`, append-only `consent_records`
+ `legal_consent_events` tables, an unticked ToS/Privacy checkbox gating Clerk sign-up, and
`/api/privacy/{export,profile,delete}` data-subject-rights endpoints.

Parity ⚠️: **headline ~66% → ~63%.** Feature-domain ~82% → ~76% — "Cookie consent / privacy
rights" is a genuine cross-surface obligation (GDPR/CPRA bind this app too) that exists web-only,
so it counts as a gap. Single-source ~44% → ~40% — no de-drift this round and two new portal-only
`lib/shared/` modules (`consent.ts`, `legal-consent.ts`); portal now has 15 shared modules to our
5. Both are adoptable today — only the prefs storage seam differs. New contradiction logged: this
app tracks (`analytics.ts` + `sentry.ts`) with no consent gate while the portal now blocks
tracking until opt-in, so the shared-identity product is non-compliant until we adopt the module.
`concept-sync-requirements.md` priority #6, `concept-mobile-web-parity.md` matrix + contradictions.

## [2026-08-29] ingest | portal auth/DSAR/analytics PR | pages touched: 3

Immediate follow-up to portal PR #77, built on that branch. Headline ~63% →
~62%: `lib/shared/attribution.ts` is a third portal-only shared module
(single-source ~40% → ~38%), and the portal's data-subject-rights surface
(`/api/privacy/{export,profile,delete,rectify}` + the `privacy_requests`
statutory-clock ledger) plus its consent-gated analytics sink are web-only.

Stacked on the consent contradiction logged for #77, that is a second
compliance asymmetry on one Clerk identity: GDPR access, erasure and
rectification work on web and have no mechanism here. Sync requirements gain
#9 (adopt `attribution.ts`) and #10 (link out to the portal's rights endpoints
rather than reimplement, keeping the cascade single-copy).
