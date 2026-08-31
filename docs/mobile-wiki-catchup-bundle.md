# Idea: Mobile PR Roadmap — Wiki Catch-Up + Feature Backlog, Conflict-Minimal

**Written:** 2026-08-30
**Status:** proposal — not yet built
**Branch this doc is on:** `docs/mobile-pr-bundle-plan` (cut from `origin/main`)

## The ask

Lay out "at least 3 PRs worth" — and then "even more" — of pending mobile work,
sequenced so a pile of parallel branches does **not** turn into a pile of merge
conflicts.

## The conflict principle driving the whole sequence

Per `~/.claude/rules/no-conflicts1.md`: merge conflicts here are almost never
two people editing one line. They're **N parallel branches all appending to the
same end-of-file surfaces** — `docs/wiki-mobile/log.md`,
`docs/wiki-mobile/index.md`, `docs/wiki-mobile/concept-mobile-web-parity.md`,
`docs/wiki-mobile/concept-sync-requirements.md`, `package.json`, lockfiles.

So the rule for this roadmap:

1. **One unit of work = one branch = one PR.** No stacking a second unit onto a
   branch under review.
2. **Every branch cut fresh from `origin/main`** at the moment work starts —
   never from a stale local `main`, never from another feature branch.
3. **Merge in shared-file-overlap order.** The PR that touches the
   highest-churn shared file merges first; the rest rebase onto it. This
   converts N contended merges into N−1 clean rebases.
4. **Wiki-touching PRs are serialized, not parallelized.** Only one open PR at
   a time may have uncommitted edits to `log.md` / the parity page. The next
   wiki PR waits for the previous to merge, then rebases.
5. **Rebase early.** A rebase after 2 commits is trivial; after 20 it's a
   negotiation.

---

## Current state (2026-08-30)

### Open mobile PRs

| PR | Branch | State | Wiki files touched |
|---|---|---|---|
| **#39** | `sync/mirror-attribution-shared` | `CLEAN` / `MERGEABLE`, checks green | parity, sync-requirements, index, log |
| **#28** | `feat/mobile-interactivity-batch` | `DIRTY` / `CONFLICTING` (already) | parity, sync-requirements, index, log + 6 entity/concept pages |

### Un-ingested portal PRs (mobile wiki's last ingest = portal #66/#67, commit `f555eff`)

| Portal PR | What | Parity impact |
|---|---|---|
| **#77** | Consent/legal infra, ToS-gated Clerk sign-up, DSAR endpoints; two new portal `lib/shared/` modules | ⚠️ ~66% → ~63% + a cross-surface obligation gap |
| **#78** | Auth hardening, DSAR rights surface, analytics/attribution scaffolding; `lib/shared/attribution.ts` | ⚠️ ~63% → ~62% + a second compliance asymmetry |
| **#79** | Stripe annual-checkout repair, price consolidation | ℹ️ portal-only, no change |
| **#82** | `error.tsx`/`global-error.tsx`/`not-found.tsx` + bounded public share-card `ticker` | ℹ️ portal-only, no change |
| **#84** | Dropped unused `google-github-actions/auth` from `e2e-resiliency.yml` | ℹ️ portal CI only, no change |
| **#85** | Monthly followed-tickers cohort + daily tracking workflows, shipped ahead of routes | ℹ️ portal-only scheduler infra, no change |

### Stale mobile feature branches (commits ahead of `origin/main`, un-PR'd or PR closed)

| Branch | Ahead | Substance |
|---|---|---|
| `fix/subscription-metadata-parity` | 12 | `trialEnd` guards + wiki refreshes; likely superseded by merged #29/#36 — needs triage |
| `feat/phase-a-streaming` | 7 | SSE client + shared `consumeSSE`, mobile NuAI streaming regression fix, live `/signals` wiring |
| `feat/3day-signal-cards` | 7 | `useDigest` → live GCP3 `/signals`; 3-day card horizon |
| `feat/council-chat-screens` | 5 | Council chat UI screens |
| `feat/graceful-degradation-signals` | 2 | Last-known-good digest fallback on fetch failure + sign-out cache clear |
| `feat/signal-payload-parity` | 2 | Fatten `SignalPayload` (score, reasons, staleness, provenance) to match portal |
| `feat/paywall-checkout-api` | 2 | Paywall calls checkout API with Clerk token instead of opening `/pricing` |
| `feat/multi-backend-clients` | 1 | Multi-backend client layer |

