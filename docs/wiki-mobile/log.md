# Wiki Operations Log

Append-only chronological record of every wiki operation. See [[SCHEMA#log-format]] for the entry format. Parseable with `grep "^## \[" log.md | tail -10`.

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
