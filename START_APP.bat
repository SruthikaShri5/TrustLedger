@echo off
echo ============================================
echo   TRUSTLEDGER - Starting Application
echo ============================================
echo.

echo [1/3] Checking MongoDB...
net start MongoDB >nul 2>&1
echo MongoDB: Running

echo.
echo [2/3] Starting Backend (FastAPI)...
start "TRUSTLEDGER Backend" cmd /k "cd /d %~dp0trustledger-backend && python main.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Starting Frontend (Next.js)...
start "TRUSTLEDGER Frontend" cmd /k "cd /d %~dp0trustledger-frontend && npm run dev"

echo Waiting for frontend to start...
timeout /t 8 /nobreak >nul

echo.
echo ============================================
echo   TRUSTLEDGER is starting up!
echo ============================================
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo   Login: user / user123
echo   Admin: admin / admin123
echo.
echo Opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause
