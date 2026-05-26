---
date: 2026-05-23
type: entity
tags: [config, validation, startup]
sources: [../lib/config-validator.ts, ../api/config.ts]
---

# Entity: Config Validator (`lib/config-validator.ts`)

Startup gate that checks required environment variables are present before the app initializes Clerk, the backend clients, or anything else that depends on configuration. Exposed at runtime via `GET /api/config` ([`api/config.ts`](../api/config.ts)) which returns the summary without leaking values.

## What it is

A pure-TS module that builds a `ValidationResult` over three lists:

- `REQUIRED_CONFIGS` — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `BACKEND_URL_CONFIGS` — `EXPO_PUBLIC_GCP3_BACKEND_URL`, `EXPO_PUBLIC_HOLDFOLD_BACKEND_URL`, `EXPO_PUBLIC_AITEXT_BACKEND_URL` (added in PR #5)
- `OPTIONAL_CONFIGS` — `GOOGLE_CLIENT_SECRET`, `CLERK_WEBHOOK_SECRET`, `NODE_ENV`, plus all `BACKEND_URL_CONFIGS`

It reports per-config presence (`present: boolean`, never the value) and collects errors for missing required configs. The `/api/config` route returns booleans only, so it is safe to hit unauthenticated.

## Backend URLs

The three backend URLs are intentionally **optional**, not required. Reason: each per-backend client in `lib/clients/*.ts` falls back to a localhost dev port if its env var is unset, which makes `git clone && npm run dev` work without any env setup. In production builds, EAS secrets must set them — see [[../PRODUCTION_CLERK.md]] for the pattern.

A `getBackendUrls(): BackendUrlStatus` helper exposes the resolved URLs and an `allConfigured: boolean` flag so the diagnostic UI can show which backends are live vs. defaulting to localhost.

## Where used

- App bootstrap (planned — not yet called at startup; today only the diagnostic endpoint uses it)
- [[entity-demo-mode]] — should suppress "Clerk missing" errors when demo mode is on
- `screens/` — could show a config-warning banner in dev

## Known gaps

- **Naming inconsistency.** The validator still checks `NEXT_PUBLIC_*` prefixes (inherited from a Next.js setup) for the Clerk/Google configs, but Expo only injects `EXPO_PUBLIC_*` into the client bundle. App.tsx reads `process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` directly, so the validator's check on `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is effectively dead code on Expo. .env.local works around this by setting both prefixes for Clerk keys.

> ⚠️ Contradiction: validator checks `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`; Expo bundler only injects `EXPO_PUBLIC_*` into the client bundle. .env.local is currently dual-prefixed for Clerk to work around this. Still unresolved at the validator level — either rewrite the required list to use `EXPO_PUBLIC_*`, or accept the validator as a Next.js-only check and rely on App.tsx's own throw-on-missing for Expo.

## Known failures

None recorded — the validator is invoked only by the diagnostic endpoint, not at startup.

## Open questions

- Should the validator block app render on missing configs in production, or warn?
- Does Clerk Expo also validate the key format internally? If yes, this validator is partly redundant.

## See also

- [[entity-clerk-expo]] — the configs being checked
- [[entity-demo-mode]] — the bypass
- [[entity-backend-client]] — the entity whose URLs the validator now DOES check (as of PR #5)
- [[entity-http]] — consumes the backend URLs via the per-backend clients
- [[../PRODUCTION_CLERK.md]] — runbook for setting these env vars via EAS secrets in production
