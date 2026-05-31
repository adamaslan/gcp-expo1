# Start Development Server (all 3 backends + Expo)

Starts the full dev stack — gcp3, holdfold, and the ai-text trio — alongside Expo, then runs a staleness check against the deployed gcp3 backend and auto-fixes known scheduler issues.

This replaces the previous `npx expo start`-only flow. Per [.claude/CLAUDE.md](../CLAUDE.md) "Dev Mode: Always Start All Three Backends", Expo alone produces user-visible "Failed to fetch" errors on tabs that hit ai-text or holdfold.

## What it starts

| Service | Port | Purpose |
|---|---|---|
| gcp3 (FastAPI) | 8080 | market data, signals, content |
| holdfold (FastAPI) | 8081 | poker / hand analysis |
| ChromaDB | 8000 | vector store for ai-text RAG |
| embed-service | 8001 | 1.47 GB embedding model |
| ai-text Next.js | 3002 | `/api/chat` endpoint |
| Expo (Metro) | 8082 | foreground — Ctrl+C tears the rest down |

## Steps

1. Free ports 8080/8081/8000/8001/3002/8082 from prior runs
2. Start each backend in the background with logs in `/tmp/gcp3-mobile-dev/`
3. Wait up to 30 s for health probes
4. Run staleness check against deployed gcp3 `/debug/status`
5. Auto-fix known scheduler config issues (with confirmation) if found
6. Start Expo in the foreground

## Rules

- Use `npm run dev` (calls `scripts/dev-all.sh`) — never `npx expo start` on its own
- If a backend repo isn't checked out at the expected path, log a warning and continue (the script handles this)
- Staleness check is best-effort — never block Expo startup on a stale-data finding
- Auto-fix prompts the user before mutating any deployed scheduler job
- Co-locate logs in `/tmp/gcp3-mobile-dev/` for easy `tail -f`

## Execute

```bash
cd /Users/adamaslan/code/gcp3-mobile
npm run dev
```

## Staleness Check

After backends come up, `scripts/dev-all.sh` invokes `scripts/check-staleness.sh`, which:

1. Hits `https://gcp3-backend-1007181159506.us-central1.run.app/debug/status`
2. Parses `industry_cache.freshness_hours` and `industry_cache.stale`
3. Parses `gcp3_cache.live_doc_count` (warns if 0)
4. Checks `missing_expected_routes` (warns if any of `/content`, `/signals`, `/market-overview`, etc. are missing)
5. Probes the midday scheduler job's URI for the required `?skip_gemini=true` flag — the root cause of the [2026-04-24 blog stale incident](../../docs/wiki-gcp3/incident-2026-04-24-blog-stale-2days.md) per gcp3 wiki
6. Offers to run the fix if it's missing:
   ```bash
   gcloud scheduler jobs update http gcp3-midday-intraday-refresh \
     --location=us-central1 --project=ttb-lang1 \
     --uri="<BASE_URI>?skip_gemini=true"
   ```

The check is bounded to ~5 s total. If `gcloud` isn't authenticated or the project isn't `ttb-lang1`, the scheduler probe is skipped with a warning — Expo still starts.

## When NOT to use this command

- Pointing `.env.local` at deployed backends — run `npm run expo-only` instead, or local services will conflict with cloud URLs.
- On a Codespace / remote container without local Python/Node.
- When you want to debug only the frontend without backend noise — use `npm run expo-only`.

## Stop

Ctrl+C in the foreground Expo terminal. The trap in `dev-all.sh` kills every backend and frees their ports — no `Address already in use` on the next run.
