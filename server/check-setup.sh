#!/usr/bin/env bash
# Stem Splitter Setup Checker (Linux / WSL / macOS)
# Run from server/: bash check-setup.sh

set -e
ERRORS=0
PYTHON=python3

echo "========================================"
echo " Stem Splitter Setup Checker"
echo "========================================"
echo ""

# Check Python (prefer python3)
echo "[1/8] Checking Python..."
if command -v python3 &>/dev/null; then
  PYTHON=python3
  $PYTHON --version
  echo "[OK] Python found"
elif command -v python &>/dev/null; then
  PYTHON=python
  $PYTHON --version
  echo "[OK] Python found"
else
  echo "[FAIL] Python not found. Install Python 3.8+"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Node
echo "[2/8] Checking Node.js..."
if command -v node &>/dev/null; then
  node --version
  echo "[OK] Node.js found"
else
  echo "[FAIL] Node.js not found. Install Node.js 18+"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check venv: prefer WSL/Linux (bin/activate). Project uses WSL; root venv is common.
echo "[3/8] Checking Python virtual environment..."
if [[ -f "venv/bin/activate" ]]; then
  echo "[OK] Virtual environment exists (server/venv, WSL)"
  VENV_ACTIVATE="venv/bin/activate"
elif [[ -f "../venv/bin/activate" ]]; then
  echo "[OK] Virtual environment exists (project root, WSL)"
  VENV_ACTIVATE="../venv/bin/activate"
elif [[ -f "venv/Scripts/activate.bat" ]]; then
  echo "[WARN] Only Windows-style venv found (server/venv/Scripts)"
  echo "       For WSL, use: cd server && $PYTHON -m venv venv  (then source venv/bin/activate)"
  VENV_ACTIVATE=""
else
  echo "[FAIL] Virtual environment not found"
  echo "Run (WSL): $PYTHON -m venv venv   then  source venv/bin/activate"
  ERRORS=$((ERRORS + 1))
  VENV_ACTIVATE=""
fi
echo ""

# Check Python packages (only if venv exists)
echo "[4/8] Checking Python packages..."
if [[ -n "$VENV_ACTIVATE" ]]; then
  set +e
  source "$VENV_ACTIVATE"
  for pkg in demucs torch flask; do
    if $PYTHON -c "import $pkg" 2>/dev/null; then
      echo "[OK] $pkg installed"
    else
      echo "[FAIL] $pkg not installed"
      echo "Run: pip install -r requirements-python.txt"
      ERRORS=$((ERRORS + 1))
    fi
  done
  set -e
fi
echo ""

# Check Node packages (server)
echo "[5/8] Checking Node.js packages..."
if [[ -d "node_modules" ]]; then
  echo "[OK] Node modules installed"
else
  echo "[FAIL] Node modules not found"
  echo "Run: npm install"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check directories
echo "[6/8] Checking directories..."
[[ -d "uploads" ]] && echo "[OK] uploads/ exists" || echo "[WARN] uploads/ not found (will be created automatically)"
if [[ -d "python_service" ]]; then
  echo "[OK] python_service/ exists"
else
  echo "[FAIL] python_service/ not found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check files
echo "[7/8] Checking required files..."
[[ -f "python_service/stem_splitter.py" ]] && echo "[OK] stem_splitter.py exists" || { echo "[FAIL] stem_splitter.py not found"; ERRORS=$((ERRORS + 1)); }
[[ -f "requirements-python.txt" ]] && echo "[OK] requirements-python.txt exists" || { echo "[FAIL] requirements-python.txt not found"; ERRORS=$((ERRORS + 1)); }
echo ""

# Check frontend (parent dir)
echo "[8/8] Checking frontend..."
ROOT="$(cd .. && pwd)"
if [[ -d "$ROOT/node_modules" ]]; then
  echo "[OK] Frontend node_modules installed"
else
  echo "[FAIL] Frontend node_modules not found"
  echo "Run: npm install (in project root)"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "========================================"
if [[ $ERRORS -eq 0 ]]; then
  echo " Setup Status: READY ✓"
  echo "========================================"
  echo ""
  echo "You're all set! To start the app (WSL):"
  echo "  Terminal 1: source venv/bin/activate (or source ../venv/bin/activate if venv is in project root)"
  echo "            then: python python_service/stem_splitter.py"
  echo "  Terminal 2: npm run dev   (from project root for frontend)"
  echo "  Terminal 3: npm run dev   (from server/ for Node API)"
  echo ""
else
  echo " Setup Status: INCOMPLETE ✗"
  echo "========================================"
  echo ""
  echo "Found $ERRORS issue(s). Please fix them and run this script again."
  echo ""
  echo "Quick fix (WSL):"
  echo "  1. $PYTHON -m venv venv   (or use project root: cd .. && $PYTHON -m venv venv)"
  echo "  2. source venv/bin/activate   (or source ../venv/bin/activate from server/)"
  echo "  3. pip install -r requirements-python.txt"
  echo "  4. npm install"
  echo "  5. cd .. && npm install && cd server"
  echo ""
fi
