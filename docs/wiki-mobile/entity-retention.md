---
date: 2026-07-02
type: entity
tags: [retention, streak, push, mobile]
sources: [lib/retention.ts, lib/pushNotifications.ts, lib/shareSheet.ts, components/TrialExpiryBanner.tsx, PR #19, PR #20]
---

# entity: Retention Layer

## What it is

Three shared retention primitives shipped across Weeks 11-14 (PR #19, #20):

- **`lib/retention.ts`** — `StreakState` (current/longest streak, last active
  date) and `advanceStreak()`, which is UTC-day-boundary-safe (uses a single
  `Date` base for "today" and "yesterday" to avoid a midnight race between two
  separate `new Date()` calls).
- **`lib/pushNotifications.ts`** — wraps `expo-notifications`. Deliberately
  **never prompts for push permission on first launch** — the code comment is
  explicit: wait until the user has received a signal (seen first value)
  before calling `requestPushPermission()`. `registerPushToken()` is a no-op
  on web.
- **`lib/shareSheet.ts`** — native share via RN's `Share.share()` (not
  `expo-sharing`, which is file-only). `shareReferralLink()` fetches a referral
  code from the portal's `/api/referral` route with the Clerk bearer token,
  builds a share URL (`{portal}/pricing?ref={code}`), and shares it.

`components/TrialExpiryBanner.tsx` composes `useSubscription()` (see
[[entity-billing]]) to show a countdown banner only in the last 48h of a trial.

## Where used

- Settings tab and dashboard surfaces show the streak state.
- `TrialExpiryBanner` renders app-wide once mounted near the top-level layout.
- Share sheet is triggered from the Share tab / referral CTA.

## Known failures

None recorded yet.

## Open questions

- ❓ `advanceStreak` resets to `1` if `lastActiveDate` isn't exactly yesterday
  — does this correctly handle a user in a timezone where their "day" doesn't
  align with UTC-day boundaries (e.g. someone active at 11pm PT logging in at
  1am PT the next calendar UTC day)?
- ❓ Is push token registration retried if it fails silently (e.g. network
  drop during `registerPushToken`)?
- ❓ iOS denies push and can't re-prompt — does the app surface a "go to
  Settings" deep link when `getPushPermissionStatus()` returns `denied`?

## See also

[[entity-billing]], [[entity-clerk-expo]] (auth token used for the referral
fetch), [[entity-http]] is *not* used here — `shareReferralLink` does a raw
`fetch`, not the shared HTTP primitive. Worth reconciling in a future lint pass.
