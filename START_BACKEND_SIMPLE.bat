@echo off
REM Simple backend startup script that works with any terminal
REM This bypasses PowerShell execution policy issues

echo Starting Creerlio Backend...

cd /d "%~dp0"

REM Use venv Python directly (bypasses activation issues)
if exist "venv\Scripts\python.exe" (
    echo Using virtual environment...
    venv\Scripts\python.exe -m pip install -q -r requirements.txt
    cd backend
    venv\..\..\venv\Scripts\python.exe main.py
) else (
    echo Virtual environment not found. Creating...
    python -m venv venv
    venv\Scripts\python.exe -m pip install -r requirements.txt
    cd backend
    ..\venv\Scripts\python.exe main.py
)

pause
