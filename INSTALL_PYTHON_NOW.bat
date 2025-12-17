@echo off
title Install Python 3.12
color 0E
echo ========================================
echo   Python 3.12 Installation Helper
echo ========================================
echo.

if exist "%USERPROFILE%\Downloads\Python 3.12 Installer.exe" (
    echo [FOUND] Python 3.12 Installer in Downloads
    echo.
    echo [IMPORTANT] During installation:
    echo   1. Check the box: "Add Python to PATH"
    echo   2. Click "Install Now"
    echo   3. Wait for installation to complete
    echo.
    echo Starting installer...
    echo.
    start "" "%USERPROFILE%\Downloads\Python 3.12 Installer.exe"
    echo.
    echo Installer window should open.
    echo After installation completes, close this window and run:
    echo   AUTO_START_BACKEND.bat
    echo.
) else (
    echo [ERROR] Python 3.12 Installer not found in Downloads
    echo.
    echo Please download Python 3.12 from:
    echo   https://www.python.org/downloads/
    echo.
    echo Save it to your Downloads folder, then run this script again.
    echo.
)

pause


