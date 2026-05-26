---
date: 2026-05-23
type: decision
tags: [ai, ux, llm, cost, council]
sources: [../lib/clients/council.ts, ../screens/ChatScreen.tsx, ../components/CouncilPanel.tsx]
---

# Decision: "All" Filter Fires Both Viewpoints in Parallel; Agree Is Opt-In

## Decision

When the ChatScreen filter is set to "All" and the user sends a message, the app:

1. Fires **two LLM calls in parallel** via `Promise.allSettled`: one with `buildShortTermChat()` + `trader_filter: 'short_term'`, one with `buildLongTermChat()` + `trader_filter: 'long_term'`
2. Renders the two answers **side-by-side** in a single dual-view bubble (cyan accent = short, indigo = long)
3. Shows a yellow **"★ Agree on Best Overall"** button only after both viewpoints succeed
4. Fires a **third LLM call** (`buildAgreementPrompt(question, shortView, longView)`) only when the user taps Agree — never auto

Agreement output is structured: 1) the agreed action, 2) short-term contribution, 3) long-term contribution, 4) where they genuinely disagree.

## Date

2026-05-23 — shipped in PR #6.

## Context

User asked for two things: (a) when filter = "All", show both viewpoints (short and long), and (b) an Agree button that produces the "best overall" take. The question was how to wire the LLM calls — auto-fire all three, or gate the synthesis behind a tap.

This decision sits inside the [[concept-council-tap-in]] discipline: LLM calls are normally on user action, not on screen open. "All" mode bends that rule for the dual viewpoints (sending the message IS the tap) but preserves it for the synthesis step.

## Alternatives considered

- **Auto-fire all three (parallel short + long + Agree from screen-open).** Rejected — triples LLM cost per chat send. At 100 DAU × 5 messages/session × 3 calls = 1500 LLM calls/day even if no one reads the agreement. Violates [[../COST_OPTIMIZATION_5_DOLLAR.md]] Rule 4 too aggressively.
- **Sequential short → long → Agree.** Rejected — total latency would be the sum of three LLM calls (~6-9s perceived). Parallel cuts that to max(short, long) ≈ 3s for the dual view, with Agree paid for separately on tap.
- **Single LLM call with "give me both views" prompt.** Rejected — the trader_filter parameter on ai-text-opt biases RAG retrieval differently for short vs long. Two filtered calls produce better-grounded answers than one merged-context call.
- **Show only the Agree view (skip the two viewpoints).** Rejected — the user explicitly wanted both, to be able to see where the views genuinely diverge before reading a synthesis.

## Consequences

**Enables:**
- Honest disagreement is visible. The two viewpoint cards can show "BUY THE DIP" / "SELL THE RIP" side by side; the Agree button lets the user request reconciliation only when both views are sharp enough to reconcile.
- Cost-bounded by user behavior. A user who finds the dual view sufficient never pays for the third LLM call.
- Parallel fetches are fast — perceived latency is dominated by the slower of the two, not the sum.

**Rules out / requires:**
- "All" filter always doubles the LLM call count vs. the single-filter modes (Short-term / Long-term). Acceptable because "All" is opt-in (default mode is whichever the user selects).
- Agree button can't appear until both viewpoints succeed. If one fails (e.g. RAG returns 503), the Agree button stays hidden and a small italic "One viewpoint failed — Agree button hidden until both succeed" line appears. UX cost: a partial dual view feels broken.
- The agreement-prompt token cost is non-trivial (~500 input + ~250 output) because both viewpoints are included verbatim. Caching by `hash(question + shortView + longView)` is a future optimization — see [[entity-council-composer#open-questions]].

## Validated by

Not yet — the feature shipped 2026-05-23. Will be validated when:
- A user confirms the dual view is more useful than a single-view chat for a real trading question
- Cost telemetry shows the Agree button is tapped on <20% of dual-view messages (validating that gating synthesis behind a tap meaningfully reduces LLM cost vs. auto-firing it)
- If users always tap Agree, the gate provides no cost benefit and the auto-fire alternative becomes attractive again

## See also

- [[entity-council-composer]] — owns the three prompt builders and `askCouncil()`
- [[concept-council-tap-in]] — the discipline this decision selectively bends
- [[../COST_OPTIMIZATION_5_DOLLAR.md]] — Rule 4 (LLM never on default request path)
