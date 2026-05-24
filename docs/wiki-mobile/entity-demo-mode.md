---
date: 2026-05-22
type: entity
tags: [demo, dev-experience, auth]
sources: [../lib/mock-auth.tsx, ../PHASE2_START_HERE.md, ../docs/PHASE2_STATUS.md]
---

# Entity: Demo Mode

The bypass path that lets the app run locally without a real Clerk publishable key, a real Google OAuth client, or any backend. Toggled by `EXPO_PUBLIC_DEMO_MODE=true`. Implemented in [`lib/mock-auth.tsx`](../lib/mock-auth.tsx).

## What it is

A drop-in replacement for [[entity-clerk-expo]] that:

- Exposes the same React context surface (`useAuth`, `useUser`, `<SignIn>`, etc.)
- Returns a hardcoded "demo user" without any network call
- Skips token issuance entirely — `getToken()` returns a fixed string or `null`
- Makes [[entity-config-validator]] pass even with no Clerk env vars set

The intent recorded in [[decision-demo-mode-default-on]]: a new developer should `git clone && npm install && npm start` and see something useful, not a Clerk misconfig screen.

## Where used

- `lib/auth-provider.tsx` — branches on `EXPO_PUBLIC_DEMO_MODE` to choose Clerk vs mock
- [[entity-config-validator]] — treats demo mode as "Clerk satisfied"
- `screens/SignInScreen.tsx` — renders a "Sign in as demo user" button instead of Clerk's flow

## Activation

```bash
# .env.local
EXPO_PUBLIC_DEMO_MODE=true
```

Anything else (including unset) is "real mode" — Clerk env vars are required.

## Known failures

None recorded — but the failure mode to watch is **silent demo activation in production**. If `EXPO_PUBLIC_DEMO_MODE=true` slips into an EAS build, real users see the mock user without any indication. There is no runtime warning today. See [[../docs/PHASE2_STATUS.md]] for context on how it's intended to behave.

> ❓ Open question: Does the EAS Build profile for `production` explicitly set `EXPO_PUBLIC_DEMO_MODE=false`? If unset, the dev default carries over.

## Open questions

- How does demo mode interact with the planned multi-backend clients? Should [[entity-backend-client]] return mock data when demo mode is on, or hit real backends with no auth?
- Are webhooks in [`api/webhooks/`](../api/webhooks/) supposed to be inert under demo mode?

## See also

- [[entity-clerk-expo]] — the thing being replaced
- [[decision-demo-mode-default-on]]
- [[entity-config-validator]] — recognizes demo mode as satisfying Clerk requirements
