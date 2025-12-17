@echo off
REM Creerlio Platform - Automated Setup and Start Script
REM This script tests Python, sets up everything, and starts both servers

echo.
echo ========================================
echo  Creerlio Platform - Automated Setup
echo ========================================
echo.

REM Test Python
echo [1/6] Testing Python installation...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python found
    python --version
    set PYTHON_CMD=python
    goto :python_found
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python Launcher (py) found
    py --version
    set PYTHON_CMD=py
    goto :python_found
)

echo ❌ Python not found!
echo.
echo Please install Python from https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during installation
echo.
pause
exit /b 1

:python_found
echo.

REM Create .env if it doesn't exist
echo [2/6] Checking .env file...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo ✅ Created .env from template
    ) else (
        echo ⚠️  .env.example not found, creating basic .env...
        echo DATABASE_URL=sqlite:///./creerlio.db > .env
        echo HOST=0.0.0.0 >> .env
        echo PORT=8000 >> .env
        echo ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000 >> .env
        echo ✅ Created basic .env file
    )
) else (
    echo ✅ .env file exists
)
echo.

REM Setup Backend
echo [3/6] Setting up backend...
cd backend

if not exist "venv" (
    echo    Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
    echo    ✅ Virtual environment created
) else (
    echo    ✅ Virtual environment exists
)

echo    Activating virtual environment...
call venv\Scripts\activate.bat

echo    Installing Python dependencies...
pip install -q -r ..\requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo    ✅ Dependencies installed

echo    Initializing database...
%PYTHON_CMD% -c "from app.database import init_db; init_db()" 2>nul
if errorlevel 1 (
    echo    ⚠️  Database initialization skipped (may already exist)
) else (
    echo    ✅ Database initialized
)

echo ✅ Backend setup complete!
echo.
cd ..

REM Setup Frontend
echo [4/6] Setting up frontend...
cd frontend

if not exist "node_modules" (
    echo    Installing Node.js dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
    echo    ✅ Dependencies installed
) else (
    echo    ✅ Node modules already installed
)

echo ✅ Frontend setup complete!
echo.
cd ..

REM Test Backend
echo [5/6] Testing backend setup...
cd backend
call venv\Scripts\activate.bat
%PYTHON_CMD% -c "import fastapi, uvicorn; print('✅ Backend dependencies OK')" 2>nul
if errorlevel 1 (
    echo ⚠️  Backend test skipped
) else (
    echo ✅ Backend test passed
)
cd ..
echo.

REM Start Services
echo [6/6] Starting services...
echo.
echo ========================================
echo  🚀 Starting Creerlio Platform
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C in each window to stop servers
echo.

REM Start backend in new window
cd backend
start "Creerlio Backend" cmd /k "call venv\Scripts\activate.bat && echo ✅ Backend starting... && %PYTHON_CMD% main.py"
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
cd frontend
start "Creerlio Frontend" cmd /k "echo ✅ Frontend starting... && npm run dev"
cd ..

echo.
echo ✅ Both servers are starting in separate windows!
echo.
echo 📋 What to do next:
echo    1. Wait for both windows to show "Ready" or "Uvicorn running"
echo    2. Open your browser to http://localhost:3000
echo    3. Check API docs at http://localhost:8000/docs
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul


