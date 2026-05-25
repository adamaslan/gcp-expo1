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
