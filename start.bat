@echo off
rem Start API and client in two windows
start "API" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python -m uvicorn main:app --reload --port 8000"
start "Client" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 >nul
start http://localhost:5173
