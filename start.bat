@echo off
title DigiHall AI - Exam Attendance & Anti-Proxy System (Live Reload Mode)
echo =======================================================
echo    DigiHall AI - Exam Attendance & Anti-Proxy System
echo               🚀 LIVE RELOAD DEV MODE 🚀
echo =======================================================
echo.
echo [*] Starting Next.js Frontend Dev Server (Port 3000 with Hot Reloading)...
start "DigiHall Next.js Frontend (Port 3000)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo [*] Starting FastAPI AI Backend (Port 8000 with Live Auto-Reload)...
python main.py

if errorlevel 1 (
    echo.
    echo [ERROR] An error occurred while starting the application.
    pause
)
