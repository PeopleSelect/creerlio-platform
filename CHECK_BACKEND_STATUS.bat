@echo off
echo Checking Backend Status...
echo.
netstat -an | findstr ":8000.*LISTENING" >nul
if %errorlevel% == 0 (
    echo [OK] Backend is RUNNING on port 8000!
    echo.
    echo Test URLs:
    echo   Health: http://localhost:8000/health
    echo   API Docs: http://localhost:8000/docs
    echo   Registration: http://localhost:3000/register
    echo.
) else (
    echo [WARNING] Backend is NOT running on port 8000
    echo.
    echo To start the backend, run:
    echo   AUTO_START_BACKEND.bat
    echo.
)
pause