---

## The roadmap — sequenced PRs

Ordered so each merges cleanly given the ones before it — squash merges, so
not literally fast-forwards, but each rebases onto its predecessor without
conflicts. Grouped into
waves; within a wave, PRs touch disjoint files and may proceed in parallel.

### Wave 0 — unblock the queue (do first, no new work)

#### PR-0a — merge #39 as-is
`CLEAN` / `MERGEABLE`, green. It's the smallest wiki-touching change. Merging
it first means every later wiki PR appends *after* #39's parity-page and
`log.md` lines instead of racing them.
**Action:** `gh pr merge 39 --squash --delete-branch`. No code changes.

#### PR-0b — rebase #28 onto post-#39 main, resolve once
PR #28 is already conflicting; it needs a rebase regardless. After #39 lands,
`git rebase origin/main` on `feat/mobile-interactivity-batch`, resolve the
3 append-point wiki files by hand once, force-push. Do **not** add anything to
PR #28 while doing this.

---

### Wave 1 — wiki catch-up (one PR, serialized after Wave 0)

#### PR-1 — `docs/wiki-catchup-portal-77-85`
Branch from `origin/main` **after** #39 (and ideally #28) land.

Contents — all `docs/wiki-mobile/`, zero code:

1. **`concept-mobile-web-parity.md`**
   - Recompute headline to **~62%** (agrees with the note portal PR #85
     already carries on the portal side).
   - Per-PR assessment notes: #77 and #78 move the number and the matrix;
     #79/#82/#84/#85 get one-line "assessed — portal-only, headline unchanged"
     entries in the house style already used for portal #59/#64/#74.
   - #85's followed-tickers cohort: one line noting the *portable idea*
     (monthly-cohort-not-rolling-watchlist methodology) with no shared code
     and no mobile surface yet.
2. **`concept-sync-requirements.md`**
   - Add gap (a): adopt `lib/shared/consent.ts`, gate `lib/analytics.ts` +
     `lib/sentry.ts` on it — **priority #1** (live GDPR/CPRA non-compliance,
     not a nicety).
   - Add gap (b): mobile DSAR mechanism (access/erasure/rectification) or a
     documented deferral — a shared-account user can do this on web, nothing
     on mobile.
3. **`index.md`** — verify links; no new mobile pages needed (the new
   concepts are all portal-side).
4. **`log.md`** — one line:
   `## [2026-08-30] ingest | Portal PRs #77–#85 assessed — consent/DSAR web-only (headline ~66%→~62%), #79/#82/#84/#85 portal-only no-change | pages touched: 2`

This alone is "3+ PRs worth": six portal PRs assessed, two with real
matrix/requirement consequences.

---

### Wave 2 — signal-data parity (parallel-safe; disjoint files)

These three were separate branches; they touch `lib/` + `lib/shared/` signal
code and mobile signal hooks, not each other's files. Rebase each fresh from
`origin/main`, open as three PRs, merge in the order listed (payload shape
before the consumers that rely on it).

#### PR-2a — `feat/signal-payload-parity` (rebased)
Fatten `SignalPayload` with `score`, `reasons`, `staleness`, `provenance` to
match the portal's shape. Includes the CodeRabbit-review fixes already on the
branch (null-safety, `normaliseDigest` parity). **Shared-module change** —
must pass `shared-drift-check` against portal's current `SignalPayload`.
Touches: `lib/shared/` signal types, `lib/digest.ts`.

#### PR-2b — `feat/3day-signal-cards` (rebased)
Wire `useDigest` to the live GCP3 `/signals` endpoint; 3-day card horizon.
Depends on PR-2a's payload shape. Touches: `lib/useDigest.ts`, signal card
components. **Not** `lib/shared/` — mobile-only consumer wiring.

#### PR-2c — `feat/graceful-degradation-signals` (rebased)
Fall back to last-known-good digest on fetch failure; clear that cache on
sign-out (CodeRabbit security finding already addressed on-branch). Mirrors
the portal's `concept-graceful-degradation` posture. Touches:
`lib/useDigest.ts` cache path — **overlaps PR-2b**, so 2c rebases onto 2b, not
parallel with it.

