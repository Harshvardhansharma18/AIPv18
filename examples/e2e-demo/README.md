# Agent Identity Protocol - E2E Demo

Complete end-to-end demonstration of the Agent Identity Protocol SDK. Shows a realistic workflow from identity creation through reputation verification.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment template:
```bash
cp .env.example .env
```

3. Configure `.env` with your:
   - RPC endpoint (default: Anvil local testnet)
   - Chain ID (default: 31337 for local Anvil)
   - Resolver service URL
   - Private keys for test accounts
   - Smart contract addresses

## Running the Demo

```bash
npm run demo
```

With file watching:
```bash
npm run demo:watch
```

## What the Demo Does

The demo simulates a real-world scenario:

1. **Create Identities**
   - Alice (human) creates her DID
   - Agent creates its DID

2. **Setup Delegation**
   - Alice delegates ATTEST + WRITE permissions to the agent
   - Delegation expires in 7 days

3. **Register Schema**
   - Agent registers a "TaskCompletionAttestation" schema

4. **Issue Credential**
   - Agent issues a credential attesting Alice completed a task
   - Credential valid for 1 year

5. **Verify Credential**
   - Verify the issued credential is valid and not revoked

6. **Compute Reputation**
   - Fetch Alice's reputation score (bronze/silver/gold/platinum)
   - Show score breakdown

7. **Fetch Trust Profile**
   - Get full profile with credentials, delegations, and risk flags
   - Includes merkle proof for interoperable verification

8. **Verify Score Proof**
   - Demonstrate cross-system reputation verification
   - Show how Bob could verify Alice's reputation

9. **Output Results**
   - All data structures in JSON format
   - Identity documents, delegations, credentials, scores, profiles

## Expected Output

The demo produces colored terminal output showing:

```
======================================================================
  AGENT IDENTITY PROTOCOL - E2E DEMO
======================================================================

Configuration
...

STEP 1: CREATE HUMAN IDENTITY
...

STEP 2: CREATE AGENT IDENTITY
...

[9 total workflow steps]

OUTPUT: IDENTITY & DELEGATION DATA
Alice's DID Document
{...}

DEMO SUMMARY
Operations Completed
✓ Created human identity (Alice)
✓ Created agent identity
...

Key Metrics
→ Alice's DID: did:agent:31337:...
→ Alice's Score: 750
→ Alice's Tier: gold
→ Credentials Issued: 1
→ Delegations Active: 1
```

## Key Accounts

The demo uses three test accounts (from Anvil):

1. **Alice (Human)**
   - Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   - Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

2. **Agent**
   - Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   - Address: 0x70997970C51812e339D9B73b0245ad59E1edd61c

3. **Bob (Third Party)**
   - Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
   - Address: 0x3C44CdDdB6a900756dcDbca3663d773e927FEc4D

## Testing Against Local Blockchain

To run against a local Anvil instance:

```bash
# Terminal 1: Start Anvil
anvil --chain-id 31337 --port 8545

# Terminal 2: Run demo
npm run demo
```

## Extending the Demo

Add new scenarios by modifying `src/demo.ts`:

- **More delegations**: Delegate different scopes
- **Batch attestations**: Issue multiple credentials
- **Key rotation**: Rotate signing keys
- **Revocation**: Revoke credentials and delegations
- **Guardian recovery**: Add and test recovery guardians
- **Multiple schemas**: Register and use different schemas
- **Complex delegation chains**: Nested delegations

## Troubleshooting

### Connection refused
- Ensure Anvil is running: `anvil --chain-id 31337`
- Check RPC_URL in .env

### Contract address not found
- Ensure contracts are deployed to addresses in .env
- Or use contract addresses from Anvil deployment logs

### Type errors
- Ensure TypeScript version >= 5.6
- Run `npm install` to update dependencies

### Private key format
- Include full 0x prefix
- Should be 66 characters total (0x + 64 hex chars)

## Integration with SDK

This demo shows real SDK usage:

```typescript
import { createClient, DelegationScope } from "@agent-identity/sdk";

const client = createClient(config);

// Create identity
const identity = await client.createIdentity(walletClient);

// Delegate permissions
const delegation = await client.delegateToAgent(walletClient, {
  agent: agentAddress,
  scope: DelegationScope.ATTEST | DelegationScope.WRITE,
  expiresAt,
});

// Issue credential
const credential = await client.issueCredential(walletClient, {
  schemaId,
  subject,
  expiresAt,
  dataCid,
});

// Fetch reputation
const score = await client.getReputationScore(address);
const profile = await client.fetchTrustProfile(address);
```

## Next Steps

1. **Deploy contracts**: Deploy the 5 smart contracts to a testnet
2. **Run against testnet**: Update RPC_URL and contract addresses
3. **Add resolver service**: Implement HTTP resolver for reputation computation
4. **Build frontend**: Use SDK in a web application
5. **Production deployment**: Configure for mainnet usage

## Documentation

See parent [README.md](../../README.md) for:
- Complete API reference
- Type definitions
- Architecture details
- Configuration guide
