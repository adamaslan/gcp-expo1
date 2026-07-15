---
date: 2026-07-02
type: entity
tags: [billing, subscription, stripe, mobile]
sources: [lib/subscription.ts, lib/useSubscription.ts, app/(tabs)/settings.tsx, PR #14, PR #21, PR #22]
---

# entity: Billing / Subscription

## What it is

The mobile subscription surface. `lib/subscription.ts` defines the subscription
status shape (`free | trialing | pro | past_due | canceled`) and reads it off
Clerk's `user.publicMetadata.subscription_status` — **subscription state lives
in Clerk, not in a mobile-local store**. `lib/useSubscription.ts` is the hook
wrapping this for components. The Settings tab (`app/(tabs)/settings.tsx`,
shipped PR #21) surfaces plan status and a "Manage subscription" action.

As of PR #22, tapping "Upgrade" makes an **authenticated checkout API call**
directly (`POST {portal}/api/stripe/checkout` with the Clerk bearer token)
rather than opening `/pricing` in a browser — the mobile app never touches
Stripe directly; the portal backend owns the Stripe integration and mobile is
a thin client. See [[entity-backend-client]] for the shared HTTP pattern this
follows, and `nuwrrrld-portal`'s wiki for the checkout route implementation.

## Where used

- [[entity-clerk-expo]] — `publicMetadata.subscription_status` is set by the
  portal's Clerk webhook (`app/api/webhooks/stripe/route.ts` in nuwrrrld-portal)
  after a successful Stripe checkout/webhook event; mobile only reads it.
- `components/TrialExpiryBanner.tsx` — reads `useSubscription()` to show a
  48h-window warning banner when `status === 'trialing'`.
- Settings tab — plan display + manage/upgrade actions.

## Known failures

None recorded yet.

## Open questions

- ❓ What happens if the Clerk webhook that sets `subscription_status` lags
  behind the Stripe checkout redirect — does mobile show a stale "free" state
  for some window after a successful upgrade?
- ❓ Is there a retry/poll on the mobile side after checkout completes, or does
  the user have to force-refresh the app to see `pro` status?

## See also

[[entity-clerk-expo]], [[concept-backend-is-source-of-truth]], `nuwrrrld-portal`
wiki (Stripe checkout + webhook routes are portal-owned, not duplicated here).
