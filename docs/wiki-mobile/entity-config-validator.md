---
date: 2026-05-22
type: entity
tags: [config, validation, startup]
sources: [../lib/config-validator.ts, ../api/config.ts]
---

# Entity: Config Validator (`lib/config-validator.ts`)

Startup gate that checks required environment variables are present before the app initializes Clerk, the backend client, or anything else that depends on configuration. Exposed at runtime via `GET /api/config` ([`api/config.ts`](../api/config.ts)) which returns the summary without leaking values.

## What it is

A pure-TS module that builds a `ValidationResult` over two lists:

- `REQUIRED_CONFIGS` — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `OPTIONAL_CONFIGS` — `GOOGLE_CLIENT_SECRET`, `CLERK_WEBHOOK_SECRET`, `NODE_ENV`

It reports per-config presence (`present: boolean`, never the value) and collects errors for missing required configs. The `/api/config` route returns booleans only, so it is safe to hit unauthenticated.

## Where used

- App bootstrap (planned — not yet called at startup; today only the diagnostic endpoint uses it)
- [[entity-demo-mode]] — should suppress "Clerk missing" errors when demo mode is on
- `screens/` — could show a config-warning banner in dev

## Known gaps

- **Backend URLs not checked.** `EXPO_PUBLIC_BACKEND_URL` is not in either list. [[entity-backend-client]] silently falls back to `http://localhost:3000`. Same will apply to the new per-backend URLs from [[../MULTI_BACKEND_INTEGRATION.md]].
- **Naming inconsistency.** The validator uses `NEXT_PUBLIC_*` prefixes (inherited from a Next.js setup), but Expo requires `EXPO_PUBLIC_*`. The app may be reading the wrong env var on device.

> ⚠️ Contradiction: validator checks `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`; Expo bundler only injects `EXPO_PUBLIC_*` into the client bundle. Either the validator is dead code or Clerk is being initialized from `process.env` in a context that has `NEXT_PUBLIC_*` available. Unresolved.

## Known failures

None recorded — the validator is invoked only by the diagnostic endpoint, not at startup.

## Open questions

- Should the validator block app render on missing configs in production, or warn?
- Does Clerk Expo also validate the key format internally? If yes, this validator is partly redundant.

## See also

- [[entity-clerk-expo]] — the configs being checked
- [[entity-demo-mode]] — the bypass
- [[entity-backend-client]] — the entity whose URL the validator does *not* check
