@echo off
cd /d "%~dp0"
echo ========================================
echo   Starting Both Backends
echo   Node.js (Port 3000) + Python (Port 3001)
echo ========================================
echo.
echo Script is running! If you see this, the file works.
echo.
pause

REM Check Node.js
echo [Checking] Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo Node.js found!
echo.

REM Check Python
echo [Checking] Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Python found! Version: %PYTHON_VERSION%
echo.

REM Install Node.js dependencies if needed
echo [Node.js] Checking dependencies...
if not exist "node_modules" (
    echo Installing Node.js dependencies (first time only)...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install Node.js dependencies
        pause
        exit /b 1
    )
) else (
    echo Node.js dependencies already installed.
)
echo.

REM Install Python dependencies if needed
echo [Python] Checking dependencies...
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo Installing Python dependencies (first time only)...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install Python dependencies
        pause
        exit /b 1
    )
) else (
    echo Python dependencies already installed.
)
echo.

echo ========================================
echo   Starting Backends...
echo ========================================
echo.
echo Node.js Backend: http://localhost:3000
echo Python Backend:  http://localhost:3001
echo.
echo Opening browser in 3 seconds...
echo.
echo Press Ctrl+C in each window to stop the servers
echo.

REM Start Node.js backend in new window
start "Node.js Backend (Port 3000)" cmd /k "cd /d %~dp0 && npm start"

REM Wait a moment for Node.js to start
timeout /t 2 /nobreak >nul

REM Start Python backend in new window
start "Python Backend (Port 3001)" cmd /k "cd /d %~dp0 && python python_backend.py"

REM Wait a moment for Python to start
timeout /t 3 /nobreak >nul

REM Open browser
start http://localhost:3000

echo.
echo ========================================
echo   Both backends are starting!
echo ========================================
echo.
echo Two new windows have opened:
echo   - Node.js Backend (Port 3000)
echo   - Python Backend (Port 3001)
echo.
echo Browser should open automatically.
echo Close the windows to stop the servers.
echo.
pause

