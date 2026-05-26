---
date: 2026-05-23
type: concept
tags: [ai, llm, cost, ux, pattern]
sources: [../lib/clients/council.ts, ../components/CouncilPanel.tsx, ../COST_OPTIMIZATION_5_DOLLAR.md]
---

# Concept: The Council Tap-In Pattern

LLM calls are **never** part of the default request path. The AI Council only runs when the user explicitly taps a button labeled "Ask the Council" or "★ Agree on Best Overall". Every screen treats the LLM as a tap-in, not an auto-fire.

## The pattern

A "tap-in" panel is a UI surface that:

1. Has its own button — the user must explicitly invoke it (no auto-fire on screen open, no auto-refresh)
2. Builds its prompt from the **already-loaded** non-LLM data on the screen (verdict, briefing, signals)
3. Calls the LLM via [[entity-council-composer]]
4. Renders the answer + source chips below the button, with a `★ Re-ask` to repeat

The drop-in is `components/CouncilPanel.tsx`. Three of three feature screens use it. The pattern is identical across them; only the **prompt builder** differs (short-term for HoldFold, long-term for Briefing, custom for ChatScreen).

## Where it appears

- [[entity-council-composer]] — `lib/clients/council.ts` — owns the prompt builders and the `askCouncil()` call
- `components/CouncilPanel.tsx` — the visual implementation
- `screens/BriefingScreen.tsx` — long-term horizon, prompt from `buildLongTermPrompt({overview, macro, signals})`
- `screens/HoldFoldScreen.tsx` — short-term horizon, prompt from `buildShortTermPrompt(verdict)`
- `screens/ChatScreen.tsx` — the chat IS the tap (user sends a message). In "All" mode, the Agree button is a second tap that fires once user has read both viewpoints.

## Why this pattern exists

The constraint is explicit and load-bearing. From [[../COST_OPTIMIZATION_5_DOLLAR.md]] Rule 4 ("LLM calls never on the user request path"):

> Gemini 1.5 Flash is cheap (~$0.30 / 1M tokens) but a chatty endpoint that calls Gemini per request scales linearly with DAU. The gcp3 architecture already follows this: Gemini runs during the nightly bake (5 stages), writes results to Firestore, and user requests just read.

The mobile app's risk surface is ai-text-opt's `/api/chat` — the one endpoint that calls Gemini per request. Tap-in confines that endpoint to **deliberate, user-initiated** moments:

- A user opening Briefing fires ~3 cached gcp3 reads (~$0 in Firestore reads, no LLM cost)
- A user opening HoldFold fires one cached holdfold call (~$0)
- The user reads, decides "I want the Council's take", taps. **Now** the LLM fires. One call, paid for by deliberate intent.

Contrast with the auto-fire alternative: opening Briefing would auto-call Gemini per session, multiplying LLM cost by DAU regardless of whether the user even read the Council's response. At 100 DAU × 3 screens × 5 sessions/day = 1500 unnecessary LLM calls/day, ~$5/month in Gemini just from screen-opens.

## Where the pattern is bent (not broken)

ChatScreen in "All" filter mode fires TWO LLM calls per user message (short-term + long-term in parallel) without an explicit Council tap. That's intentional: the chat send button IS the tap-in. The Agree synthesis (a THIRD LLM call) does require an explicit additional tap, preserving the rule for the cost-doubling step.

See [[decision-dual-view-with-agree]] for the rationale on why "All" mode trades 2x LLM calls for the UX of dual viewpoints, while still gating the 3x case (synthesis) behind a button.

## Contradictions / tensions

None active. The pattern is consistent across all three screens.

A *potential* tension: if a future "auto-Council" feature is requested ("show me the Council's take every morning") it would violate this rule. The right answer there is to compute the Council's take during a **nightly job** in gcp3 and serve the cached result via gcp3 — the same pattern gcp3 already uses for `/content`. NOT to lift the per-request restriction on ai-text-opt.

## See also

- [[entity-council-composer]] — what builds the prompts and fires the call
- [[../COST_OPTIMIZATION_5_DOLLAR.md]] — Rule 4 is this concept's enforcement mechanism
- [[decision-dual-view-with-agree]] — where "All" mode bends the rule deliberately
- [[entity-dev-launcher]] — the only way ai-text-opt's three processes come up reliably enough for tap-ins to work in dev
