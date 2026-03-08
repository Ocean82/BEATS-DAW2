@echo off
echo ========================================
echo  Stem Splitter Setup
echo ========================================
echo.

echo [1/4] Creating Python virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create venv. Make sure Python 3.8+ is installed.
    pause
    exit /b 1
)

echo [2/4] Activating venv and installing Python packages...
call venv\Scripts\activate.bat
pip install -r requirements-python.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python packages.
    pause
    exit /b 1
)

echo [3/4] Installing Node.js packages...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install Node packages.
    pause
    exit /b 1
)

echo [4/4] Installing frontend packages...
cd ..
call npm install
cd server

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo To start the app:
echo   cd server
echo   start-local.bat
echo.
echo Or manually:
echo   Terminal 1: python python_service\stem_splitter.py
echo   Terminal 2: npm run dev
echo   Terminal 3: cd .. ^&^& npm run dev
echo.
pause
