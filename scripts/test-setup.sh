#!/usr/bin/env bash
# Verify project setup for WSL/Ubuntu (CPU-only). Run from project root.
# Usage: bash scripts/test-setup.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "========================================"
echo " Test: Setup (WSL/Ubuntu, CPU-only)"
echo "========================================"

if [[ ! -f "server/check-setup.sh" ]]; then
  echo "[FAIL] server/check-setup.sh not found. Run from project root."
  exit 1
fi

cd server && bash check-setup.sh
EXIT=$?
if [[ $EXIT -ne 0 ]]; then
  echo "[FAIL] Setup check failed (exit $EXIT)"
  exit $EXIT
fi
echo "[PASS] Setup check completed."
exit 0
