#!/usr/bin/env bash
# Staleness check for the deployed gcp3 backend.
#
# Mirrors the data-freshness checks documented in:
#   ~/code/gcp3/docs/wiki-gcp3/incident-2026-04-24-blog-stale-2days.md
#   ~/code/gcp3/docs/wiki-gcp3/scheduler-jobs-config.md
#
# Hits /debug/status, parses freshness + missing routes, and probes the midday
# Cloud Scheduler job for the required ?skip_gemini=true flag (root cause of
# the 2-day blog-stale incident).
#
# If issues are found and gcloud is authenticated against project ttb-lang1,
# offers to apply the fix. Best-effort — never blocks Expo startup.
#
# Exit code is always 0 (informational). Caller in dev-all.sh tolerates non-zero
# anyway via `|| true`, but explicit 0 makes intent clear.

set -uo pipefail

BACKEND_URL="${GCP3_BACKEND_URL:-https://gcp3-backend-1007181159506.us-central1.run.app}"
SCHEDULER_JOB="${SCHEDULER_JOB:-gcp3-midday-intraday-refresh}"
GCP_LOCATION="${GCP_LOCATION:-us-central1}"
GCP_PROJECT="${GCP_PROJECT:-ttb-lang1}"
STALENESS_THRESHOLD_HOURS="${STALENESS_THRESHOLD_HOURS:-25}"
NON_INTERACTIVE="${STALENESS_NON_INTERACTIVE:-0}"

# Colors (fall back gracefully on dumb terminals)
if [[ -t 1 ]]; then
  C_RED=$'\e[31m'; C_YEL=$'\e[33m'; C_GRN=$'\e[32m'; C_DIM=$'\e[2m'; C_RST=$'\e[0m'
else
  C_RED=""; C_YEL=""; C_GRN=""; C_DIM=""; C_RST=""
fi

echo
echo "→ Staleness check against $BACKEND_URL"

# --- /debug/status ---------------------------------------------------------
status_json=$(curl -s --max-time 5 "$BACKEND_URL/debug/status" 2>/dev/null || echo "")
if [[ -z "$status_json" ]]; then
  echo "${C_YEL}⚠ /debug/status unreachable — skipping staleness check.${C_RST}"
  exit 0
fi

# jq is the cleanest parser; fall back to python if not installed.
parse() {
  local query="$1"
  if command -v jq >/dev/null 2>&1; then
    echo "$status_json" | jq -r "$query" 2>/dev/null
  else
    echo "$status_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
# very limited support — only handles the queries we use below
q = '$query'
try:
    if q == '.industry_cache.freshness_hours': print(d['industry_cache']['freshness_hours'])
    elif q == '.industry_cache.stale': print(str(d['industry_cache']['stale']).lower())
    elif q == '.industry_cache.newest_updated': print(d['industry_cache']['newest_updated'])
    elif q == '.gcp3_cache.live_doc_count': print(d['gcp3_cache']['live_doc_count'])
    elif q == '.missing_expected_routes | join(\",\")': print(','.join(d.get('missing_expected_routes') or []))
    elif q == '.today': print(d['today'])
    else: print('')
except Exception:
    print('')
" 2>/dev/null
  fi
}

freshness_h=$(parse '.industry_cache.freshness_hours')
stale_flag=$(parse '.industry_cache.stale')
newest_updated=$(parse '.industry_cache.newest_updated')
live_count=$(parse '.gcp3_cache.live_doc_count')
missing_routes=$(parse '.missing_expected_routes | join(",")')
backend_today=$(parse '.today')

problems=0

# industry_cache freshness
if [[ "$stale_flag" == "true" ]]; then
  echo "${C_RED}✗ industry_cache stale${C_RST} — freshness=${freshness_h}h (threshold ${STALENESS_THRESHOLD_HOURS}h), newest=${newest_updated}"
  problems=$((problems + 1))
elif [[ -n "$freshness_h" && "$freshness_h" != "null" ]]; then
  echo "${C_GRN}✓ industry_cache fresh${C_RST} — ${freshness_h}h old (newest=${newest_updated})"
fi

