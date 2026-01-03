@echo off
cd /d "%~dp0"
echo ========================================
echo   Python yfinance Backend
echo   Port 3001
echo ========================================
echo.
echo Starting backend...
echo Keep this window open!
echo.
python python_backend.py
pause

