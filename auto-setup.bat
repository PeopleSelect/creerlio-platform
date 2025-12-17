@echo off
REM Creerlio Platform - Smart Automated Setup
REM Finds Python automatically and sets everything up

echo.
echo ========================================
echo  Creerlio Platform - Auto Setup
echo ========================================
echo.

REM Find Python
set PYTHON_CMD=
echo [Testing Python...]

python --version >nul 2>&1
if %errorlevel% equ 0 (
    python --version
    set PYTHON_CMD=python
    goto :found_python
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    py --version
    set PYTHON_CMD=py
    goto :found_python
)

REM Try to find Python in common locations
echo Searching for Python installation...
set PYTHON_PATHS=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python311;%PROGRAMFILES%\Python312;%PROGRAMFILES%\Python311

for %%P in (%PYTHON_PATHS%) do (
    if exist "%%P\python.exe" (
        echo Found Python at: %%P
        set PYTHON_CMD=%%P\python.exe
        goto :found_python
    )
)

echo.
echo ❌ Python not found!
echo.
echo Please do one of the following:
echo   1. Restart this terminal (to load PATH)
echo   2. Install Python from https://www.python.org/downloads/
echo   3. Add Python to PATH manually
echo.
pause
exit /b 1

:found_python
echo ✅ Python found: %PYTHON_CMD%
echo.

REM Continue with setup
call setup-and-start.bat


