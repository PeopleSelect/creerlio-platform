@echo off
echo ========================================
echo   Finding Python Installation
echo ========================================
echo.

set FOUND=0

echo Checking standard commands...
echo.

REM Check py launcher
where py >nul 2>&1
if %errorlevel% == 0 (
    echo [FOUND] 'py' command available
    py --version
    set FOUND=1
    echo.
)

REM Check python command
where python >nul 2>&1
if %errorlevel% == 0 (
    echo [FOUND] 'python' command available
    python --version
    set FOUND=1
    echo.
)

REM Check python3 command
where python3 >nul 2>&1
if %errorlevel% == 0 (
    echo [FOUND] 'python3' command available
    python3 --version
    set FOUND=1
    echo.
)

echo Checking common installation paths...
echo.

REM Check common paths
if exist "C:\Python312\python.exe" (
    echo [FOUND] C:\Python312\python.exe
    C:\Python312\python.exe --version
    set FOUND=1
    echo.
)

if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    echo [FOUND] %LOCALAPPDATA%\Programs\Python\Python312\python.exe
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" --version
    set FOUND=1
    echo.
)

if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
    echo [FOUND] %USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe
    "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" --version
    set FOUND=1
    echo.
)

if exist "C:\Program Files\Python312\python.exe" (
    echo [FOUND] C:\Program Files\Python312\python.exe
    "C:\Program Files\Python312\python.exe" --version
    set FOUND=1
    echo.
)

echo Searching for other Python installations...
echo This may take a moment...
echo.

REM Search Program Files
for /f "delims=" %%i in ('dir /s /b "C:\Program Files\Python*\python.exe" 2^>nul') do (
    if exist "%%i" (
        echo [FOUND] %%i
        "%%i" --version
        set FOUND=1
        echo.
    )
)

REM Search LocalAppData
for /f "delims=" %%i in ('dir /s /b "%LOCALAPPDATA%\Programs\Python*\python.exe" 2^>nul') do (
    if exist "%%i" (
        echo [FOUND] %%i
        "%%i" --version
        set FOUND=1
        echo.
    )
)

if %FOUND% == 0 (
    echo.
    echo ========================================
    echo   Python NOT FOUND
    echo ========================================
    echo.
    echo Please install Python 3.12:
    echo   1. Download from: https://www.python.org/downloads/
    echo   2. Run the installer
    echo   3. IMPORTANT: Check "Add Python to PATH"
    echo   4. Click "Install Now"
    echo.
    echo After installation, restart this script.
    echo.
) else (
    echo.
    echo ========================================
    echo   Python Found!
    echo ========================================
    echo.
    echo You can now run: AUTO_START_BACKEND.bat
    echo.
)

pause


