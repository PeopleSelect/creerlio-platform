@echo off
echo ========================================
echo Starting Creerlio Backend Server
echo ========================================
cd /d "%~dp0backend"

REM Try to find Python
where py >nul 2>&1
if %errorlevel% == 0 (
    set PYTHON_CMD=py
) else (
    where python >nul 2>&1
    if %errorlevel% == 0 (
        set PYTHON_CMD=python
    ) else (
        echo ERROR: Python not found!
        echo Please install Python 3.12 or add it to PATH
        pause
        exit /b 1
    )
)

echo Using Python: %PYTHON_CMD%

REM Create venv if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate venv
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -q -r ..\requirements.txt
if errorlevel 1 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

REM Initialize database
echo Initializing database...
%PYTHON_CMD% -c "from app.database import init_db; init_db()"
if errorlevel 1 (
    echo Warning: Database initialization may have failed
)

REM Start server
echo.
echo ========================================
echo Starting Backend Server...
echo ========================================
echo Server will be available at: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
%PYTHON_CMD% main.py

pause


