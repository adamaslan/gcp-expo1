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
- **The health endpoint itself was never implemented (found 2026-07-26)** —
  `usePortfolio()` fetches the portal's `/api/portfolio/health`, which
  proxies to `{MCP_BACKEND_URL}/api/portfolio/health` on gcp3. **That gcp3
  route does not exist** and never has; the analysis logic sits orphaned in
  `portfolio_analyzer.py`, unregistered. So the Portfolio tab's headline
  score is dead on mobile for the same reason it's dead on web. Full
  write-up:
  `nuwrrrld-portal/docs/wiki-portal/incident-2026-07-26-portfolio-health-endpoint-missing.md`.

  **This supersedes the diagnosis above, and the two are easy to confuse.**
  Repairing the corrupted env var moved the failure from *fetch throws*
  (503) to *404 from gcp3* (502) — and the client renders both with the
  identical "Health score unavailable" string. The env-var fix was real but
  the symptom never changed, which is precisely why the deeper cause stayed
  hidden for five days. **Do not re-diagnose this as an env-var problem.**

  Cross-surface note: even once the route lands, mobile inherits the portal's
  contract drift — gcp3 emits `ai_grade`/`ai_*` while `lib/portfolio.ts`
  expects `score`/`factors[]`/`summary`, and a missing score coerces to `0`,
  which would render **Grade F for every user** on this screen.

- **204 empty-watchlist showed "unavailable" instead of "add tickers" (fixed
  our PR #31, 2026-08-08)** — `usePortfolio` treated a `204` (empty watchlist,
  nothing to score, no response body) the same as any other non-`ok` health
  fetch, so `PortfolioScreen` rendered "Health score unavailable — try again
  shortly" for a brand-new user with zero tickers — a permanently-wrong retry
  prompt, since retrying an empty watchlist will never produce a score. Fixed
  by special-casing `hRes.status === 204` to resolve `null` without parsing a
  body, and `PortfolioScreen` now shows "Add tickers to your watchlist to get
  your health score" when `watchlist.length === 0`, distinct from the generic
  unavailable message.

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
