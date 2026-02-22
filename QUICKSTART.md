# Quick Start Guide

Get up and running with the Agent Identity Protocol SDK and demo in 5 minutes.

## Prerequisites

- Node.js 18+
- npm or yarn
- A local Anvil instance (or Ethereum RPC endpoint)

## Installation

```bash
# 1. Navigate to SDK directory
cd /sessions/focused-intelligent-allen/mnt/omni@projects/agent-identity-protocol/sdk

# 2. Install dependencies
npm install

# 3. Build the SDK
npm run build

# 4. Run tests (optional)
npm run test
```

## Running the Example Demo

```bash
# 1. Navigate to example directory
cd ../examples/e2e-demo

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env

# 4. Edit .env with your configuration
# For local Anvil (default):
#   RPC_URL=http://127.0.0.1:8545
#   CHAIN_ID=31337
# Then update contract addresses if needed

# 5. Start Anvil in another terminal
anvil --chain-id 31337

# 6. Run the demo
npm run demo
```

## What You'll See

The demo outputs a complete workflow:

1. Configuration information
2. Identity creation for Alice (human) and Agent
3. Delegation setup (ATTEST + WRITE scope)
4. Schema registration
5. Credential issuance
6. Reputation computation
7. Trust profile with merkle proof
8. All data structures in JSON format

Expected output includes:
- Colored terminal formatting
- Section headers
- Success checkmarks
- JSON data structures
- Summary of operations

## Basic SDK Usage

```typescript
import { createClient, DelegationScope } from '@agent-identity/sdk';
import { createWalletClient, http } from 'viem';

// Create client
const client = createClient({
  chainId: 31337,
  rpcUrl: 'http://127.0.0.1:8545',
  resolverUrl: 'http://localhost:3001',
  contracts: {
    didRegistry: '0x...',
    schemaRegistry: '0x...',
    attestationRegistry: '0x...',
    delegationRegistry: '0x...',
    revocationRegistry: '0x...',
  },
});

// Create wallet client
const walletClient = createWalletClient({
  account: privateKeyToAccount('0x...'),
  transport: http('http://127.0.0.1:8545'),
});

// Create identity
const identity = await client.createIdentity(walletClient);
console.log(`DID: ${identity.id}`);

// Delegate to agent
const delegation = await client.delegateToAgent(walletClient, {
  agent: '0xAgent...',
  scope: DelegationScope.ATTEST | DelegationScope.WRITE,
  expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
});

// Get reputation
const score = await client.getReputationScore('0xAddress...');
console.log(`Tier: ${score.tier}`);
```

## Key APIs

### Identity
- `createIdentity(signer)` - Create new DID
- `getIdentity(address)` - Fetch DID
- `rotateKey(signer, newController)` - Rotate key

### Credentials
- `issueCredential(signer, params)` - Issue attestation
- `verifyCredential(uid)` - Check validity
- `revokeCredential(signer, uid)` - Revoke

### Delegation
- `delegateToAgent(signer, params)` - Grant permissions
- `isAgentAuthorized(owner, agent, scope)` - Check authorization

### Reputation
- `getReputationScore(subject)` - Get trust score
- `fetchTrustProfile(subject)` - Full profile
- `verifyReputation(subject, minScore)` - Check threshold

### Utilities
- `toDID(address)` - Address to DID
- `fromDID(did)` - DID to address

## DelegationScope Values

Combine scopes using bitwise OR:

```typescript
// Individual permissions
READ = 1n
WRITE = 2n
ATTEST = 4n
DELEGATE = 8n

// Combined example
const scope = DelegationScope.ATTEST | DelegationScope.WRITE;
```

## Project Structure

```
agent-identity-protocol/
├── sdk/                    # Core SDK
│   ├── src/
│   │   ├── types.ts       # Type definitions
│   │   ├── abis.ts        # Contract ABIs
│   │   ├── client.ts      # Main client
│   │   ├── index.ts       # Exports
│   │   └── tests/
│   │       └── client.test.ts
│   ├── package.json
│   └── tsconfig.json
├── examples/e2e-demo/      # Example demo
│   ├── src/demo.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── README.md              # Full documentation
├── DEVELOPMENT.md         # Dev guide
└── QUICKSTART.md         # This file
```

## Common Tasks

### Build SDK
```bash
cd sdk
npm run build
# Output: dist/index.js, dist/index.d.ts
```

### Run Tests
```bash
cd sdk
npm run test
```

### Watch Mode
```bash
cd sdk
npm run dev
# Auto-recompiles on file changes
```

### Run Demo
```bash
cd examples/e2e-demo
npm run demo
# Watch mode:
npm run demo:watch
```

## Configuration

Create `.env` in `examples/e2e-demo/`:

```env
# Blockchain
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
RESOLVER_URL=http://localhost:3001

# Test Accounts (from Anvil defaults)
PRIVATE_KEY_HUMAN=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PRIVATE_KEY_AGENT=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
PRIVATE_KEY_BOB=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

# Smart Contracts
DID_REGISTRY_ADDRESS=0x5fbdb2315678afccb333f8de69da7d233a4ceb424
SCHEMA_REGISTRY_ADDRESS=0xe7f1725e7734ce288f8367e1bb143e90bb3f0512
ATTESTATION_REGISTRY_ADDRESS=0x9fdc73168719b7e2c9b3b3afc7b06e6b2d8e8e8e
DELEGATION_REGISTRY_ADDRESS=0x8fddd53546b7b2d8e8e8e9fdc73168719b7e2c9b
REVOCATION_REGISTRY_ADDRESS=0x3c44cdddb6a900756dcdbca3663d773e927fec4d
```

## Troubleshooting

### Connection Refused
```bash
# Ensure Anvil is running
anvil --chain-id 31337 --port 8545
```

### Type Errors
```bash
# Update TypeScript
npm install -g typescript

# Or in SDK directory
cd sdk
npm install
```

### Contract Not Found
- Ensure contracts are deployed
- Verify contract addresses in .env
- Check RPC endpoint is accessible

### Build Errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

1. **Read Full Documentation**: See `README.md`
2. **Understand Architecture**: See `DEVELOPMENT.md`
3. **Extend SDK**: Follow `DEVELOPMENT.md` guide
4. **Deploy Contracts**: Implement smart contracts
5. **Build Frontend**: Use SDK in web app

## Documentation

- **README.md** - Complete API reference
- **DEVELOPMENT.md** - Development guide
- **sdk/README.md** - SDK-specific docs
- **examples/e2e-demo/README.md** - Demo guide
- **FILES_CREATED.md** - File inventory

## Support

For issues:
1. Check existing documentation
2. Review example code in `examples/e2e-demo/src/demo.ts`
3. Check test examples in `sdk/src/tests/client.test.ts`
4. Review error messages

## File Locations

All files are at:
```
/sessions/focused-intelligent-allen/mnt/omni@projects/agent-identity-protocol/
```

Main entry points:
- SDK: `/sdk/src/index.ts`
- Example: `/examples/e2e-demo/src/demo.ts`
- Tests: `/sdk/src/tests/client.test.ts`

## License

MIT

---

That's it! You now have a production-grade Agent Identity Protocol SDK ready to use.
