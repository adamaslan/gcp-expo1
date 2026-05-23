#!/usr/bin/env bash
# Dev launcher — starts everything Expo needs to be useful in dev mode.
# Per .claude/CLAUDE.md "Dev Mode: Always Start All Three Backends".
#
# Layout (note: ai-text is actually THREE processes, not one):
#   gcp3 backend         → http://localhost:8080         FastAPI
#   holdfold backend     → http://localhost:8081         FastAPI
#   chromadb (ai-text)   → http://localhost:8000         vector DB (local mode)
#   embed service        → http://127.0.0.1:8001         FastAPI, loads 1.47 GB model
#   ai-text Next.js      → http://localhost:3002         the /api/chat endpoint
#   expo                 → http://localhost:8082         Metro bundler (foreground)
#
# Ctrl+C in this terminal kills all the backends and Expo.
#
# Logs land in /tmp/gcp3-mobile-dev/. Use `tail -f` if anything looks off.

set -uo pipefail

# --- Paths (override via env vars if your checkout layout differs) ---
GCP3_BACKEND="${GCP3_BACKEND:-$HOME/code/gcp3/backend}"
HOLDFOLD_BACKEND="${HOLDFOLD_BACKEND:-$HOME/code/holdemfoldemapp/backend}"
AITEXT_ROOT="${AITEXT_ROOT:-$HOME/code/ai-text-opt-1024}"
EXPO_PROJECT="${EXPO_PROJECT:-$HOME/code/gcp3-mobile}"

LOG_DIR="/tmp/gcp3-mobile-dev"
mkdir -p "$LOG_DIR"

# Ports we own
PORTS=(8080 8081 8000 8001 3002)

# --- Child PIDs for trap cleanup ---
PIDS=()

cleanup() {
  echo
  echo "→ Shutting down backends…"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  # Free orphans on our ports just in case.
  for port in "${PORTS[@]}"; do
    lsof -ti:"$port" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  done
  echo "→ Done."
}
trap cleanup EXIT INT TERM

# --- Pre-flight: free our ports ---
echo "→ Freeing ports ${PORTS[*]} (if held by prior runs)…"
for port in "${PORTS[@]}"; do
  lsof -ti:"$port" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
done

start_proc() {
  local name="$1"
  local dir="$2"
  local cmd="$3"
  local logfile="$LOG_DIR/${name}.log"

  if [[ ! -d "$dir" ]]; then
    echo "⚠ Skipping $name — directory not found: $dir"
    return
  fi

  echo "→ Starting $name in $dir"
  (cd "$dir" && eval "$cmd") >"$logfile" 2>&1 &
  local pid=$!
  PIDS+=("$pid")
  echo "   pid=$pid  log=$logfile"
}

# --- gcp3 (FastAPI on 8080) ---
start_proc "gcp3" "$GCP3_BACKEND" \
  "uvicorn main:app --host 0.0.0.0 --port 8080 --reload"

# --- holdfold (FastAPI on 8081) ---
start_proc "holdfold" "$HOLDFOLD_BACKEND" \
  "uvicorn main:app --host 0.0.0.0 --port 8081 --reload"

# --- ai-text stack: 3 processes ---
#  (a) ChromaDB local server on 8000 — only when CHROMA_MODE=local (the default per .env.example)
start_proc "chromadb" "$AITEXT_ROOT" \
  "chroma run --path chroma_db --port 8000"

#  (b) Embed service on 127.0.0.1:8001 — loads the 1.47 GB embedding model.
#      Slow first start; subsequent starts are cached. The mobile /api/chat
#      call will hang until this is ready.
start_proc "aitext-embed" "$AITEXT_ROOT" \
  "uvicorn embed_service:app --host 127.0.0.1 --port 8001 --log-level warning"

#  (c) Next.js backend on 3002 (we override the default 3001 to avoid colliding
#      with the holdfold frontend if you ever run it).
start_proc "aitext-next" "$AITEXT_ROOT/backend" \
  "npm run dev -- -p 3002"

# --- Health probe (best-effort; Expo starts even if some are slow) ---
echo
echo "→ Waiting up to 30s for backends to come up (embed service may take longer)…"
for i in {1..30}; do
  gcp3_ok=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 http://localhost:8080/health 2>/dev/null || echo "000")
  hf_ok=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 http://localhost:8081/health 2>/dev/null || echo "000")
  ch_ok=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 http://localhost:8000/api/v1/heartbeat 2>/dev/null || echo "000")
  emb_ok=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 http://localhost:8001/health 2>/dev/null || echo "000")
  at_ok=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 http://localhost:3002/api/health 2>/dev/null || echo "000")
  printf "\r   gcp3:%s  hf:%s  chroma:%s  embed:%s  aitext:%s  (%ds)" \
    "$gcp3_ok" "$hf_ok" "$ch_ok" "$emb_ok" "$at_ok" "$i"
  if [[ "$gcp3_ok" == "200" && "$hf_ok" == "200" && "$ch_ok" == "200" && "$emb_ok" == "200" && "$at_ok" == "200" ]]; then
    break
  fi
  sleep 1
done
echo
echo

echo "→ Backend status (200 = healthy, anything else = check the log file):"
echo "   gcp3          http://localhost:8080            [$gcp3_ok]"
echo "   holdfold      http://localhost:8081            [$hf_ok]"
echo "   chromadb      http://localhost:8000            [$ch_ok]"
echo "   embed-service http://localhost:8001            [$emb_ok]"
echo "   ai-text       http://localhost:3002/api/health [$at_ok]"
echo "   logs in:      $LOG_DIR"
echo

# --- Expo in foreground ---
echo "→ Starting Expo (foreground)…"
cd "$EXPO_PROJECT"
exec npx expo start --clear
