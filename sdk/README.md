# Agent Identity SDK

Core TypeScript SDK for the Agent Identity Protocol. Provides a complete interface to manage identities, credentials, delegations, and reputation on blockchain networks.

## Installation

```bash
npm install @agent-identity/sdk
```

## Quick Start

```typescript
import { createClient } from "@agent-identity/sdk";
import { createWalletClient, http } from "viem";

// Create client
const client = createClient({
  chainId: 31337,
  rpcUrl: "http://127.0.0.1:8545",
  resolverUrl: "http://localhost:3001",
  contracts: {
    didRegistry: "0x...",
    schemaRegistry: "0x...",
    attestationRegistry: "0x...",
    delegationRegistry: "0x...",
    revocationRegistry: "0x...",
  },
});

// Create wallet client
const walletClient = createWalletClient({
  account: privateKeyToAccount("0x..."),
  chain: localhost,
  transport: http("http://127.0.0.1:8545"),
});

// Create identity
const identity = await client.createIdentity(walletClient);
console.log(identity.id); // did:agent:31337:...
```

## API Overview

### Identity
- `createIdentity()` - Create new DID
- `getIdentity()` - Fetch existing DID
- `rotateKey()` - Rotate signing key

### Credentials
- `issueCredential()` - Issue attestation
- `revokeCredential()` - Revoke attestation
- `verifyCredential()` - Check credential validity

### Delegation
- `delegateToAgent()` - Grant permissions
- `revokeDelegation()` - Revoke permissions
- `isAgentAuthorized()` - Check authorization

### Reputation
- `getReputationScore()` - Get trust score
- `fetchTrustProfile()` - Full profile with credentials
- `verifyReputation()` - Check minimum threshold
- `verifyScoreProof()` - Verify merkle proof

### Schemas
- `registerSchema()` - Register credential schema
- `getSchema()` - Fetch schema by ID

### Utilities
- `toDID()` - Convert address to DID
- `fromDID()` - Convert DID to address

## Types

All types are exported and fully typed:

```typescript
import {
  AgentIdentityConfig,
  DIDDocument,
  Credential,
  Delegation,
  ReputationScore,
  TrustProfile,
  DelegationScope,
  type AgentIdentityConfig,
  type DIDString,
} from "@agent-identity/sdk";
```

## Building

```bash
npm install
npm run build
```

Outputs TypeScript declarations and JavaScript to `dist/`.

## Testing

```bash
npm run test
```

## Development

Watch mode:
```bash
npm run dev
```

## Documentation

See [../README.md](../README.md) for complete API documentation and examples.
