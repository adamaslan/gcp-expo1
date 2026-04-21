#!/usr/bin/env bash
# Prevents macOS from sleeping while a long task runs.
# Uses caffeinate (built-in on macOS) — no dependencies.
# Usage: ./scripts/stay-awake.sh
#        ./scripts/stay-awake.sh "npm run build"   (run a command then stop)

set -euo pipefail

if [[ "${1:-}" != "" ]]; then
  echo "Keeping awake while running: $*"
  caffeinate -dimsu -i bash -c "$*"
else
  echo "Keeping system awake indefinitely. Press Ctrl+C to stop."
  caffeinate -dimsu
fi
