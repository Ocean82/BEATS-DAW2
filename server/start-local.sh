#!/usr/bin/env bash
# Start Python + Node from server/ (WSL). Run frontend separately from project root.
# Usage: from server/ run: bash start-local.sh
# Then in another terminal, from project root: npm run dev

set -e
cd "$(dirname "$0")"

if [[ ! -f "venv/bin/activate" ]] && [[ ! -f "../venv/bin/activate" ]]; then
  echo "[ERROR] Virtual environment not found. Run: bash check-setup.sh"
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "[ERROR] Node modules not found. Run: npm install"
  exit 1
fi

echo "========================================"
echo " Stem Splitter Local Development"
echo "========================================"
echo ""
echo "Python: http://localhost:5000"
echo "Node API: http://localhost:3001"
echo "Frontend: run in another terminal from project root: npm run dev"
echo "          then open http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop Python and Node."
echo ""

if [[ -f "venv/bin/activate" ]]; then
  source venv/bin/activate
elif [[ -f "../venv/bin/activate" ]]; then
  source ../venv/bin/activate
fi

# Optional: use Python port from .env (e.g. PYTHON_SERVICE_PORT=5001 if 5000 is in use)
if [[ -f .env ]]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^PYTHON_SERVICE_PORT= ]] && export "$line"
    [[ "$line" =~ ^PYTHON_SERVICE_URL= ]] && export "$line"
  done < .env 2>/dev/null || true
fi

# Start Python in background, then Node in foreground
python python_service/stem_splitter.py &
PY_PID=$!
trap "kill $PY_PID 2>/dev/null" EXIT
sleep 3
npm run dev
