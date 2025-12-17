@echo off
REM Start both servers with proper configuration

echo.
echo ========================================
echo  Starting Creerlio Platform Servers
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Python not found!
        pause
        exit /b 1
    )
    set PYTHON_CMD=py
) else (
    set PYTHON_CMD=python
)

REM Start Backend
echo [1/2] Starting Backend Server...
cd backend

if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
)

call venv\Scripts\activate.bat

REM Check if dependencies are installed
pip show fastapi >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing backend dependencies...
    pip install -q -r ..\requirements.txt
)

echo Starting backend on http://localhost:8000...
start "Creerlio Backend - Port 8000" cmd /k "call venv\Scripts\activate.bat && echo ✅ Backend starting... && echo Open: http://localhost:8000/docs && %PYTHON_CMD% main.py"
cd ..

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start Frontend
echo [2/2] Starting Frontend Server...
cd frontend

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

echo Starting frontend on http://localhost:3000...
start "Creerlio Frontend - Port 3000" cmd /k "echo ✅ Frontend starting... && echo Open: http://localhost:3000 && npm run dev"
cd ..

echo.
echo ========================================
echo  ✅ Servers Starting!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Two windows will open - keep them open!
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:3000
start http://localhost:8000/docs
echo.
pause


