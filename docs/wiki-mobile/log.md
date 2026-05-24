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
