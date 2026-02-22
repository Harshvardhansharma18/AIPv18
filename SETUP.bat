@echo off
title Agent Identity Protocol - Setup
color 0A
echo.
echo  =============================================
echo   Agent Identity Protocol - Setup
echo  =============================================
echo.

:: Check forge
where forge >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Foundry not found.
    echo Install it from: https://book.getfoundry.sh/getting-started/installation
    pause
    exit /b 1
)

:: Check node
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo Install it from: https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Fixing git state...
:: Remove stale lock if present
if exist ".git\index.lock" del /f ".git\index.lock"
:: git is already init'd - just commit what's there (excluding node_modules via .gitignore)
git add -A
git commit -m "chore: initial commit" --allow-empty
echo  Done.
echo.

echo [2/4] Installing forge-std...
cd contracts
forge install foundry-rs/forge-std --no-commit
cd ..
echo  Done.
echo.

echo [3/4] Installing npm packages...
call npm install --legacy-peer-deps
echo  Done.
echo.

echo [4/4] Compiling contracts...
cd contracts
call forge build
cd ..
echo  Done.
echo.

echo  =============================================
echo   Setup complete!
echo  =============================================
echo.
echo  Next:
echo    forge test -vvv          (from contracts folder)
echo    npm run demo             (from project root)
echo.
pause
