@echo off
cd /d "%~dp0"
echo ========================================
echo   Starting Both Backends
echo ========================================
echo.
echo Press any key to continue or close this window to cancel...
pause
echo.

echo Starting Node.js Backend...
start "Node.js Backend" cmd /k "cd /d %~dp0 && npm start"

timeout /t 2 /nobreak >nul

echo Starting Python Backend...
start "Python Backend" cmd /k "cd /d %~dp0 && python python_backend.py"

timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo.
echo Done! Two windows should have opened.
echo.
pause