# live cache doc count
if [[ "$live_count" == "0" ]]; then
  echo "${C_RED}✗ gcp3_cache empty${C_RST} — no live (non-expired) docs. Bake pipeline likely failed."
  problems=$((problems + 1))
elif [[ -n "$live_count" && "$live_count" != "null" ]]; then
  echo "${C_GRN}✓ gcp3_cache${C_RST} — ${live_count} live docs"
fi

# missing expected routes
if [[ -n "$missing_routes" ]]; then
  echo "${C_RED}✗ deployed code is missing routes${C_RST}: $missing_routes"
  echo "  → backend Cloud Run may be on an old revision; redeploy needed"
  problems=$((problems + 1))
fi

# --- Cloud Scheduler probe -------------------------------------------------
if ! command -v gcloud >/dev/null 2>&1; then
  echo "${C_DIM}…skipping scheduler probe — gcloud not installed${C_RST}"
  exit 0
fi

# Confirm we have auth + correct project context. `gcloud config get-value` is
# cheap and offline.
active_project=$(gcloud config get-value project 2>/dev/null || echo "")
if [[ "$active_project" != "$GCP_PROJECT" ]]; then
  echo "${C_DIM}…skipping scheduler probe — active project '$active_project' != '$GCP_PROJECT'${C_RST}"
  exit 0
fi

# auth check — `gcloud auth print-access-token` fails fast if no creds.
if ! gcloud auth print-access-token >/dev/null 2>&1; then
  echo "${C_DIM}…skipping scheduler probe — gcloud not authenticated (run: gcloud auth login)${C_RST}"
  exit 0
fi

echo
echo "→ Checking Cloud Scheduler job '$SCHEDULER_JOB' for ?skip_gemini=true"
midday_uri=$(timeout 8 gcloud scheduler jobs describe "$SCHEDULER_JOB" \
  --location="$GCP_LOCATION" --project="$GCP_PROJECT" \
  --format="value(httpTarget.uri)" 2>/dev/null || echo "")

if [[ -z "$midday_uri" ]]; then
  echo "${C_YEL}⚠ could not describe scheduler job — permission or job-name issue${C_RST}"
  exit 0
fi

if [[ "$midday_uri" == *"skip_gemini=true"* ]]; then
  echo "${C_GRN}✓ midday scheduler URI has skip_gemini=true${C_RST}"
  echo "  $midday_uri"
else
  echo "${C_RED}✗ midday scheduler URI missing skip_gemini=true${C_RST}"
  echo "  current: $midday_uri"
  echo "  This is the confirmed root cause of the 2026-04-24 blog-stale incident."
  problems=$((problems + 1))

  base_uri="${midday_uri%%\?*}"
  fixed_uri="${base_uri}?skip_gemini=true"

  if [[ "$NON_INTERACTIVE" == "1" ]]; then
    echo "${C_DIM}NON_INTERACTIVE=1 set — not applying fix${C_RST}"
  else
    echo
    echo "Proposed fix:"
    echo "  gcloud scheduler jobs update http $SCHEDULER_JOB \\"
    echo "    --location=$GCP_LOCATION --project=$GCP_PROJECT \\"
    echo "    --uri=\"$fixed_uri\""
    echo
    read -r -p "Apply this fix to the deployed scheduler job now? [y/N] " reply </dev/tty
    if [[ "$reply" =~ ^[Yy]$ ]]; then
      if gcloud scheduler jobs update http "$SCHEDULER_JOB" \
           --location="$GCP_LOCATION" --project="$GCP_PROJECT" \
           --uri="$fixed_uri"; then
        echo "${C_GRN}✓ scheduler URI updated${C_RST}"
      else
        echo "${C_RED}✗ gcloud update failed — fix manually${C_RST}"
      fi
    else
      echo "${C_DIM}…skipped. Apply manually when ready.${C_RST}"
    fi
  fi
fi

echo
if (( problems == 0 )); then
  echo "${C_GRN}→ Staleness check passed.${C_RST}"
else
  echo "${C_YEL}→ Staleness check found $problems issue(s).${C_RST} Expo will still start."
fi
exit 0
