# Deploying Agent Identity Protocol to Sepolia

End-to-end guide: deploy contracts → push to GitHub → run indexer + resolver on Railway.

---

## Prerequisites

| Tool | Install |
|---|---|
| [Foundry](https://getfoundry.sh) | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| [Node.js 20+](https://nodejs.org) | Use the installer or `nvm install 20` |
| [Git](https://git-scm.com) | Already installed on most systems |
| [Railway CLI](https://docs.railway.app/develop/cli) | `npm install -g @railway/cli` |

---

## Step 1 — Get credentials

You need four things before deploying:

### 1a. A funded Sepolia wallet
1. Open MetaMask → create or import a wallet
2. Copy the **private key**: Settings → Security → Export Private Key
3. Get free Sepolia ETH: <https://faucet.sepolia.dev> or <https://sepoliafaucet.com>
4. You need ≈ 0.05 ETH for all 5 contract deploys

### 1b. Alchemy RPC URL
1. Go to <https://alchemy.com> → sign up free
2. Create app → network: **Ethereum Sepolia**
3. Copy the HTTPS URL (looks like `https://eth-sepolia.g.alchemy.com/v2/abc123…`)

### 1c. Etherscan API key
1. Go to <https://etherscan.io/myapikey> → sign up free
2. Create a new API key → copy it

### 1d. Set your `.env`
```bash
cp .env.example .env
```
Edit `.env`:
```bash
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
```

---

## Step 2 — Build and test contracts

```bash
cd contracts
forge install                         # install forge-std + openzeppelin
forge build                           # compile all 5 contracts
forge test -vvv                       # run 70 tests — all must pass
```

---

## Step 3 — Deploy to Sepolia

```bash
# from the contracts/ directory
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

This will:
1. Deploy all 5 contracts in order
2. Print each address to the console
3. Save addresses to `contracts/deployments/11155111.json`
4. Submit source code to Etherscan for verification (takes ~1 min)

**Copy the deployed addresses into your `.env`:**
```bash
DID_REGISTRY_ADDRESS=0x...
SCHEMA_REGISTRY_ADDRESS=0x...
ATTESTATION_REGISTRY_ADDRESS=0x...
DELEGATION_REGISTRY_ADDRESS=0x...
REVOCATION_REGISTRY_ADDRESS=0x...
CHAIN_ID=11155111
START_BLOCK=<the block number shown in the deploy output>
```

> View your contracts on Etherscan:
> `https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS`

---

## Step 4 — Push to GitHub

### 4a. Create the GitHub repo
1. Go to <https://github.com/new>
2. Name: `agent-identity-protocol`
3. Set to **Public** (required for free GitHub Actions minutes)
4. Do **not** initialise with README (we already have one)
5. Copy the repo URL: `https://github.com/YOUR_USERNAME/agent-identity-protocol.git`

### 4b. Push
```bash
# from the project root
git add .
git commit -m "feat: initial commit — Agent Identity Protocol"
git remote add origin https://github.com/YOUR_USERNAME/agent-identity-protocol.git
git branch -M main
git push -u origin main
```

### 4c. Add GitHub secrets (for CI/CD auto-deploy)
Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | your `0x…` private key |
| `SEPOLIA_RPC_URL` | your Alchemy URL |
| `ETHERSCAN_API_KEY` | your Etherscan key |

Now every time you push a version tag (`git tag v1.0.0 && git push --tags`) the CI will auto-deploy to Sepolia.

---

## Step 5 — Deploy indexer + resolver on Railway

Railway gives you a free Postgres database, which the indexer and resolver need.

### 5a. Sign up
1. Go to <https://railway.app> → sign up with GitHub
2. This automatically links your GitHub account

### 5b. Create a project
```bash
railway login
railway init          # creates a new project
```
Or use the Railway dashboard: **New Project → Deploy from GitHub repo → agent-identity-protocol**

### 5c. Add a Postgres database
Railway dashboard → your project → **New Service → PostgreSQL**
Railway automatically injects `DATABASE_URL` into all services in the same project.

### 5d. Set environment variables
In Railway dashboard → your service → **Variables**, add:

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=11155111
START_BLOCK=<block from step 3>
DID_REGISTRY_ADDRESS=0x...
SCHEMA_REGISTRY_ADDRESS=0x...
ATTESTATION_REGISTRY_ADDRESS=0x...
DELEGATION_REGISTRY_ADDRESS=0x...
REVOCATION_REGISTRY_ADDRESS=0x...
POLL_INTERVAL_MS=12000
```

### 5e. Deploy

**Indexer** (listens to chain events → writes to Postgres):
```bash
railway up --service indexer
```

**Resolver** (REST API → reads from Postgres):
```bash
railway up --service resolver
```

Railway gives you a public URL like:
```
https://resolver-production-xxxx.up.railway.app
```

---

## Step 6 — Verify it's working

```bash
# Replace with your Railway resolver URL
curl https://your-resolver.up.railway.app/health

# Register a DID (after someone calls DIDRegistry.registerDID on Sepolia)
# The indexer picks it up within ~12s and the resolver serves it:
curl https://your-resolver.up.railway.app/identity/did:agent:11155111:0xYOUR_ADDRESS
```

---

## Architecture overview (production)

```
Users/Agents
    │
    │  call contracts directly (MetaMask / viem / SDK)
    ▼
┌─────────────────────────────┐
│  Sepolia Testnet (chain 11155111) │
│  ┌──────────────────────┐   │
│  │ DIDRegistry          │   │
│  │ SchemaRegistry       │   │
│  │ AttestationRegistry  │   │
│  │ DelegationRegistry   │   │
│  │ RevocationRegistry   │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
    │
    │  event polling (every 12s)
    ▼
┌───────────────────┐       ┌──────────────────────┐
│  Indexer Service  │──────▶│  PostgreSQL (Railway) │
│  (Railway)        │       └──────────────────────┘
└───────────────────┘                  │
                                       │  SQL queries
                                       ▼
                           ┌───────────────────────┐
                           │  Resolver REST API    │
                           │  (Railway) :3001      │
                           │                       │
                           │  GET /identity/:did   │
                           │  GET /reputation/:did │
                           │  GET /schemas         │
                           └───────────────────────┘
                                       │
                           Public HTTPS URL
```

---

## Troubleshooting

**`forge: insufficient funds`** — your wallet needs Sepolia ETH from a faucet

**`forge: nonce too high`** — reset MetaMask account nonce, or wait and retry

**`verification failed`** — Etherscan can take up to 2 min; re-run with `forge verify-contract`

**Indexer not picking up events** — check `START_BLOCK` is ≤ the actual deploy block

**Railway `DATABASE_URL` missing** — make sure Postgres service is in the same Railway project

---

## Quick reference

```bash
# Test everything locally first
forge test -vvv

# Deploy to Sepolia
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify -vvvv

# Push to GitHub
git add . && git commit -m "deploy: sepolia" && git push

# Deploy services to Railway
railway up
```
