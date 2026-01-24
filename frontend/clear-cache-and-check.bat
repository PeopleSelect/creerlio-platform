@echo off
echo Clearing Next.js cache...
if exist .next rmdir /s /q .next
echo Cache cleared!
echo.
echo Checking TypeScript syntax...
npx tsc --noEmit --skipLibCheck app/dashboard/talent/page.tsx
if %errorlevel% equ 0 (
    echo.
    echo ✓ TypeScript check passed!
    echo.
    echo Starting dev server...
    npm run dev
) else (
    echo.
    echo ✗ TypeScript check failed. Please review the errors above.
    pause
)
