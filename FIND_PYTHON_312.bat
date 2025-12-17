@echo off
title Python 3.12 Diagnostic Tool
color 0B
echo ========================================
echo   Python 3.12 Diagnostic Tool
echo ========================================
echo.
echo Searching for Python 3.12 installations...
echo.

set FOUND_COUNT=0

echo [1] Checking Windows Registry...
echo.
reg query "HKLM\SOFTWARE\Python\PythonCore\3.12\InstallPath" /ve 2>nul | findstr "REG_SZ" >nul
if %errorlevel% == 0 (
    for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Python\PythonCore\3.12\InstallPath" /ve 2^>nul ^| findstr "REG_SZ"') do (
        set REG_PATH=%%b
        if exist "!REG_PATH!python.exe" (
            set /a FOUND_COUNT+=1
            echo [FOUND #%FOUND_COUNT%] Registry: !REG_PATH!python.exe
            "!REG_PATH!python.exe" --version
            echo   Full path: !REG_PATH!python.exe
            echo.
        )
    )
)

reg query "HKCU\SOFTWARE\Python\PythonCore\3.12\InstallPath" /ve 2>nul | findstr "REG_SZ" >nul
if %errorlevel% == 0 (
    for /f "tokens=2*" %%a in ('reg query "HKCU\SOFTWARE\Python\PythonCore\3.12\InstallPath" /ve 2^>nul ^| findstr "REG_SZ"') do (
        set REG_PATH=%%b
        if exist "!REG_PATH!python.exe" (
            set /a FOUND_COUNT+=1
            echo [FOUND #%FOUND_COUNT%] Registry (User): !REG_PATH!python.exe
            "!REG_PATH!python.exe" --version
            echo   Full path: !REG_PATH!python.exe
            echo.
        )
    )
)

echo [2] Checking Common Installation Paths...
echo.

setlocal enabledelayedexpansion

REM Check standard paths
set PATHS[0]=%LOCALAPPDATA%\Programs\Python\Python312
set PATHS[1]=%USERPROFILE%\AppData\Local\Programs\Python\Python312
set PATHS[2]=C:\Python312
set PATHS[3]=C:\Program Files\Python312
set PATHS[4]=C:\Program Files (x86)\Python312
set PATHS[5]=%PROGRAMFILES%\Python312
set PATHS[6]=%PROGRAMFILES(X86)%\Python312

for /l %%i in (0,1,6) do (
    if exist "!PATHS[%%i]!\python.exe" (
        set /a FOUND_COUNT+=1
        echo [FOUND #!FOUND_COUNT!] !PATHS[%%i]!\python.exe
        "!PATHS[%%i]!\python.exe" --version
        echo   Full path: !PATHS[%%i]!\python.exe
        echo.
    )
)

echo [3] Searching All Python Installations...
echo This may take a moment...
echo.

REM Search Program Files
for /f "delims=" %%i in ('dir /s /b "C:\Program Files\Python*\python.exe" 2^>nul') do (
    "%%i" --version 2>nul | findstr "3.12" >nul
    if !errorlevel! == 0 (
        set /a FOUND_COUNT+=1
        echo [FOUND #!FOUND_COUNT!] %%i
        "%%i" --version
        echo   Full path: %%i
        echo.
    )
)

REM Search LocalAppData
for /f "delims=" %%i in ('dir /s /b "%LOCALAPPDATA%\Programs\Python*\python.exe" 2^>nul') do (
    "%%i" --version 2>nul | findstr "3.12" >nul
    if !errorlevel! == 0 (
        set /a FOUND_COUNT+=1
        echo [FOUND #!FOUND_COUNT!] %%i
        "%%i" --version
        echo   Full path: %%i
        echo.
    )
)

REM Search C:\Python*
for /f "delims=" %%i in ('dir /s /b "C:\Python*\python.exe" 2^>nul') do (
    "%%i" --version 2>nul | findstr "3.12" >nul
    if !errorlevel! == 0 (
        set /a FOUND_COUNT+=1
        echo [FOUND #!FOUND_COUNT!] %%i
        "%%i" --version
        echo   Full path: %%i
        echo.
    )
)

REM Check Downloads folder for installer
echo [4] Checking Downloads for Python Installer...
echo.
if exist "%USERPROFILE%\Downloads\Python 3.12*.exe" (
    echo [INFO] Found Python 3.12 installer in Downloads
    dir "%USERPROFILE%\Downloads\Python 3.12*.exe" /b
    echo.
    echo [ACTION REQUIRED] Run the installer and check "Add Python to PATH"
    echo.
) else (
    echo [INFO] No Python 3.12 installer found in Downloads
    echo.
)

echo [5] Checking PATH Environment Variable...
echo.
echo %PATH% | findstr /i "python" >nul
if %errorlevel% == 0 (
    echo [INFO] Python found in PATH
    echo %PATH% | findstr /i "python"
    echo.
) else (
    echo [WARNING] Python NOT in PATH
    echo.
)

echo ========================================
echo   Diagnostic Complete
echo ========================================
echo.

if %FOUND_COUNT% == 0 (
    echo [RESULT] Python 3.12 NOT FOUND
    echo.
    echo [SOLUTION]
    echo 1. If you downloaded Python 3.12 installer, run it now
    echo 2. During installation, check "Add Python to PATH"
    echo 3. After installation, restart this diagnostic
    echo.
) else (
    echo [RESULT] Found %FOUND_COUNT% Python 3.12 installation(s)
    echo.
    echo [NEXT STEPS]
    echo 1. Copy the full path of one of the Python installations above
    echo 2. Use it in the backend startup script
    echo 3. Or add it to your system PATH
    echo.
    echo [QUICK FIX] Edit AUTO_START_BACKEND.bat and set:
    echo    set PYTHON_CMD=[FULL_PATH_TO_PYTHON_EXE]
    echo.
)

pause


