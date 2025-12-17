@echo off
REM Quick script to start just the frontend server

echo.
echo ========================================
echo  Starting Creerlio Frontend
echo ========================================
echo.

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting frontend on http://localhost:3000
echo.
echo Keep this window open!
echo.
npm run dev

pause


