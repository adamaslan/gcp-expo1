---
date: 2026-05-22
type: decision
tags: [deploy, ai-text-opt, rag, gcp]
sources: [../MULTI_BACKEND_INTEGRATION.md, ../../ai-text-opt-1024/backend/package.json]
---

# Decision: ai-text-opt Deploy Is Deferred (Not on GCP)

## Decision

The ai-text-opt backend (ChromaDB RAG + LLM chat) is not deployed anywhere as of 2026-05-22. The mobile app will plan for a chat feature backed by ai-text but will not implement the client until ai-text has a public URL. gcp3 and holdemfoldem are the only two backends the mobile app talks to in production today.

## Date

Recorded: 2026-05-22 (after verifying no Dockerfile / cloudbuild.yaml / vercel.json exists in `ai-text-opt-1024/`).

## Context

[[../MULTI_BACKEND_INTEGRATION.md]] lists three backends. Investigation revealed:

| Backend | GCP deploy? | Evidence |
|---------|-------------|----------|
| gcp3 | ✅ Cloud Run | `gcp3/backend/Dockerfile`, `cloudbuild.yaml` |
| holdemfoldem | ✅ Cloud Run | `holdemfoldemapp/backend/cloud-run/Dockerfile` (micromamba, port 8080) |
| ai-text-opt | ❌ none | Next.js app, `next dev -p 3001`; no Dockerfile, no cloudbuild, no vercel.json |

Internal ai-text-opt docs (in its `.claude/worktrees/`) mention Cloud Run as a *possible* future host for ChromaDB persistence, but nothing is wired.

## Alternatives considered

- **Deploy ai-text to Cloud Run before adding the mobile client.** Possible but requires solving ChromaDB persistence (Cloud Run is stateless; ChromaDB needs a mounted volume or a separate vector DB). Out of mobile-session scope per cross-repo rule 7.
- **Drop the RAG feature from mobile entirely.** Too aggressive — RAG chat is a planned product feature, not a nice-to-have.
- **Fold RAG into gcp3's existing `/agents/*/chat` endpoints.** Loses the ChromaDB retrieval layer; would require a backend change in gcp3. Out of mobile-session scope.

## Consequences

**Enables:**
- Mobile can ship gcp3 + holdfold integration now, without waiting on ai-text infra
- ai-text deploy choice (Cloud Run / Vercel / something else) stays unconstrained by mobile timing

**Rules out (until ai-text deploys):**
- The "Chat" tab planned in [[../MULTI_BACKEND_INTEGRATION.md]] Step 6
- Any feature that depends on ChromaDB retrieval (recommendation explanations, multi-document Q&A)

**What mobile will do in the meantime:**
- Stub the chat client in `lib/clients/aitext.ts` so the integration shape exists and `gen:types` (see [[decision-no-handrolled-types]]) can be exercised against the local dev server
- Gate any UI that calls it behind a feature flag that defaults off in production builds

## Validated by

The decision will be revisited when ai-text-opt gets a deploy. At that point this page should be archived per [[concept-archive-not-delete]] and replaced with an entity page for the deployed backend.

> ❓ Open question: Who owns the ai-text deploy choice? It is not the mobile team. The pending decision lives in the ai-text-opt-1024 repo, not here.

## See also

- [[../MULTI_BACKEND_INTEGRATION.md]]
- [[concept-single-backend-assumption]]
- [[concept-archive-not-delete]]
