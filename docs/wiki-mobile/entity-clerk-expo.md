---
date: 2026-05-23
type: entity
tags: [auth, clerk, expo, session]
sources: [../PHASE2_START_HERE.md, ../docs/PHASE2_CLERK_SETUP.md, ../docs/PRODUCTION_CLERK.md, ../lib/auth-provider.tsx, ../App.tsx, ../screens/SignInScreen.tsx]
---

# Entity: Clerk Expo

The auth surface for the mobile app. Provided by [`@clerk/clerk-expo`](../../package.json) (v2.19). Wraps every screen via `<ClerkProvider>` in [`App.tsx`](../../App.tsx) and exposes session state via [`lib/auth-provider.tsx`](../../lib/auth-provider.tsx). Session token persistence routes through [[entity-secure-storage]] (Keychain on iOS, EncryptedSharedPreferences on Android, `localStorage` on web).

## What it is

A drop-in React provider that handles sign-in, session persistence, and token issuance. The app does not implement auth logic of its own — it delegates entirely. The actual sign-in flow lives in [`screens/SignInScreen.tsx`](../../screens/SignInScreen.tsx), which uses `useOAuth({ strategy: 'oauth_google' })` from `@clerk/clerk-expo` plus `expo-web-browser` for the system-browser OAuth dance on native. On web, Clerk handles the redirect itself.

As of PR #6 (2026-05-23) the app also enforces a **1-hour client-side session cap** — see [[decision-1h-session-cap]] for the rationale.

## Where used

- [[entity-backend-client]] — the shim still reserves space for `Authorization: Bearer <token>` but `getToken()` returns `null` (no backend yet verifies a token)
- [[entity-http]] — `httpJson` accepts a `token` option; not currently populated
- [[entity-demo-mode]] — when `EXPO_PUBLIC_DEMO_MODE=true`, sign-in is bypassed and the tab UI is rendered without a Clerk session
- [[entity-config-validator]] — enforces `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is present unless demo mode is on
- [[entity-secure-storage]] — the cross-platform storage layer used by Clerk's `tokenCache` (passed into `<ClerkProvider>` in App.tsx)
- `screens/SignInScreen.tsx` — drives the actual `useOAuth({ strategy: 'oauth_google' })` flow
- `App.tsx` — gates the tab UI on `isSignedIn || demoMode`, runs the 1-hour session check on a 60s interval

## Configuration

| Env var | Required? | Where set |
|---------|-----------|-----------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes (prod) | `.env.local`, EAS secret |
| `CLERK_SECRET_KEY` | Yes (only on server-side webhook handlers) | EAS secret |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Yes (prod) | Clerk dashboard + `.env.local` |
| Google OAuth secret | Yes | Clerk dashboard only |

Real values are never written here. See [[SCHEMA#secret-policy]].

> 🚀 **Going to production?** See [[../PRODUCTION_CLERK.md]] for the full runbook on swapping `pk_test_` → `pk_live_` keys, configuring your own Google OAuth credentials, and wiring keys through EAS secrets.

## Session lifetime

The 1-hour cap is enforced in [App.tsx](../../App.tsx) via:

```ts
const SESSION_MAX_AGE_MS = 60 * 60 * 1000;
const SESSION_STARTED_KEY = 'session_started_at';
```

On sign-in, a timestamp is stored via [[entity-secure-storage]]. A `setInterval(checkExpiry, 60_000)` calls `useAuth().signOut()` and shows a yellow "Session expired" banner once the age exceeds 1 hour. See [[decision-1h-session-cap]] for why client + server cap is preferable to either alone.

The corresponding **server-side** cap (Clerk Dashboard → Sessions → Token lifetime → 3600) is documented in [[../PRODUCTION_CLERK.md#session-lifetime-1-hour-cap]] and is NOT enforced in code — it depends on dashboard configuration.

## Known failures

Two early bugs caught during PR #6 dogfooding (not production incidents):

1. **`SecureStore` threw on web** — `expo-secure-store` only ships native bindings. Resolved by introducing [[entity-secure-storage]] which proxies to `localStorage` when `Platform.OS === 'web'`.
2. **Sign-in screen unreachable** — original gate was `isSignedIn === false`, but the demo-mode bypass meant signed-out users in non-demo dev got a "Sign in required" splash instead of the actual SignInScreen. Resolved in App.tsx by routing to `<SignInScreen />` directly when not in demo mode.

> ❓ Open question: Does Clerk Expo's `getToken()` return a JWT in a format the gcp3 FastAPI can verify (audience, issuer)? Untested — no backend currently checks.

## Open questions

- What goes in the Clerk JWT custom claims? Mobile and backend haven't agreed on a user-id shape.
- How are webhooks (user.created, session.revoked) routed when the mobile app is the only client? `api/webhooks/` exists but is dormant.
- Refresh-token rotation behavior under poor connectivity — does `getToken({ skipCache: true })` retry, or fail closed?
- Does the 1h client cap fire correctly across app suspend/resume on iOS? The `setInterval` is paused while the app is backgrounded; on resume, `checkExpiry` runs again and catches up.

## See also

- [[entity-secure-storage]] — the cross-platform storage Clerk uses
- [[entity-demo-mode]] — the bypass path
- [[entity-backend-client]] — the would-be consumer of `getToken()`
- [[decision-demo-mode-default-on]]
- [[decision-1h-session-cap]] — why we cap at 1h client-side
- [[../PRODUCTION_CLERK.md]] — runbook for going to production (`pk_live_` keys, server-side session lifetime)
