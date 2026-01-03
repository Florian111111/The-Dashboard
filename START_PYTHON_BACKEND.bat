@echo off
cd /d "%~dp0"
echo ========================================
echo   Python yfinance Backend Starter
echo ========================================
echo.

echo [1/3] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Python found! Version: %PYTHON_VERSION%
echo.

echo [2/3] Checking if dependencies are installed...
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo Dependencies not found. Installing...
    echo This may take a few minutes (first time only)...
    echo.
    pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies
        echo Please check your internet connection and try again
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
) else (
    echo Dependencies already installed.
)
echo.

echo [3/3] Starting Python yfinance Backend...
echo.
echo ========================================
echo   Backend running on: http://localhost:3001
echo   Press Ctrl+C to stop the server
echo ========================================
echo.
python python_backend.py

pause

