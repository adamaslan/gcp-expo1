---
date: 2026-05-23
type: decision
tags: [auth, security, session, clerk]
sources: [../App.tsx, ../lib/secure-storage.ts, ../docs/PRODUCTION_CLERK.md]
---

# Decision: Enforce a 1-Hour Session Cap on Both Client and Server

## Decision

The mobile app enforces a 1-hour hard cap on Clerk sessions in **two places simultaneously**:

1. **Client-side** in `App.tsx` — records `session_started_at` via [[entity-secure-storage]] on sign-in, runs a `setInterval(check, 60_000)` loop, and calls `useAuth().signOut()` once age exceeds 1h. Shows a yellow "Session expired" banner above the re-sign-in screen.
2. **Server-side** in the Clerk Dashboard — "Sessions → Token lifetime" set to `3600` seconds. (Not enforced in code; depends on dashboard configuration. Documented in [[../PRODUCTION_CLERK.md#session-lifetime-1-hour-cap]].)

## Date

2026-05-23 — shipped in PR #6 (client-side) alongside PR #5 infrastructure. Dashboard setting is documented but not user-applied yet.

## Context

The original session model was Clerk's default — 7-day inactivity timeout with no hard age cap. The user requested "stay signed in for 1 hour of activity, then force re-sign-in". Two questions emerged:

1. Where does the cap live — client, server, or both?
2. What does "activity" mean — sliding window or hard cap from sign-in?

The user chose **hard cap from sign-in**, not an inactivity sliding window. That simplifies the implementation (single timestamp, single threshold) and matches the security framing better — a stolen session token can't be kept alive indefinitely by faking activity.

## Alternatives considered

- **Server-side only (Clerk Dashboard setting alone).** Rejected — gives a correct security guarantee but bad UX: backend calls suddenly start returning 401 without the UI knowing why. User sees errors, not a sign-in prompt.
- **Client-side only (no Dashboard change).** Rejected — the client check can be bypassed by a tampered build or a stale tab. The session token would still be valid server-side, so backend calls would succeed past 1h. Defeats the security intent.
- **Sliding inactivity window.** Rejected per user preference (see Context). Also harder to implement on web (no good "user active" signal in the React Native abstraction).
- **Use Clerk's `session.expireAt` directly.** Possible but Clerk's default is multi-day; would require changing the Dashboard anyway. The client-side cap is simpler than reading `expireAt` and computing a deadline.

## Consequences

**Enables:**
- The UI knows about expiry and can show a friendly "Session expired" banner instead of bare 401 errors
- A guarantee that a stolen Clerk session token can be used for at most 1h, regardless of client behavior
- Clear story for compliance / audit: "sessions expire after 60 minutes"

**Rules out / requires:**
- Users who keep the app open for >1h see a re-sign-in prompt. Acceptable per UX choice.
- Two places to keep in sync. If the Dashboard setting drifts to a different value, the client cap could fire before or after the server cap, producing the worse-of-both UX. Documented in [[entity-clerk-expo#session-lifetime]].
- The `setInterval` is paused while the app is backgrounded on iOS. On resume, the check catches up — but a user who closes the app at 55 min and reopens at 90 min sees the banner immediately, not at the actual 60-min mark.

## Validated by

Not yet — the feature shipped 2026-05-23 and the user hasn't been signed in for a full hour yet. Will be validated when:
- A user reports being signed out at ~60 min ✅
- A user reports being signed out earlier or later than expected → debug clock drift / background timing
- A penetration test confirms a captured token doesn't work after 60 min server-side → validates the Dashboard cap is set correctly

## See also

- [[entity-clerk-expo]] — where the 1h check lives in App.tsx
- [[entity-secure-storage]] — stores the `session_started_at` timestamp
- [[../PRODUCTION_CLERK.md]] — runbook for the Dashboard counterpart