**Wiki:** PR-2a needs a `concept-sync-requirements.md` + `log.md` touch (a
shared module moved). Per rule #4, that means 2a is the wiki-serialized one in
this wave — 2b and 2c note "no shared-module change" and skip the parity page.

---

### Wave 3 — NuAI streaming (one PR; depends on Wave 2)

#### PR-3 — `feat/phase-a-streaming` (rebased)
SSE client + shared `consumeSSE` consumer, mobile NuAI streaming-regression
fix. Includes the on-branch "PR review bugs — crash, data integrity, streaming
safety" commit. **Shared-module change** (`consumeSSE` should be
`lib/shared/sse.ts`-adjacent) → wiki-serialized. Touches: `lib/useNuAI.ts`,
`lib/nuai.ts`, `lib/shared/sse.ts`. Depends on Wave 2 only for merge order
(both touch `lib/digest.ts` history).

---

### Wave 4 — billing/paywall (parallel-safe with Wave 3; disjoint files)

#### PR-4a — `feat/paywall-checkout-api` (rebased)
Paywall calls the checkout API with a Clerk token instead of opening
`/pricing`. Includes the PR #22 review fixes (Alert feedback, AbortController
timeout). Touches: paywall screen, `lib/` billing client. No `lib/shared/`
change → no parity page touch, just a `log.md` line.

#### PR-4b — `feat/council-chat-screens` (rebased)
Council chat UI screens. Pure mobile UI, no shared code. Touches: `app/`
council routes, new components. `log.md` line only.

---

### Wave 5 — cleanup / triage (no new features)

#### PR-5a — triage `fix/subscription-metadata-parity` (12 commits)
Almost certainly superseded by merged #29 (`parseSubscriptionMetadata` port)
and #36 (`trialEnd` while-trialing fix). **Action:** diff it against
`origin/main`; if the code delta is empty, close the branch with a note. If a
real `trialEnd` guard survives, cherry-pick just that one commit onto a fresh
branch as a 1-commit PR. Do not merge 12 stale commits.

#### PR-5b — triage `feat/multi-backend-clients` (1 commit)
Just a merge commit of `feat/council-chat-screens` — likely dead. Verify and
delete the branch.

#### PR-5c — branch garbage-collection
~25 remote branches are ≤2 commits ahead and mostly merge-commits or
superseded `docs/wiki-ingest-*` / `docs/wiki-portal-*` branches whose content
is already on `main`. One housekeeping PR isn't needed — just
`git push origin --delete <branch>` for each confirmed-dead one, in a batch,
after Waves 1–4 land so nothing in flight depends on them.

---

## Merge-order summary (the whole point)

```
#39  ─────────────────────────────► main          (Wave 0a, now)
#28  ──rebase──────────────────────► main          (Wave 0b)
PR-1 (wiki catch-up) ──────────────► main          (Wave 1, after 0)
PR-2a (payload parity) ────────────► main          (Wave 2, shared-module)
PR-2b (3day cards, on 2a) ─────────► main
PR-2c (degradation, on 2b) ────────► main
PR-3 (streaming) ──────────────────► main          (Wave 3)
PR-4a (paywall) ──┐
PR-4b (council) ──┴────────────────► main          (Wave 4, parallel)
PR-5a/b/c (triage + gc) ───────────► main          (Wave 5, cleanup)
```

At any moment, **at most one open PR** has uncommitted `log.md` / parity-page
edits. Every other PR either doesn't touch those files or rebases onto the one
that does. Total hand-resolved conflicts across all of this: **1** (PR #28,
which was already conflicting before this plan existed).

---

## Open questions

- Is `feat/phase-a-streaming`'s `consumeSSE` meant to become a real
  `lib/shared/` module (portal has `lib/shared/sse.ts`), or stay mobile-local?
  That decides whether PR-3 is wiki-serialized.
- `fix/subscription-metadata-parity` (12 commits) — is any of it still live, or
  fully superseded? Needs a diff before it's scheduled or closed.
- Should Wave 2's payload-parity work wait for a portal-side confirmation that
  `SignalPayload`'s shape is frozen, to avoid a same-day re-drift like portal
  PR #66's `digest.ts`?
