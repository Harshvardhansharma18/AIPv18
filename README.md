# Agent Identity Protocol

Production-grade decentralised identity & composable reputation middleware for AI agents and human-controlled smart accounts.

---

## Prerequisites

| Tool | Min version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org |
| Foundry (`forge`) | latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| Git | any | https://git-scm.com |
| Docker + Compose | v2+ | https://docs.docker.com/get-docker/ (only needed for `npm run dev`) |

---

## One-time setup

### macOS / Linux / Git Bash

```bash
git clone <repo-url>
cd agent-identity-protocol
bash setup.sh
```

### Windows (PowerShell)

```powershell
cd agent-identity-protocol
.\setup.ps1
```

The script does exactly four things:
1. `git init` (Foundry requires a git repo to install libraries)
2. `forge install foundry-rs/forge-std` → writes to `contracts/lib/forge-std/`
3. `npm install` → installs all workspace packages (`sdk`, `indexer`, `resolver`, `examples`)
4. `forge build` + SDK build → confirms everything compiles

---

## Running

### Contracts only (no Docker needed)

```bash
cd contracts
forge build          # compile
forge test -vvv      # unit + fuzz tests
```

### Full stack (Docker required)

```bash
cp .env.example .env.local        # fill in RPC_URL, PRIVATE_KEY at minimum
docker compose up -d postgres ipfs anvil
npm run deploy:local
npm run dev:indexer &              # terminal 1
npm run dev:resolver &             # terminal 2
npm run demo                       # 9-step e2e demo
```

### Individual commands

```bash
npm run test:contracts   # forge test -vvv
npm run test:sdk         # vitest
npm run build            # sdk + indexer + resolver
npm run deploy:testnet   # needs SEPOLIA_RPC_URL + PRIVATE_KEY
```

---

## Monorepo layout

```
agent-identity-protocol/
├── contracts/              # Foundry — 5 Solidity contracts
│   ├── src/
│   │   ├── DIDRegistry.sol
│   │   ├── SchemaRegistry.sol
│   │   ├── AttestationRegistry.sol
│   │   ├── DelegationRegistry.sol
│   │   └── RevocationRegistry.sol
│   ├── test/               # Unit + fuzz tests
│   ├── script/             # Deploy scripts
│   └── lib/                # forge install writes here (git-ignored)
├── indexer/                # viem event poller → Postgres (Drizzle ORM)
├── resolver/               # Fastify REST API + reputation engine
├── sdk/                    # @agent-identity/sdk
├── examples/
│   └── e2e-demo/           # Full 9-step integration demo
├── docs/
│   ├── whitepaper.md       # Formal technical whitepaper (2,500 lines)
│   ├── API.md              # REST API reference
│   └── SECURITY.md         # Attack vectors, trust boundaries
├── docker-compose.yml
├── setup.sh                # macOS/Linux one-time setup
├── setup.ps1               # Windows one-time setup
└── .env.example
```

---

## SDK quick-start

```typescript
import { createClient, DelegationScope } from "@agent-identity/sdk";

const client = createClient({ resolverUrl: "http://localhost:3001", contracts, chain }, wallet);

const humanDid = await client.createIdentity(humanSigner);
const agentDid = await client.createIdentity(agentSigner);
await client.delegateToAgent(humanSigner, { agent: agentAddress, scope: DelegationScope.ATTEST, expiresAt: 0n });
await client.issueCredential(humanSigner, { schemaId, subject: agentAddress, expiresAt: 0n, dataCid: "ipfs://..." });
const profile  = await client.fetchTrustProfile(agentAddress);
const verified = await client.verifyReputation(agentAddress, 60);
```

---

## Common errors & fixes

| Error | Fix |
|---|---|
| `forge-std/Test.sol not found` | Run `bash setup.sh` (or `.\setup.ps1`) — forge-std must be installed via `forge install` |
| `tsx: not found` | Run `npm install` from the project root |
| `vitest: not found` | Run `npm install` from the project root |
| `workspace:* not resolved` | Fixed — npm workspaces use `*`, not `workspace:*` |
| `Cannot connect to Postgres` | Run `docker compose up -d postgres` first |
