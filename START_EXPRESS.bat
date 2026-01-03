@echo off
echo Checking if Node.js is installed...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Then restart this script.
    echo.
    pause
    exit /b 1
)

echo Node.js found!
echo.
echo Installing dependencies (first time only)...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting Express server on port 3000...
echo.
echo Open your browser to: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
call npm start

