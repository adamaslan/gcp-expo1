---
date: 2026-07-21
type: entity
tags: [portfolio, watchlist, mobile, haptics]
sources: [lib/usePortfolio.ts, lib/portfolio.ts, screens/PortfolioScreen.tsx, PR #28]
---

# entity: Portfolio (health score + watchlist)

## What it is

`lib/portfolio.ts` defines the shared schema: `PortfolioHealth` (0–100
score + letter grade + `HealthFactor[]`), `OptimizerSuggestion`, and
`WatchlistItem` (ticker + addedAt + optional alert thresholds).
`lib/usePortfolio.ts` is the data hook — fetches `/api/portfolio/health`,
`/suggestions`, and `/watchlist` from the portal in parallel, exposes
`addToWatchlist`/`removeFromWatchlist` (remove is optimistic with
rollback-on-failure; add is not optimistic, just triggers a refetch).

**This hook existed before PR #28 but had no consumer anywhere in the app**
— confirmed via a repo-wide grep turning up only the hook's own definition
file. PR #28 is the first time it's wired to a real screen.

`screens/PortfolioScreen.tsx` (new, PR #28) is a new **Portfolio** tab
(`app/(tabs)/portfolio.tsx`) showing the health score/grade/summary and a
watchlist add/remove list. `expo-haptics` fires light-impact on add/remove
taps and a success/error notification on the add outcome (remove has no
haptic feedback on outcome yet, only on the tap itself — see open questions).

## Where used

- Portfolio tab (`app/(tabs)/portfolio.tsx` → `PortfolioScreen.tsx`).
- Watchlist tickers are also read by [[entity-nuai]]'s "today's signals for
  my watchlist" context chip via the same `usePortfolio()` hook.

## Known failures

- **Portal-side `MCP_BACKEND_URL` corruption (2026-07-21, fixed same day)** —
  the portal's production env var for this endpoint had a literal `\n`
  baked into the string value, breaking every backend fetch URL and
  producing "Health score unavailable" for all users. Fixed via
  `vercel env rm`/`vercel env add` + redeploy. Not a mobile-side bug, but
  directly affects this screen's primary data source — worth an
  `incident-*.md` if it recurs, since a bad env var like this fails
  silently (503, not a build error) and only surfaces as a user-facing
  message.

## Open questions

- ❓ `addToWatchlist` is not optimistic (unlike `removeFromWatchlist`) —
  intentional asymmetry or an oversight? If a user's connection is slow,
  add will feel laggier than remove.
- ❓ No haptic feedback on `removeFromWatchlist` *failure* (rollback) —
  should probably fire `Haptics.notificationAsync(Error)` to match the
  add path, so a silent rollback doesn't look like nothing happened.
- ❓ `PortfolioScreen` gates on the `portfolio_score` entitlement
  (`lib/subscription.ts`) — should watchlist *management* (not just the
  health score) require Pro, or should free users be able to build a
  watchlist without the AI health check?

## See also

[[entity-nuai]] (shares watchlist tickers as chat context),
[[entity-signals-digest]] (same `lib/shared/prefs.ts` persistence seam
introduced the same day), `nuwrrrld-portal` wiki (owns `/api/portfolio/*`).
