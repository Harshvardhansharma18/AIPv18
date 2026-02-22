# Agent Identity Protocol — Windows Setup Script
# Run from project root:  .\setup.ps1
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Log  ($msg) { Write-Host "→ $msg" -ForegroundColor Cyan }
function Ok   ($msg) { Write-Host "✓ $msg" -ForegroundColor Green }
function Fail ($msg) { Write-Host "✗ $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor White
Write-Host "║  Agent Identity Protocol — Setup          ║" -ForegroundColor White
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor White
Write-Host ""

# ── Prerequisites ────────────────────────────────────────────────────────────
Log "Checking prerequisites..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js >=20 required. Download from https://nodejs.org"
}
if (-not (Get-Command forge -ErrorAction SilentlyContinue)) {
    Fail "Foundry required. Install: https://book.getfoundry.sh/getting-started/installation"
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fail "Git required. Download from https://git-scm.com"
}

$nodeVer  = node -v
$forgeVer = (forge --version) | Select-Object -First 1
Ok "Prerequisites OK (node $nodeVer, $forgeVer)"

$Root = $PSScriptRoot

# ── Git init ─────────────────────────────────────────────────────────────────
Log "Initialising git repository..."
if (-not (Test-Path "$Root\.git")) {
    git -C $Root init -q
    git -C $Root add -A
    git -C $Root commit -q -m "chore: initial commit" --allow-empty
    Ok "Git repository initialised"
} else {
    Ok "Git already initialised"
}

# ── forge-std ────────────────────────────────────────────────────────────────
Log "Installing forge-std..."
$forgeStdPath = Join-Path $Root "contracts\lib\forge-std"
if (-not (Test-Path $forgeStdPath)) {
    Push-Location (Join-Path $Root "contracts")
    forge install foundry-rs/forge-std --no-commit -q
    Pop-Location
    Ok "forge-std installed"
} else {
    Ok "forge-std already present"
}

# ── npm install ───────────────────────────────────────────────────────────────
Log "Installing npm workspace dependencies..."
Push-Location $Root
npm install --legacy-peer-deps
Pop-Location
Ok "npm dependencies installed"

# ── Compile contracts ─────────────────────────────────────────────────────────
Log "Compiling contracts..."
Push-Location (Join-Path $Root "contracts")
forge build --silent
Pop-Location
Ok "All contracts compiled"

# ── Build SDK ─────────────────────────────────────────────────────────────────
Log "Building SDK..."
npm -w "@agent-identity/sdk" run build --silent
Ok "SDK built"

Write-Host ""
Write-Host "✓ Setup complete!" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "  Next steps:"
Write-Host "  1. Copy .env.example → .env.local and fill in your values"
Write-Host "  2. npm run dev              # start full stack (Docker required)"
Write-Host "  3. npm run test:contracts   # forge test -vvv"
Write-Host "  4. npm run demo             # run the e2e demo"
Write-Host ""
