@echo off
echo ========================================
echo Clearing Next.js cache and rebuilding...
echo ========================================
echo.

echo Stopping any running Next.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Clearing .next directory...
if exist .next (
    rmdir /s /q .next
    echo .next directory cleared!
) else (
    echo .next directory does not exist.
)

echo.
echo Clearing node_modules/.cache if it exists...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo Cache cleared!
)

echo.
echo ========================================
echo Cache cleared successfully!
echo ========================================
echo.
echo Please restart your dev server with:
echo   npm run dev
echo.
echo Or rebuild with:
echo   npm run build
echo.
pause
