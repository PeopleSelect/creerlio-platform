@echo off
REM ========================================
REM  Creerlio Platform - ONE CLICK START
REM ========================================
REM
REM Just double-click this file to start everything!
REM

echo.
echo ========================================
echo   Creerlio Platform - Auto Setup
echo ========================================
echo.
echo This will:
echo   ✅ Test Python
echo   ✅ Setup backend
echo   ✅ Setup frontend  
echo   ✅ Start both servers
echo.
echo Press any key to continue...
pause >nul

REM Run the automated setup
call auto-setup.bat


