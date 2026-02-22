@echo off
setlocal enabledelayedexpansion
title Agent Identity Protocol - Local Deploy
color 0A

echo.
echo  ============================================================
echo   Agent Identity Protocol  ^|  Local Anvil Deploy
echo  ============================================================
echo.

:: ── Prereq checks ────────────────────────────────────────────────────────────
where forge >nul 2>&1 || (echo [ERROR] forge not found. Install Foundry first. && pause && exit /b 1)
where git   >nul 2>&1 || (echo [ERROR] git not found. && pause && exit /b 1)
where node  >nul 2>&1 || (echo [ERROR] node not found. && pause && exit /b 1)

echo [OK] forge, git, node all found
echo.

:: ── Step 1: Fix git state ────────────────────────────────────────────────────
echo [1/6] Setting up git...
if exist ".git\index.lock" (
    echo      Removing stale git lock...
    del /f ".git\index.lock"
)
git add -A >nul 2>&1
git commit -m "chore: initial commit" --allow-empty >nul 2>&1
echo      Git ready.
echo.

:: ── Step 2: Install forge-std ────────────────────────────────────────────────
echo [2/6] Installing forge-std...
if exist "contracts\lib\forge-std" (
    echo      forge-std already installed, skipping.
) else (
    cd contracts
    forge install foundry-rs/forge-std --no-commit
    if !errorlevel! neq 0 (
        echo [ERROR] forge install failed.
        pause
        exit /b 1
    )
    cd ..
)
echo.

:: ── Step 3: Compile contracts ────────────────────────────────────────────────
echo [3/6] Compiling contracts...
cd contracts
forge build
if %errorlevel% neq 0 (
    echo [ERROR] Compilation failed. Check the errors above.
    cd ..
    pause
    exit /b 1
)
cd ..
echo      All contracts compiled.
echo.

:: ── Step 4: Start Anvil ───────────────────────────────────────────────────────
echo [4/6] Starting Anvil (local chain)...
start "Anvil - Local Chain" cmd /k "anvil --chain-id 31337 --block-time 2"
echo      Waiting 3s for Anvil to boot...
timeout /t 3 /nobreak >nul
echo      Anvil running at http://127.0.0.1:8545
echo.

:: ── Step 5: Deploy contracts ──────────────────────────────────────────────────
echo [5/6] Deploying contracts to Anvil...
cd contracts
if not exist "deployments" mkdir deployments
forge script script/DeployLocal.s.sol ^
    --rpc-url http://127.0.0.1:8545 ^
    --broadcast ^
    -vvv
if %errorlevel% neq 0 (
    echo [ERROR] Deployment failed. Is Anvil running?
    cd ..
    pause
    exit /b 1
)
cd ..
echo      Contracts deployed.
echo.

:: ── Step 6: Write .env.local ─────────────────────────────────────────────────
echo [6/6] Writing .env.local with contract addresses...

:: Parse the deployment JSON (Anvil chain ID is 31337)
set "DEPLOY_JSON=contracts\deployments\local_31337.json"

if not exist "%DEPLOY_JSON%" (
    echo [WARN] Could not find %DEPLOY_JSON% - addresses not written to .env.local
    echo        Check contracts\deployments\ manually.
    goto :DONE
)

:: Use node to parse the JSON and write .env.local
node -e "
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('%DEPLOY_JSON%', 'utf8'));
const existing = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';

let env = existing;

function setEnv(key, val) {
  const re = new RegExp('^' + key + '=.*', 'm');
  if (re.test(env)) { env = env.replace(re, key + '=' + val); }
  else { env += '\n' + key + '=' + val; }
}

setEnv('DID_REGISTRY_ADDRESS',         d.DIDRegistry);
setEnv('SCHEMA_REGISTRY_ADDRESS',      d.SchemaRegistry);
setEnv('ATTESTATION_REGISTRY_ADDRESS', d.AttestationRegistry);
setEnv('DELEGATION_REGISTRY_ADDRESS',  d.DelegationRegistry);
setEnv('REVOCATION_REGISTRY_ADDRESS',  d.RevocationRegistry);
setEnv('CHAIN_ID',                     '31337');
setEnv('RPC_URL',                      'http://127.0.0.1:8545');

fs.writeFileSync('.env.local', env.trim() + '\n');
console.log('  DIDRegistry:         ' + d.DIDRegistry);
console.log('  SchemaRegistry:      ' + d.SchemaRegistry);
console.log('  AttestationRegistry: ' + d.AttestationRegistry);
console.log('  DelegationRegistry:  ' + d.DelegationRegistry);
console.log('  RevocationRegistry:  ' + d.RevocationRegistry);
"

:DONE
echo.
echo  ============================================================
echo   DEPLOY COMPLETE
echo  ============================================================
echo.
echo   Anvil:     http://127.0.0.1:8545  (keep that window open)
echo   Addresses: .env.local
echo.
echo   Next steps:
echo     npm run dev:indexer    ^<-- start the indexer
echo     npm run dev:resolver   ^<-- start the API  (port 3001)
echo     npm run demo           ^<-- run the e2e demo
echo.
echo   Contract tests:
echo     cd contracts ^&^& forge test -vvv
echo.
pause
