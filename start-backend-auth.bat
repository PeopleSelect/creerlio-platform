@echo off
REM Start Backend with Authentication Support

echo.
echo ========================================
echo  Starting Creerlio Backend
echo  with Authentication Endpoints
echo ========================================
echo.

cd /d "%~dp0backend"

REM Find Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    goto :found_python
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    goto :found_python
)

echo ❌ Python not found!
pause
exit /b 1

:found_python
echo ✅ Python found
%PYTHON_CMD% --version
echo.

REM Create venv if needed
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create venv
        pause
        exit /b 1
    )
)

REM Activate venv
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/update dependencies
echo Installing dependencies...
pip install -q -r ..\requirements.txt

REM Initialize database (creates User table)
echo Initializing database...
%PYTHON_CMD% -c "from app.database import init_db; init_db()" 2>nul
if errorlevel 1 (
    echo ⚠️  Database initialization had issues (may already exist)
)

echo.
echo ========================================
echo  Starting Backend Server
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Auth Endpoints:
echo   POST /api/auth/register
echo   POST /api/auth/login
echo   GET  /api/auth/me
echo.
echo Press Ctrl+C to stop
echo.

%PYTHON_CMD% main.py

pause


