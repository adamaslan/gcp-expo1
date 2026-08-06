---
date: 2026-07-02
type: entity
tags: [signals, digest, mobile, shared-lib]
sources: [lib/digest.ts, components/SignalDigestCard.tsx, PR #16]
---

# entity: Signal Digest

## What it is

`lib/digest.ts` is a **schema-versioned** signal payload shared between mobile
and portal (`DIGEST_SCHEMA_VERSION = 1`, bumped if the render layer would break
on a new signal shape). Defines `SignalPayload` (direction, timeframe,
confidence, title, explanation, indicators, generatedAt) and `DigestPayload`
(a list of signals + period label + sources).

`adaptLiveSignals(raw)` bridges the live gcp3 backend's `/signals` response
(a `symbols: { TICKER: {...} }` **map**, keyed by ticker) into the `signals[]`
**array** shape the UI expects — the same adapter shape documented in
`nuwrrrld-portal`'s `docs/live-data-wiring.md`. This is the canonical adapter;
per [[concept-backend-is-source-of-truth]] it should be the *only* place this
transform happens, shared via `lib/` between app and web.

`components/SignalDigestCard.tsx` renders one signal: direction color/arrow,
collapsed headline, expandable explanation. Uses `lib/signalCard.ts`'s
`buildSignalCard` / `formatSignalForShare` helpers (share-sheet integration,
see [[entity-retention]]).

PR #28 added `lib/shared/signalFilters.ts` (`filterSignals`, `sortSignals`,
`CONFIDENCE_RANK`) — a byte-for-byte mirror of `nuwrrrld-portal`'s
`lib/shared/signalFilters.ts`, both extracted the same day from their
respective client components with no behavior change. `DigestScreen.tsx` now
has search + bullish/bearish/neutral direction filter + confidence/ticker
sort, persisted across sessions via a new `lib/shared/prefs.ts`
(expo-secure-store; portal's counterpart uses `localStorage` behind the same
`getPref`/`setPref` signature).

## Where used

- Signals tab / dashboard digest view (`screens/DigestScreen.tsx`).
- Share flow — a signal card can be shared as formatted text via
  `formatSignalForShare` → [[entity-retention]]'s `shareSheet.ts`.

## Known failures

None recorded yet.

## Open questions

- ✅ **Resolved 2026-07-02**: verified against live code — `nuwrrrld-portal`'s
  `lib/digest.ts` `adaptLiveSignals` is **identical in contract** to mobile's
  (throws on malformed input, same `ai_action`→`direction` mapping). The
  divergence implied by portal's `docs/live-data-wiring.md` (2026-06-27) was a
  stale planning doc describing work that was completed differently than
  drafted — not an actual code split. No action needed, but the planning doc
  should be archived per the "archive, never delete" rule once portal's wiki
  confirms it's superseded.
- ❓ The two implementations are hand-duplicated across two repos (not
  imported from one shared package). If either changes, the other must be
  updated manually. Worth considering a shared npm package or git submodule if
  this drifts again.

## See also

[[concept-backend-is-source-of-truth]], [[entity-retention]], [[entity-backend-client]].
`nuwrrrld-portal` wiki `entity-signal-digest.md` — cross-repo counterpart, **not
yet reconciled** as of this sync.
