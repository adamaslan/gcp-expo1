---
date: 2026-07-21
type: entity
tags: [nuai, chat, llm, guardrails, mobile, haptics]
sources: [lib/nuai.ts, screens/NuAIScreen.tsx, PR #16, PR #24, PR #28]
---

# entity: Nu AI Assistant

## What it is

`lib/nuai.ts` defines the **shared contract** for the Nu AI chat assistant —
`ChatMessage`, `ChatRequest` (with optional `portfolioContext: string[]` of
held tickers injected for grounding), and `ChatResponse` (with a `flagged`
bit). The actual LLM call happens **server-side on the portal**, deliberately
— the module's own header comment states this protects the API key and
enforces rate limits; mobile never calls an LLM provider directly.

`isRefusedQuery()` is a client-side pre-filter against `REFUSED_PATTERNS`
(insider trading / market manipulation / pump-and-dump / requests for exact
price targets) — refused before the request even reaches the portal.
`NU_AI_DAILY_TOKEN_BUDGET = 50_000` is a per-user soft cap.

PR #24 fixed a **streaming regression**: introduced a shared `consumeSSE`
helper and switched the chat UI to a proper SSE client, replacing whatever
non-streaming or broken-streaming path shipped in PR #16.

PR #28 relocated `consumeSSE` to `lib/shared/sse.ts` (matching the
`lib/shared/` convention used for filter/prefs helpers, see
[[entity-signals-digest]]) and added two catch-up features:
`SUGGESTED_PROMPTS` (a chip strip in the empty state, mirroring the portal's
`NuAIChat.tsx`) and a "today's signals for my watchlist" chip that passes
`portfolioContext` — the previously-unused watchlist-context field in
`ChatRequest` — sourced from `usePortfolio()`'s watchlist (see new
[[entity-portfolio]]). `expo-haptics` light-impact fires on send/chip taps,
success notification on the assistant's reply arriving.

Portal-side companion (adamaslan/nuwrrrld-portal#39, same date): the chat
route now detects a tracked-ticker mention in the user's message and injects
a `=== REAL DATA ===` grounding line via a new shared `signal-lookup.ts`,
plus a system-prompt line clarifying the app tracks sector/industry ETFs and
the user's watchlist, not individual equities in general — so an honest
"no data for that ticker" answer doesn't read like a broken feature.

## Where used

- Chat tab (`app/(tabs)/chat.tsx`), rendered via `screens/NuAIScreen.tsx`.
- `NU_AI_DISCLAIMER` string is surfaced in the chat UI per compliance
  (informational-only, not personalized advice).

## Known failures

- **Streaming regression (fixed PR #24)** — not written up as a standalone
  incident page since it was caught and fixed within the same release cycle;
  noted here as a "known failure, resolved" per [[SCHEMA#entity-pages]].
  Worth an `incident-*.md` if a similar regression recurs, so the pattern is
  tracked instead of re-discovered.

## Open questions

- ❓ Is `isRefusedQuery`'s regex-based filter the only guardrail, or does the
  portal-side LLM call have a second layer? If mobile's filter is the *only*
  gate, a client patch/bypass would remove it entirely.
- ✅ **Resolved 2026-07-02** (via `nuwrrrld-portal` wiki sync): enforced
  **server-side**, in `nuwrrrld-portal`'s `app/api/nuai/route.ts`, via an
  in-memory `Map`. Caveat found there: the map resets on cold start/redeploy,
  so the "daily" cap is actually "daily, until the next deploy" — tracked as
  a known gap in `nuwrrrld-portal`'s `entity-nuai.md`, not yet fixed.
- ❓ Does `portfolioContext` leak held-ticker info to the LLM provider in a way
  that needs disclosure, given `lib/nuai.ts`'s own disclaimer language?

## See also

[[concept-council-tap-in]] (same "user must explicitly request" cost-guard
philosophy), `nuwrrrld-portal` wiki (owns the actual LLM call + Anthropic SDK
usage per its `package.json`).
