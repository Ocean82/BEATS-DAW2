@echo off
echo ========================================
echo  Stem Splitter Local Development
echo ========================================
echo.

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found!
    echo Please run setup first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements-python.txt
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [ERROR] Node modules not found!
    echo Please run: npm install
    pause
    exit /b 1
)

echo [1/3] Activating Python environment...
call venv\Scripts\activate.bat

echo [2/3] Starting services...
echo.
echo Python Service: http://localhost:5000
echo Node API: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop all services
echo.

REM Start both services
start /B cmd /c "python python_service\stem_splitter.py"
timeout /t 3 /nobreak > nul
npm run dev

pause
