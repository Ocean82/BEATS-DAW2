#!/usr/bin/env bash
# Project test runner for WSL/Ubuntu (CPU-only).
# 1) Runs setup verification (check-setup.sh)
# 2) If --health passed, runs health tests (requires backend running)
# Usage:
#   bash scripts/run-tests.sh              # setup only
#   bash scripts/run-tests.sh --health     # setup + health (requires server running)
#   BACKEND_URL=http://localhost:3001 bash scripts/run-tests.sh --health

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RUN_HEALTH=false
for arg in "$@"; do
  if [[ "$arg" == "--health" ]]; then
    RUN_HEALTH=true
    break
  fi
done

echo "========================================"
echo " BEATS-DAW2 Project Tests (WSL/Ubuntu)"
echo "========================================"

# Step 1: Setup
bash scripts/test-setup.sh
SETUP_EXIT=$?
if [[ $SETUP_EXIT -ne 0 ]]; then
  echo "Tests aborted: setup failed."
  exit $SETUP_EXIT
fi

# Step 2: Optional health checks
if [[ "$RUN_HEALTH" == "true" ]]; then
  BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
  bash scripts/test-health.sh "$BACKEND_URL"
  exit $?
fi

echo ""
echo "Tip: Start backend (server) and run health tests:"
echo "  Terminal 1: cd server && source venv/bin/activate && bash start-local.sh"
echo "  Terminal 2: bash scripts/run-tests.sh --health"
echo ""
exit 0
