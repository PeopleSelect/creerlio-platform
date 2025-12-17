@echo off
title Creerlio Backend Server
color 0A
echo ========================================
echo   Creerlio Platform - Backend Server
echo ========================================
echo.

cd /d "%~dp0backend"

REM Try to find Python - check multiple methods
set PYTHON_CMD=
set PYTHON_FOUND=0

REM Method 1: Try 'py' launcher (Windows Python Launcher)
where py >nul 2>&1
if %errorlevel% == 0 (
    py --version >nul 2>&1
    if %errorlevel% == 0 (
        set PYTHON_CMD=py
        set PYTHON_FOUND=1
        echo [OK] Found Python via 'py' launcher
    )
)

REM Method 2: Try 'python' command
if %PYTHON_FOUND% == 0 (
    where python >nul 2>&1
    if %errorlevel% == 0 (
        python --version >nul 2>&1
        if %errorlevel% == 0 (
            set PYTHON_CMD=python
            set PYTHON_FOUND=1
            echo [OK] Found Python via 'python' command
        )
    )
)

REM Method 3: Try 'python3' command
if %PYTHON_FOUND% == 0 (
    where python3 >nul 2>&1
    if %errorlevel% == 0 (
        python3 --version >nul 2>&1
        if %errorlevel% == 0 (
            set PYTHON_CMD=python3
            set PYTHON_FOUND=1
            echo [OK] Found Python via 'python3' command
        )
    )
)

REM Method 4: Check common installation paths
if %PYTHON_FOUND% == 0 (
    if exist "C:\Python312\python.exe" (
        set PYTHON_CMD=C:\Python312\python.exe
        set PYTHON_FOUND=1
        echo [OK] Found Python at C:\Python312\python.exe
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe
        set PYTHON_FOUND=1
        echo [OK] Found Python at %LOCALAPPDATA%\Programs\Python\Python312\python.exe
    ) else if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
        set PYTHON_CMD=%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe
        set PYTHON_FOUND=1
        echo [OK] Found Python at %USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe
    ) else if exist "C:\Program Files\Python312\python.exe" (
        set PYTHON_CMD=C:\Program Files\Python312\python.exe
        set PYTHON_FOUND=1
        echo [OK] Found Python at C:\Program Files\Python312\python.exe
    )
)

REM If still not found, try to find any Python installation
if %PYTHON_FOUND% == 0 (
    echo [INFO] Searching for Python installations...
    for /f "delims=" %%i in ('where /r "C:\Program Files" python.exe 2^>nul') do (
        if exist "%%i" (
            set PYTHON_CMD=%%i
            set PYTHON_FOUND=1
            echo [OK] Found Python at %%i
            goto :found
        )
    )
    for /f "delims=" %%i in ('where /r "%LOCALAPPDATA%\Programs" python.exe 2^>nul') do (
        if exist "%%i" (
            set PYTHON_CMD=%%i
            set PYTHON_FOUND=1
            echo [OK] Found Python at %%i
            goto :found
        )
    )
    :found
)

REM Final check
if %PYTHON_FOUND% == 0 (
    echo.
    echo [ERROR] Python not found!
    echo.
    echo Please do ONE of the following:
    echo.
    echo Option 1: Install Python 3.12
    echo   Download from: https://www.python.org/downloads/
    echo   IMPORTANT: Check "Add Python to PATH" during installation!
    echo.
    echo Option 2: Add Python to PATH manually
    echo   1. Find where Python is installed
    echo   2. Add it to System Environment Variables PATH
    echo.
    echo Option 3: Use full path to Python
    echo   Edit this script and set PYTHON_CMD to your Python path
    echo.
    pause
    exit /b 1
)

echo [INFO] Using: %PYTHON_CMD%
echo.

REM Create venv if it doesn't exist
if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment exists
)

REM Activate venv
echo [SETUP] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)

REM Install/upgrade dependencies
echo [SETUP] Checking dependencies...
pip install -q --upgrade pip
pip install -q -r ..\requirements.txt
if errorlevel 1 (
    echo [WARNING] Some dependencies may have failed to install
    echo Continuing anyway...
)

REM Initialize database
echo [SETUP] Initializing database...
%PYTHON_CMD% -c "from app.database import init_db; init_db()" 2>nul
if errorlevel 1 (
    echo [WARNING] Database initialization may have issues
    echo Continuing anyway...
) else (
    echo [OK] Database initialized
)

echo.
echo ========================================
echo   Starting Backend Server...
echo ========================================
echo.
echo Server URL: http://localhost:8000
echo Health Check: http://localhost:8000/health
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start server
%PYTHON_CMD% main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start
    echo Check the error messages above
    pause
)

