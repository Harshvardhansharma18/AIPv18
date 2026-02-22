# Deploy Agent Identity Protocol — Vercel + Neon + Sepolia

This guide takes you from zero to a live public API that indexes real on-chain identity events and serves them via REST.

**Architecture:**
```
Sepolia Testnet (live contracts)
       │ events every ~12s
       ▼
Vercel Cron (/api/cron/sync)  — runs every minute, indexes new blocks
       │ writes
       ▼
Neon Postgres (free tier)  ←──── Vercel env var: DATABASE_URL
       │ reads
       ▼
Vercel Serverless Function (/api/[[...path]])
       │
Public HTTPS: https://your-project.vercel.app/identity/did:agent:11155111:0x...
```

---

## Step 1 — Get credentials (one-time setup)

### Alchemy RPC URL
1. Sign up free at <https://alchemy.com>
2. New app → Network: **Ethereum Sepolia**
3. Copy the HTTPS endpoint: `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`

### Funded Sepolia wallet
1. Create/use a wallet in MetaMask
2. Export the private key: Settings → Security → Export Private Key
3. Get free Sepolia ETH: <https://faucet.sepolia.dev> (need ≈ 0.05 ETH)

### Etherscan API key
1. Sign up at <https://etherscan.io/myapikey>
2. Create API key → copy it

---

## Step 2 — Deploy contracts to Sepolia

```bash
# In your project root
cp .env.example .env
# Edit .env with your PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY

cd contracts
forge install
forge build
forge test        # all 70 must pass

# Deploy all 5 contracts + verify on Etherscan
npm run deploy:sepolia
```

After deploy, `contracts/deployments/11155111.json` contains your contract addresses:
```json
{
  "DIDRegistry": "0x...",
  "SchemaRegistry": "0x...",
  "AttestationRegistry": "0x...",
  "DelegationRegistry": "0x...",
  "RevocationRegistry": "0x..."
}
```

---

## Step 3 — Push to GitHub

### Create the repo
1. Go to <https://github.com/new>
2. Name: `agent-identity-protocol`, visibility: **Public**
3. Do NOT tick "Add a README"

### Push
```bash
git add .
git commit -m "feat: initial release — Agent Identity Protocol v1.0"
git remote add origin https://github.com/YOUR_USERNAME/agent-identity-protocol.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Neon Postgres (free database)

1. Go to <https://neon.tech> → sign up free (no credit card)
2. Create a project: `agent-identity`
3. Copy the **Connection String** — looks like:
   `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

Keep this — you'll paste it as `DATABASE_URL` in Vercel.

---

## Step 5 — Deploy to Vercel

### 5a. Import your GitHub repo
1. Go to <https://vercel.com> → sign up with GitHub (free)
2. Dashboard → **Add New Project** → **Import Git Repository**
3. Select `agent-identity-protocol`
4. Framework preset: **Other**
5. Root directory: `. ` (leave blank)
6. Build command: (leave blank — vercel.json handles it)

### 5b. Add environment variables
In Vercel project settings → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Neon connection string |
| `SEPOLIA_RPC_URL` | your Alchemy URL |
| `CHAIN_ID` | `11155111` |
| `START_BLOCK` | block number from your deploy output |
| `DID_REGISTRY_ADDRESS` | from `deployments/11155111.json` |
| `SCHEMA_REGISTRY_ADDRESS` | from `deployments/11155111.json` |
| `ATTESTATION_REGISTRY_ADDRESS` | from `deployments/11155111.json` |
| `DELEGATION_REGISTRY_ADDRESS` | from `deployments/11155111.json` |
| `REVOCATION_REGISTRY_ADDRESS` | from `deployments/11155111.json` |
| `CRON_SECRET` | any random string, e.g. `openssl rand -hex 32` |
| `NODE_ENV` | `production` |

### 5c. Deploy
Click **Deploy**. Vercel builds and deploys in ~2 minutes.

Your public URL will be: `https://agent-identity-protocol.vercel.app` (or similar)

---

## Step 6 — Run the database migrations

The indexer needs the Postgres schema to be created. Run migrations against Neon:

```bash
# In your project root, with DATABASE_URL set to your Neon URL
export DATABASE_URL="postgresql://..."

npm -w @agent-identity/indexer run db:migrate
# or if no migrate script exists:
npm -w @agent-identity/indexer run db:push
```

---

## Step 7 — Verify it's live

```bash
export BASE=https://agent-identity-protocol.vercel.app

# Health check
curl $BASE/health

# After someone registers a DID on Sepolia and the cron runs once:
curl "$BASE/identity/did:agent:11155111:0xYOUR_ADDRESS"
curl "$BASE/reputation/did:agent:11155111:0xYOUR_ADDRESS"
curl "$BASE/schemas"
```

The cron job at `/api/cron/sync` runs every minute automatically.
You can also trigger it manually:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" $BASE/api/cron/sync
```

---

## Step 8 — Register your first real identity

Using the SDK (from a Node.js script):

```typescript
import { AgentIdentityClient } from '@agent-identity/sdk';

const client = new AgentIdentityClient({
  chainId: 11155111,
  rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY',
  contractAddresses: {
    didRegistry: '0x...',     // from deployments/11155111.json
    schemaRegistry: '0x...',
    attestationRegistry: '0x...',
    delegationRegistry: '0x...',
    revocationRegistry: '0x...',
  },
  privateKey: '0x...',  // the wallet you want to register
});

// Register DID on-chain
const did = await client.createIdentity({ metadataCid: 'QmYourIPFSHash' });
console.log('Registered:', did);
// → did:agent:11155111:0xYourAddress

// Wait ~1 minute for the cron to pick it up, then:
const profile = await fetch(`https://agent-identity-protocol.vercel.app/identity/${did}/trust-profile`);
console.log(await profile.json());
```

---

## Auto-deploy on new releases

Every time you push a version tag, GitHub Actions deploys the contracts:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Vercel auto-deploys the API on every push to `main`.

---

## Costs

| Service | Free tier |
|---|---|
| Vercel | 100GB bandwidth/mo, 100K function invocations/day, 2 cron jobs |
| Neon | 512MB storage, 1 project, unlimited requests |
| Alchemy | 300M compute units/mo (more than enough for polling) |
| Etherscan | 5 req/s API — free |
| GitHub | Unlimited public repos + Actions minutes |

**Total cost for this stack: $0/month** on free tiers.
