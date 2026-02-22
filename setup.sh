#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'; BOLD='\033[1m'

log()  { echo -e "${CYAN}→ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo -e "${BOLD}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  Agent Identity Protocol — Setup          ║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisites check ─────────────────────────────────────────────────────
log "Checking prerequisites..."
command -v node  >/dev/null 2>&1 || err "Node.js >=20 required (https://nodejs.org)"
command -v forge >/dev/null 2>&1 || err "Foundry required — run: curl -L https://foundry.paradigm.xyz | bash && foundryup"
command -v git   >/dev/null 2>&1 || err "Git required"
ok "Prerequisites OK (node $(node -v), forge $(forge --version | head -1))"

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Git init (required for forge install) ───────────────────────────────────
log "Initialising git repository..."
if [ ! -d "$ROOT/.git" ]; then
  git -C "$ROOT" init -q
  git -C "$ROOT" add -A
  git -C "$ROOT" commit -q -m "chore: initial commit" --allow-empty
  ok "Git repository initialised"
else
  ok "Git already initialised"
fi

# ── Forge dependencies ────────────────────────────────────────────────────────
log "Installing forge-std (this pulls from GitHub)..."
cd "$ROOT/contracts"
if [ ! -d "lib/forge-std" ]; then
  forge install foundry-rs/forge-std --no-commit -q
  ok "forge-std installed"
else
  ok "forge-std already present"
fi
cd "$ROOT"

# ── npm workspace install ─────────────────────────────────────────────────────
log "Installing npm workspace dependencies..."
npm install --legacy-peer-deps
ok "npm dependencies installed"

# ── Contract compilation check ────────────────────────────────────────────────
log "Compiling contracts..."
cd "$ROOT/contracts"
forge build --silent
ok "All contracts compiled"
cd "$ROOT"

# ── SDK build ─────────────────────────────────────────────────────────────────
log "Building SDK..."
npm -w @agent-identity/sdk run build --silent
ok "SDK built"

echo ""
echo -e "${GREEN}${BOLD}✓ Setup complete!${NC}"
echo ""
echo "  Next steps:"
echo "  1. Copy .env.example → .env.local and fill in values"
echo "  2. npm run dev          ← start full stack (Docker required)"
echo "  3. npm run test:contracts"
echo "  4. npm run demo"
echo ""
