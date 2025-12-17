@echo off
title Creerlio Backend Server
color 0A
echo ========================================
echo   Creerlio Platform - Backend Server
echo ========================================
echo.

cd /d "%~dp0backend"

REM Try common Python installation paths
set PYTHON_CMD=
set PYTHON_FOUND=0

REM Check if Python is in PATH first
where py >nul 2>&1
if %errorlevel% == 0 (
    py --version >nul 2>&1
    if %errorlevel% == 0 (
        set PYTHON_CMD=py
        set PYTHON_FOUND=1
        echo [OK] Found Python via 'py' command
    )
)

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

REM Try common installation paths
if %PYTHON_FOUND% == 0 (
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe
        set PYTHON_FOUND=1
        echo [OK] Found Python at %LOCALAPPDATA%\Programs\Python\Python312\python.exe
    ) else if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
        set PYTHON_CMD=%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe
        set PYTHON_FOUND=1
        echo [OK] Found Python at %USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe
    ) else if exist "C:\Python312\python.exe" (
        set PYTHON_CMD=C:\Python312\python.exe
        set PYTHON_FOUND=1
        echo [OK] Found Python at C:\Python312\python.exe
    ) else if exist "C:\Program Files\Python312\python.exe" (
        set PYTHON_CMD=C:\Program Files\Python312\python.exe
        set PYTHON_FOUND=1
        echo [OK] Found Python at C:\Program Files\Python312\python.exe
    )
)

REM If still not found, try to find any Python 3.12
if %PYTHON_FOUND% == 0 (
    echo [INFO] Searching for Python 3.12...
    for /f "delims=" %%i in ('dir /s /b "%LOCALAPPDATA%\Programs\Python*\python.exe" 2^>nul') do (
        if exist "%%i" (
            "%%i" --version 2>nul | findstr "3.12" >nul
            if %errorlevel% == 0 (
                set PYTHON_CMD=%%i
                set PYTHON_FOUND=1
                echo [OK] Found Python at %%i
                goto :found
            )
        )
    )
    :found
)

if %PYTHON_FOUND% == 0 (
    echo.
    echo [ERROR] Python 3.12 not found!
    echo.
    echo Please run: FIND_PYTHON.bat to locate Python
    echo Or install Python 3.12 from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [INFO] Using: %PYTHON_CMD%
%PYTHON_CMD% --version
echo.

REM Create venv if it doesn't exist
if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    "%PYTHON_CMD%" -m venv venv
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
"%PYTHON_CMD%" -c "from app.database import init_db; init_db()" 2>nul
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
"%PYTHON_CMD%" main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start
    echo Check the error messages above
    pause
)


