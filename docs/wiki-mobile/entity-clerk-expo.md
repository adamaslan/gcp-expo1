---
date: 2026-05-22
type: entity
tags: [auth, clerk, expo]
sources: [../PHASE2_START_HERE.md, ../docs/PHASE2_CLERK_SETUP.md, ../lib/auth-provider.tsx]
---

# Entity: Clerk Expo

The auth surface for the mobile app. Provided by [`@clerk/clerk-expo`](../package.json#L11). Wraps every screen via `<ClerkProvider>` in [`lib/auth-provider.tsx`](../lib/auth-provider.tsx). Stores the session in [`expo-secure-store`](../package.json#L16) (device keychain on iOS, EncryptedSharedPreferences on Android).

## What it is

A drop-in React provider that handles sign-in, session persistence, and token issuance. The app does not implement any auth logic of its own — it delegates entirely. Google OAuth is configured in the Clerk dashboard (not in mobile code), and Clerk returns a JWT that the mobile app can attach to backend requests via `getToken()`.

## Where used

- [[entity-backend-client]] — `lib/api.ts` reserves space for `Authorization: Bearer <token>` but currently `getToken()` returns `null`
- [[entity-demo-mode]] — when `EXPO_PUBLIC_DEMO_MODE=true`, Clerk is replaced by `lib/mock-auth.tsx` and never initializes
- [[entity-config-validator]] — enforces `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is present unless demo mode is on
- `screens/SignInScreen.tsx` — drives the actual Clerk sign-in flow

## Configuration

| Env var | Required? | Where set |
|---------|-----------|-----------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes (prod) | `.env.local`, EAS secret |
| `CLERK_SECRET_KEY` | Yes (only on server-side webhook handlers) | EAS secret |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Yes (prod) | Clerk dashboard + `.env.local` |
| Google OAuth secret | Yes | Clerk dashboard only |

Real values are never written here. See [[SCHEMA#secret-policy]].

> 🚀 **Going to production?** See [[../PRODUCTION_CLERK.md]] for the full runbook on swapping `pk_test_` → `pk_live_` keys, configuring your own Google OAuth credentials, and wiring keys through EAS secrets.

## Known failures

None recorded yet. Phase 2 is "awaiting credential configuration" per the project [CLAUDE.md](../CLAUDE.md) — Clerk has not been exercised against a real key set.

> ❓ Open question: Does Clerk Expo's `getToken()` return a JWT in a format the gcp3 FastAPI can verify (audience, issuer)? Untested.

## Open questions

- What goes in the Clerk JWT custom claims? Mobile and backend haven't agreed on a user-id shape.
- How are webhooks (user.created, session.revoked) routed when the mobile app is the only client? `api/webhooks/` exists but is dormant.
- Refresh-token rotation behavior under poor connectivity — does `getToken({ skipCache: true })` retry, or fail closed?

## See also

- [[entity-demo-mode]] — the bypass path
- [[entity-backend-client]] — the planned consumer of `getToken()`
- [[decision-demo-mode-default-on]]
- [[concept-single-backend-assumption]] — auth and multi-backend land together
