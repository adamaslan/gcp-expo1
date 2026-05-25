---
date: 2026-05-23
type: entity
tags: [ai, council, llm, composition]
sources: [../lib/clients/council.ts, ../lib/clients/aitext.ts, ../components/CouncilPanel.tsx, ../screens/BriefingScreen.tsx, ../screens/HoldFoldScreen.tsx, ../screens/ChatScreen.tsx]
---

# Entity: Council Composer (`lib/clients/council.ts`)

The thin layer that turns a `HoldFoldVerdict` or a `MarketOverview + MacroPulse + Signal[]` into a prompt, then forwards it to ai-text-opt's RAG `/api/chat`. Adds no transport of its own — composes [[entity-http]] (via `aitext.ts`'s `ragChat`) with prompt builders that encode the **trader identity** (short-term vs long-term) the user wants the LLM to assume.

## What it is

Five exported functions:

| Function | Input | Output | Used by |
|---|---|---|---|
| `buildShortTermPrompt(verdict)` | `HoldFoldVerdict` | string | [[entity-backend-client]] / HoldFoldScreen Council tap-in |
| `buildLongTermPrompt(ctx)` | `{ overview, macro, signals }` | string | BriefingScreen Council tap-in |
| `buildShortTermChat(question)` | string | string | ChatScreen, Short-term filter |
| `buildLongTermChat(question)` | string | string | ChatScreen, Long-term filter |
| `buildAgreementPrompt(question, shortView, longView)` | three strings | string | ChatScreen, ★ Agree button |
| `askCouncil(prompt, traderFilter?)` | (prompt, filter) | `Promise<ChatResponse>` | All of the above call sites |

The prompts encode two things the raw user input doesn't: the **horizon** (1–5 days vs 3–12 months) and the **persona** ("you are an AI trading council speaking to a SHORT-TERM trader..."). The `traderFilter` argument is passed through to ai-text-opt's `trader_filter` param, which the RAG retrieval uses to bias toward documents tagged for that horizon.

## Where used

- `components/CouncilPanel.tsx` — the drop-in tap-in component. Accepts `prompt: string | null` and renders the Ask button → loading → answer + source chips
- `screens/BriefingScreen.tsx` — long-term Council tap-in at bottom of the screen; prompt built via `buildLongTermPrompt({ overview, macro, signals })`
- `screens/HoldFoldScreen.tsx` — short-term Council tap-in inside the verdict card; prompt via `buildShortTermPrompt(verdict)`
- `screens/ChatScreen.tsx` — when filter = "All", fires both `buildShortTermChat` and `buildLongTermChat` in parallel via `Promise.allSettled`; on success, ★ Agree button uses `buildAgreementPrompt` to synthesize

## The Agreement prompt

`buildAgreementPrompt(question, shortView, longView)` outputs:

```
Original question: …
SHORT-TERM trader view (1-5 day horizon): …
LONG-TERM trader view (3-12 month horizon): …

You are an AI council synthesizing the above two viewpoints. Output the BEST OVERALL decision
that is defensible from BOTH horizons — not a wishy-washy compromise, but a single concrete
take that respects what's true in both timeframes.

Structure your response as:
1. The agreed-on action (one sentence).
2. What the short-term view contributes (entry, exit, stop).
3. What the long-term view contributes (thesis, hold rationale, position size).
4. Where the two views genuinely disagree, and how a trader who holds both should resolve it.
Be concise (~250 words).
```

The structured-output ask matters — without it the LLM defaults to summarizing both views in prose. See [[decision-dual-view-with-agree]] for the full rationale.

## Where it does NOT live

The Council is **never** invoked automatically. It only fires when:
- The user taps "Ask the Council" on Briefing or HoldFold
- The user sends a message in Chat with filter ≠ filter-already-shown (so the chat-as-llm-call IS the user action)
- The user taps "★ Agree on Best Overall" after both viewpoints land

This is the [[concept-council-tap-in]] pattern, which keeps `lib/clients/council.ts` outside the cost-blowup risk Rule 4 of [[../COST_OPTIMIZATION_5_DOLLAR.md]] warns about ("LLM calls never on the user request path").

## Known failures

1. **ai-text-opt offline → "Failed to fetch chat".** The most common failure mode during dev. The fetch fails at the transport layer before any prompt-builder logic runs. See [[entity-dev-launcher]] for why the three-process ai-text stack is easy to leave half-running. Mitigation: `npm run dev` starts all three.
2. **RAG returns 503 with `context_empty: true`.** When ChromaDB has no matching context, ai-text-opt still calls Gemini (with `context_empty=true` flag in the response). The Council answer in this case is the LLM's general knowledge, not retrieval-grounded. CouncilPanel surfaces this with a yellow "No matching context — general knowledge" note.

## Open questions

- Should the prompt builders take a structured **portfolio state** (positions, cash, risk budget) for tighter advice? Currently they only know the verdict / briefing — no user-specific context.
- The `trader_filter` parameter is passed through to ai-text-opt but its actual RAG-side effect is undocumented in the ai-text-opt repo. Worth a handoff doc.
- Agreement-prompt token cost: at ~500 tokens of input (two verbose viewpoints) + ~250 of output, each Agree click is non-trivial. Should we cache `buildAgreementPrompt` results keyed by `hash(shortView + longView)` to avoid repeat-tap costs?

## See also

- [[entity-backend-client]] — `lib/clients/aitext.ts` is the underlying transport
- [[entity-http]] — the primitive the transport uses
- [[concept-council-tap-in]] — the user-action pattern this entity implements
- [[decision-dual-view-with-agree]] — why "All" mode fires both views in parallel, with opt-in synthesis
- [[../COST_OPTIMIZATION_5_DOLLAR.md]] — Rule 4 (LLM never on default request path)
- [[entity-dev-launcher]] — keeps ai-text's three processes up so the Council works at all
