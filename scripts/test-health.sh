#!/usr/bin/env bash
# Health-check tests for Node API and Python stem service (WSL/Ubuntu).
# Requires backend running: cd server && bash start-local.sh
# Usage: bash scripts/test-health.sh [NODE_URL]

set -e
NODE_URL="${1:-http://localhost:3001}"
STEMS_HEALTH="${NODE_URL}/api/stems/health"
ROOT_HEALTH="${NODE_URL}/health"
FAILED=0

echo "========================================"
echo " Test: Health endpoints"
echo " Node API: $NODE_URL"
echo "========================================"

# Root health (Node only)
if curl -sf --max-time 5 "$ROOT_HEALTH" > /dev/null; then
  echo "[PASS] GET $ROOT_HEALTH"
else
  echo "[FAIL] GET $ROOT_HEALTH (Node API not reachable)"
  FAILED=$((FAILED + 1))
fi

# Stems health (Node + Python proxy)
RESP="$(curl -sf --max-time 10 -w "%{http_code}" -o /tmp/stems_health.json "$STEMS_HEALTH" 2>/dev/null)" || true
if [[ -f /tmp/stems_health.json ]] && [[ "$RESP" == "200" ]]; then
  echo "[PASS] GET $STEMS_HEALTH"
  if command -v jq &>/dev/null; then
    DEVICE="$(jq -r '.pythonService.device // "unknown"' /tmp/stems_health.json)"
    echo "      pythonService.device: $DEVICE (expect: cpu for WSL)"
  fi
else
  echo "[FAIL] GET $STEMS_HEALTH (response: ${RESP:-none})"
  echo "       Ensure Python service is running: cd server && source venv/bin/activate && python python_service/stem_splitter.py"
  FAILED=$((FAILED + 1))
fi

echo "========================================"
if [[ $FAILED -eq 0 ]]; then
  echo " Health tests: PASSED"
  echo "========================================"
  exit 0
else
  echo " Health tests: $FAILED failed"
  echo "========================================"
  exit 1
fi
