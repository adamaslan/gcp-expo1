---
date: 2026-05-23
type: entity
tags: [dev-experience, orchestration, scripts]
sources: [../scripts/dev-all.sh, ../package.json, ../.claude/CLAUDE.md]
---

# Entity: Dev Launcher (`scripts/dev-all.sh` + `npm run dev`)

The single command that brings the entire local stack to life. Replaces the prior pattern of "open four terminals and remember which backend goes on which port." Codified in the project [CLAUDE.md](../.claude/CLAUDE.md) "Dev Mode: Always Start All Three Backends" rule.

## What it is

`scripts/dev-all.sh` is a bash launcher that:

1. **Frees** ports 8080, 8081, 8000, 8001, 3002 (kills any prior runs)
2. **Starts** five backend processes in the background, each logging to `/tmp/gcp3-mobile-dev/<name>.log`:
   - `gcp3` — uvicorn on :8080 (`~/code/gcp3/backend`)
   - `holdfold` — uvicorn on :8081 (`~/code/holdemfoldemapp/backend`)
   - `chromadb` — `chroma run --path chroma_db --port 8000` (`~/code/ai-text-opt-1024`)
   - `aitext-embed` — uvicorn on 127.0.0.1:8001 — **loads a 1.47 GB embedding model**
   - `aitext-next` — `npm run dev -- -p 3002` (`~/code/ai-text-opt-1024/backend`)
3. **Probes health** for up to 30s, prints a status line `gcp3:200 hf:200 chroma:200 embed:200 aitext:200`
4. **Runs** `npx expo start --clear` in the foreground
5. **Traps** EXIT / INT / TERM to kill all backend PIDs and re-free the ports (so Ctrl+C cleans up everything)

## ai-text is actually three processes

This is the most-likely-to-bite gotcha. The ai-text-opt RAG backend needs:

- **ChromaDB** on :8000 — vector store
- **Embed service** on :8001 — Python FastAPI loading `intfloat/e5-large-v2` (1.47 GB)
- **Next.js API** on :3002 — the `/api/chat` endpoint mobile actually calls

If the Next.js process is up but ChromaDB or the embed service isn't, `/api/chat` returns 503 with `{"chroma":"error","embed_service":"error"}` and the mobile fetch fails with the generic browser-side "Failed to fetch chat" error.

This bit during PR #6 dogfooding when the user was running `expo start` directly and only the Next.js process was started by the original (single-process) version of this launcher.

## Where used

- `package.json` → `"dev": "./scripts/dev-all.sh"` — the user-facing entry point
- `package.json` → `"expo-only": "expo start"` — the escape hatch for when you genuinely don't want backends running (e.g. pointing at deployed gcp3 only)
- `.claude/CLAUDE.md` "Dev Mode" rule — instructs the LLM to always use `npm run dev` for any "start the app" request

## Configuration

Path env vars (override if your checkout layout differs from `~/code/<repo>`):

| Var | Default |
|---|---|
| `GCP3_BACKEND` | `~/code/gcp3/backend` |
| `HOLDFOLD_BACKEND` | `~/code/holdemfoldemapp/backend` |
| `AITEXT_ROOT` | `~/code/ai-text-opt-1024` |
| `EXPO_PROJECT` | `~/code/gcp3-mobile` |

Missing directories are skipped with a `⚠ Skipping <name>` warning; the launcher still continues with whatever's available. Expo always starts last regardless of backend health.

## Known failures

1. **First-run embedding download is slow.** The embed service on :8001 has to download `intfloat/e5-large-v2` (~1.47 GB) on its first run. Subsequent runs are cached. The 30s health probe will time out on first run; Expo starts anyway and chat will fail until the embed service finishes loading. Watch `/tmp/gcp3-mobile-dev/aitext-embed.log`.
2. **Port collision with prior runs.** If a previous Ctrl+C didn't propagate (kernel kill, panic) ports stay held by orphan Python processes. The pre-flight `lsof -ti:$port | xargs -r kill -9` handles this, but only for the explicit port list — if a user has bound any of these ports to something unrelated, the launcher kills it without warning.
3. **Conda / mamba env not active.** Both Python backends assume `uvicorn` is on the PATH. If the user's active shell hasn't activated the right env, the backend fails immediately and only the log file shows the import error.

## Open questions

- Should the launcher detect "first run" (embed model not cached) and warn upfront? Currently it just waits 30s and reports timeout, which is confusing.
- Should we add a `--no-aitext` flag for when the user is iterating on Briefing/Trade only? Right now they'd use `npm run expo-only` and lose the gcp3/holdfold launches too.
- Should the launcher write a single combined log instead of five files? Five files = easier per-process tail; one file = easier "what happened" search.

## See also

- [[entity-backend-client]] — the clients that call the backends this launcher starts
- [[entity-council-composer]] — broken whenever ai-text's three processes aren't all up
- [[entity-http]] — what surfaces backend failures back to the UI
- [[../MULTI_BACKEND_INTEGRATION.md]] — Step 1 (config) and Step 5 (auth) discuss the same env vars
- `.claude/CLAUDE.md` "Dev Mode" rule — the project rule this entity implements
