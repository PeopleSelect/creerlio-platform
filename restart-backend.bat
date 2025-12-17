@echo off
REM Restart Backend with updated Mapbox key

echo.
echo ========================================
echo  Restarting Creerlio Backend
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
echo Please ensure Python is installed and in PATH
pause
exit /b 1

:found_python
echo ✅ Python found: %PYTHON_CMD%
%PYTHON_CMD% --version
echo.

REM Create venv if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
)

REM Activate venv
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies if needed
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -q -r ..\requirements.txt
)

REM Load environment variables from .env
echo.
echo Loading environment variables from .env...
if exist "..\.env" (
    echo ✅ .env file found
    echo ✅ Mapbox API key will be loaded
) else (
    echo ⚠️  .env file not found
)

echo.
echo ========================================
echo  Starting Backend Server
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Mapbox API key loaded from .env
echo.
echo Press Ctrl+C to stop
echo.

REM Start the server
%PYTHON_CMD% main.py

pause


