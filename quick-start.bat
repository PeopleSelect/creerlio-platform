@echo off
REM Creerlio Platform - Quick Start Script (Windows)
REM This script sets up and starts the entire platform

echo 🚀 Creerlio Platform - Quick Start
echo ==================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating from template...
    copy .env.example .env
    echo ⚠️  Please edit .env and add your API keys before continuing
    echo.
    pause
)

REM Backend Setup
echo 📦 Setting up backend...
cd backend

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -q -r ..\requirements.txt

echo Initializing database...
python -c "from app.database import init_db; init_db()" 2>nul || echo Database initialization skipped

echo ✅ Backend setup complete!
echo.

REM Frontend Setup
echo 📦 Setting up frontend...
cd ..\frontend

if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
) else (
    echo Node modules already installed
)

echo ✅ Frontend setup complete!
echo.

REM Start services
echo 🌐 Starting services...
echo.
echo Backend will run on: http://localhost:8000
echo Frontend will run on: http://localhost:3000
echo API docs will be at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop all services
echo.

REM Start backend in new window
cd ..\backend
start "Creerlio Backend" cmd /k "venv\Scripts\activate.bat && python main.py"

REM Wait a moment
timeout /t 3 /nobreak >nul

REM Start frontend in new window
cd ..\frontend
start "Creerlio Frontend" cmd /k "npm run dev"

echo.
echo ✅ Services started in separate windows
echo Close the windows or press Ctrl+C here to exit
pause

