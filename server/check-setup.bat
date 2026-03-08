@echo off
echo ========================================
echo  Stem Splitter Setup Checker
echo ========================================
echo.

set ERRORS=0

REM Check Python
echo [1/8] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Python not found. Install Python 3.8+
    set /a ERRORS+=1
) else (
    python --version
    echo [OK] Python found
)
echo.

REM Check Node
echo [2/8] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Node.js not found. Install Node.js 18+
    set /a ERRORS+=1
) else (
    node --version
    echo [OK] Node.js found
)
echo.

REM Check venv
echo [3/8] Checking Python virtual environment...
if exist "venv\Scripts\activate.bat" (
    echo [OK] Virtual environment exists
) else (
    echo [FAIL] Virtual environment not found
    echo Run: python -m venv venv
    set /a ERRORS+=1
)
echo.

REM Check Python packages
echo [4/8] Checking Python packages...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    python -c "import demucs" >nul 2>&1
    if errorlevel 1 (
        echo [FAIL] Demucs not installed
        echo Run: pip install -r requirements-python.txt
        set /a ERRORS+=1
    ) else (
        echo [OK] Demucs installed
    )
    
    python -c "import torch" >nul 2>&1
    if errorlevel 1 (
        echo [FAIL] PyTorch not installed
        echo Run: pip install -r requirements-python.txt
        set /a ERRORS+=1
    ) else (
        echo [OK] PyTorch installed
    )
    
    python -c "import flask" >nul 2>&1
    if errorlevel 1 (
        echo [FAIL] Flask not installed
        echo Run: pip install -r requirements-python.txt
        set /a ERRORS+=1
    ) else (
        echo [OK] Flask installed
    )
)
echo.

REM Check Node packages
echo [5/8] Checking Node.js packages...
if exist "node_modules" (
    echo [OK] Node modules installed
) else (
    echo [FAIL] Node modules not found
    echo Run: npm install
    set /a ERRORS+=1
)
echo.

REM Check directories
echo [6/8] Checking directories...
if exist "uploads" (
    echo [OK] uploads/ exists
) else (
    echo [WARN] uploads/ not found (will be created automatically)
)

if exist "python_service" (
    echo [OK] python_service/ exists
) else (
    echo [FAIL] python_service/ not found
    set /a ERRORS+=1
)
echo.

REM Check files
echo [7/8] Checking required files...
if exist "python_service\stem_splitter.py" (
    echo [OK] stem_splitter.py exists
) else (
    echo [FAIL] stem_splitter.py not found
    set /a ERRORS+=1
)

if exist "requirements-python.txt" (
    echo [OK] requirements-python.txt exists
) else (
    echo [FAIL] requirements-python.txt not found
    set /a ERRORS+=1
)
echo.

REM Check frontend
echo [8/8] Checking frontend...
cd ..
if exist "node_modules" (
    echo [OK] Frontend node_modules installed
) else (
    echo [FAIL] Frontend node_modules not found
    echo Run: npm install (in root directory)
    set /a ERRORS+=1
)
cd server
echo.

REM Summary
echo ========================================
if "%ERRORS%"=="0" (
    echo  Setup Status: READY ✓
    echo ========================================
    echo.
    echo You're all set! To start the app:
    echo   start-local.bat
    echo.
) else (
    echo  Setup Status: INCOMPLETE ✗
    echo ========================================
    echo.
    echo Found %ERRORS% issue(s). Please fix them and run this script again.
    echo.
    echo Quick fix:
    echo   1. python -m venv venv
    echo   2. venv\Scripts\activate
    echo   3. pip install -r requirements-python.txt
    echo   4. npm install
    echo   5. cd .. ^&^& npm install ^&^& cd server
    echo.
)

pause
