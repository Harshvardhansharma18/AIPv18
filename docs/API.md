# Agent Identity Protocol - REST API Reference

**Resolver Service v1.0**  
**Base URL**: `http://localhost:3001/api/v1`

---

## Table of Contents

1. [Health & Status](#health--status)
2. [Identity Resolution](#identity-resolution)
3. [Reputation](#reputation)
4. [Attestations](#attestations)
5. [Delegations](#delegations)
6. [Schemas](#schemas)
7. [Revocations](#revocations)
8. [Error Responses](#error-responses)

---

## Health & Status

### Get Service Health

Returns health status of all components.

**Request**:
```http
GET /health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "timestamp": "2026-02-20T10:30:00Z",
  "services": {
    "database": {
      "status": "ok",
      "latency_ms": 5,
      "last_check": "2026-02-20T10:29:58Z"
    },
    "blockchain": {
      "status": "ok",
      "block_number": 19250000,
      "sync_lag_blocks": 0,
      "last_check": "2026-02-20T10:29:55Z"
    },
    "indexer": {
      "status": "ok",
      "last_event_processed": "2026-02-20T10:29:50Z",
      "events_behind": 0
    },
    "cache": {
      "status": "ok",
      "memory_used_mb": 256,
      "hit_rate": 0.87
    }
  }
}
```

---

## Identity Resolution

### Get Identity

Retrieve identity metadata for a specific DID.

**Request**:
```http
GET /identity/{did}
```

**Path Parameters**:
- `did` (string): Agent Identity Protocol DID (e.g., `did:aip:0x1234567890abcdef`)

**Query Parameters**:
- `include_history` (boolean, optional): Include key rotation history. Default: `false`
- `include_recovery_state` (boolean, optional): Include active recovery requests. Default: `false`

**Response** (200 OK):
```json
{
  "did": "did:aip:0x1234567890abcdef",
  "controller": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
  "active_key": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
  "guardians": [
    "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    "0x1234567890abcdef1234567890abcdef12345678"
  ],
  "guardian_count": 2,
  "guardian_threshold": 2,
  "status": "active",
  "created_at": "2026-01-15T08:30:00Z",
  "updated_at": "2026-02-20T10:00:00Z",
  "key_rotation_time": "2026-02-15T14:20:00Z",
  "is_active": true
}
```

**Response** (404 Not Found):
```json
{
  "error": "identity_not_found",
  "message": "No identity found for DID: did:aip:0x...",
  "code": "IDENTITY_NOT_FOUND"
}
```

### List Identities by Controller

Get all identities controlled by a specific address.

**Request**:
```http
GET /identities
```

**Query Parameters**:
- `controller` (string, required): Controller address (e.g., `0x742d...`)
- `status` (string, optional): Filter by status (`active`, `deactivated`, `all`). Default: `active`
- `limit` (integer, optional): Results per page. Default: 50. Max: 500
- `offset` (integer, optional): Pagination offset. Default: 0
- `sort` (string, optional): Sort field (`created_at`, `updated_at`). Default: `created_at`
- `order` (string, optional): Sort order (`asc`, `desc`). Default: `desc`

**Response** (200 OK):
```json
{
  "identities": [
    {
      "did": "did:aip:0x1234567890abcdef",
      "controller": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
      "status": "active",
      "created_at": "2026-01-15T08:30:00Z",
      "reputation_score": 75
    },
    {
      "did": "did:aip:0x9876543210fedcba",
      "controller": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
      "status": "active",
      "created_at": "2026-02-01T12:45:00Z",
      "reputation_score": 45
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

### Get Identity by Address

Get primary identity for an EOA or smart contract.

**Request**:
```http
GET /identity-by-address/{address}
```

**Path Parameters**:
- `address` (string): Ethereum address (e.g., `0x742d...`)

**Response** (200 OK):
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
  "did": "did:aip:0x1234567890abcdef",
  "is_controller": true,
  "is_guardian": false
}
```

---

## Reputation

### Get Reputation Score

Retrieve reputation score for an agent.

**Request**:
```http
GET /reputation/{did}
```

**Path Parameters**:
- `did` (string): Agent DID

**Query Parameters**:
- `include_breakdown` (boolean, optional): Include score breakdown. Default: `true`
- `include_proof` (boolean, optional): Include Merkle proof. Default: `false`

**Response** (200 OK):
```json
{
  "did": "did:aip:0x1234567890abcdef",
  "score": 75,
  "tier": "gold",
  "freshness": {
    "last_update": "2026-02-20T10:25:00Z",
    "age_seconds": 300,
    "is_stale": false,
    "staleness_threshold_seconds": 600
  },
  "breakdown": {
    "attestation_score": 30,
    "delegation_score": 25,
    "activity_score": 20,
    "weights": {
      "attestations": 0.4,
      "delegations": 0.3,
      "activity": 0.3
    }
  },
  "components": {
    "attestation_count": 12,
    "unique_issuers": 5,
    "delegation_count": 3,
    "transaction_count_30d": 50,
    "days_active": 36,
    "key_compromises": 0
  },
  "merkle_proof": {
    "leaf": "0xabc123...",
    "proof": [
      "0x123456...",
      "0x789abc..."
    ],
    "root": "0xdef456...",
    "index": 42
  }
}
```

**Tier Mapping**:
```
Score 0-20:    Unknown (new agent)
Score 20-40:   Bronze (established)
Score 40-60:   Silver (good track record)
Score 60-80:   Gold (trusted)
Score 80-100:  Platinum (highly trusted)
```

### Batch Reputation Lookup

Get reputation scores for multiple DIDs in one request.

**Request**:
```http
POST /reputation/batch
Content-Type: application/json

{
  "dids": [
    "did:aip:0x1234567890abcdef",
    "did:aip:0x9876543210fedcba",
    "did:aip:0xfedcba9876543210"
  ],
  "include_breakdown": false
}
```

**Response** (200 OK):
```json
{
  "results": [
    {
      "did": "did:aip:0x1234567890abcdef",
      "score": 75,
      "tier": "gold"
    },
    {
      "did": "did:aip:0x9876543210fedcba",
      "score": 42,
      "tier": "silver"
    },
    {
      "did": "did:aip:0xfedcba9876543210",
      "score": 15,
      "tier": "unknown"
    }
  ],
  "timestamp": "2026-02-20T10:30:00Z",
  "computation_time_ms": 45
}
```

**Request Limits**:
- Max DIDs per batch: 1000
- Max requests per minute: 60 (per IP)

### Get Reputation History

Retrieve reputation score history over time.

**Request**:
```http
GET /reputation/{did}/history
```

**Query Parameters**:
- `days` (integer, optional): Number of past days. Default: 30. Max: 365
- `granularity` (string, optional): Time granularity (`hourly`, `daily`, `weekly`). Default: `daily`

**Response** (200 OK):
```json
{
  "did": "did:aip:0x1234567890abcdef",
  "history": [
    {
      "timestamp": "2026-02-20T00:00:00Z",
      "score": 75,
      "tier": "gold"
    },
    {
      "timestamp": "2026-02-19T00:00:00Z",
      "score": 72,
      "tier": "gold"
    },
    {
      "timestamp": "2026-02-18T00:00:00Z",
      "score": 70,
      "tier": "gold"
    }
  ],
  "trend": "stable",
  "period": {
    "start": "2026-01-21T00:00:00Z",
    "end": "2026-02-20T00:00:00Z",
    "days": 30
  }
}
```

### Generate Merkle Proof

Generate Merkle proof for a reputation score to verify on-chain.

**Request**:
```http
POST /merkle-proof
Content-Type: application/json

{
  "did": "did:aip:0x1234567890abcdef",
  "min_score": 50
}
```

**Response** (200 OK):
```json
{
  "did": "did:aip:0x1234567890abcdef",
  "score": 75,
  "meets_minimum": true,
  "proof": {
    "leaf": "0xabc123def456789012345678901234567890abcd",
    "proof": [
      "0x123456789abcdef0123456789abcdef012345678",
      "0xfedcba9876543210fedcba9876543210fedcba98",
      "0x0123456789abcdef0123456789abcdef01234567"
    ],
    "root": "0x9876543210fedcba9876543210fedcba98765432",
    "index": 42
  },
  "verification_data": {
    "proof_size_bytes": 128,
    "computation_time_ms": 15,
    "root_timestamp": "2026-02-20T10:25:00Z"
  }
}
```

**On-Chain Verification**:
```solidity
function verifyReputationProof(
    bytes32 did,
    uint256 score,
    bytes32[] memory proof
) external view returns (bool) {
    bytes32 leaf = keccak256(abi.encode(did, score));
    bytes32 root = merkleRoot.current();
    return merkleProof.verify(proof, root, leaf);
}
```

---

## Attestations

### Get Attestations for Identity

Retrieve attestations issued about a specific agent.

**Request**:
```http
GET /attestations/{did}
```

**Path Parameters**:
- `did` (string): Subject DID

**Query Parameters**:
- `issuer` (string, optional): Filter by specific issuer
- `schema` (string, optional): Filter by schema UID
- `status` (string, optional): `active`, `revoked`, `expired`, `all`. Default: `active`
- `limit` (integer, optional): Default: 50. Max: 500
- `offset` (integer, optional): Default: 0
- `sort` (string, optional): `issued_at`, `expiry`, `issuer`. Default: `issued_at`

**Response** (200 OK):
```json
{
  "attestations": [
    {
      "uid": "0xabc123def456789012345678901234567890abcd",
      "issuer": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
      "subject": "did:aip:0x1234567890abcdef",
      "schema_uid": "0x1111111111111111111111111111111111111111",
      "issued_at": "2026-02-15T10:30:00Z",
      "expiry_time": "2027-02-15T10:30:00Z",
      "revoked": false,
      "issuer_reputation": 85,
      "schema_name": "KYC"
    },
    {
      "uid": "0xdef456789abcdef0123456789abcdef012345678",
      "issuer": "0x1234567890abcdef1234567890abcdef12345678",
      "subject": "did:aip:0x1234567890abcdef",
      "schema_uid": "0x2222222222222222222222222222222222222222",
      "issued_at": "2026-01-20T14:15:00Z",
      "expiry_time": "2026-04-20T14:15:00Z",
      "revoked": false,
      "issuer_reputation": 60,
      "schema_name": "Activity"
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0,
  "has_more": false,
  "summary": {
    "active_count": 10,
    "revoked_count": 2,
    "expired_count": 0,
    "unique_issuers": 5,
    "average_issuer_reputation": 72
  }
}
```

### Get Single Attestation

Retrieve detailed information about a specific attestation.

**Request**:
```http
GET /attestations/{uid}
```

**Path Parameters**:
- `uid` (string): Attestation UID

**Response** (200 OK):
```json
{
  "uid": "0xabc123def456789012345678901234567890abcd",
  "issuer": {
    "address": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
    "did": "did:aip:0x5678901234567890123456789012345678901234",
    "reputation": 85
  },
  "subject": {
    "did": "did:aip:0x1234567890abcdef",
    "address": "0x1234567890abcdef1234567890abcdef12345678"
  },
  "schema": {
    "uid": "0x1111111111111111111111111111111111111111",
    "name": "KYC",
    "ipfs_hash": "QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "version": 1,
    "status": "active"
  },
  "timestamps": {
    "issued_at": "2026-02-15T10:30:00Z",
    "expiry_time": "2027-02-15T10:30:00Z",
    "block_number": 19250000
  },
  "status": {
    "revoked": false,
    "expired": false,
    "valid": true
  },
  "data_hash": "0x789abc123def456789abc123def456789abc1234",
  "proof": "0xabcdef123456789abcdef123456789abcdef1234"
}
```

### Attest Identity

Issue a new attestation about an agent (via POST).

**Request**:
```http
POST /attestations
Content-Type: application/json

{
  "subject": "did:aip:0x1234567890abcdef",
  "schema_uid": "0x1111111111111111111111111111111111111111",
  "data": {
    "id_verified": true,
    "country": "US",
    "accredited_investor": true
  },
  "expiry_time": "2027-02-15T10:30:00Z",
  "revocable": true
}
```

**Response** (201 Created):
```json
{
  "uid": "0xabc123def456789012345678901234567890abcd",
  "issuer": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
  "subject": "did:aip:0x1234567890abcdef",
  "transaction_hash": "0x123abc...",
  "block_number": 19250001,
  "status": "pending",
  "created_at": "2026-02-20T10:30:00Z"
}
```

### Revoke Attestation

Revoke an existing attestation.

**Request**:
```http
POST /attestations/{uid}/revoke
Content-Type: application/json

{
  "reason": "Issuer lost verification credentials"
}
```

**Response** (200 OK):
```json
{
  "uid": "0xabc123def456789012345678901234567890abcd",
  "revoked": true,
  "revoked_at": "2026-02-20T10:35:00Z",
  "transaction_hash": "0x456def...",
  "block_number": 19250002
}
```

---

## Delegations

### Get Delegations

Retrieve delegations for an agent.

**Request**:
```http
GET /delegations/{did}
```

**Path Parameters**:
- `did` (string): Delegator DID

**Query Parameters**:
- `role` (string, optional): `active`, `expired`, `all`. Default: `active`
- `chain_id` (integer, optional): Filter by specific chain
- `delegate` (string, optional): Filter by delegate address
- `limit` (integer, optional): Default: 50
- `offset` (integer, optional): Default: 0

**Response** (200 OK):
```json
{
  "delegations": [
    {
      "id": "0xabc123def456789012345678901234567890abcd",
      "delegator": "did:aip:0x1234567890abcdef",
      "delegate": "0x1111111111111111111111111111111111111111",
      "scope": {
        "bits": "0x00000007",
        "capabilities": ["transfer", "swap", "lend"],
        "total_capabilities": 3
      },
      "chain_id": 1,
      "created_at": "2026-02-15T10:30:00Z",
      "expiry_time": "2026-08-15T10:30:00Z",
      "status": "active",
      "days_until_expiry": 175
    }
  ],
  "total": 3,
  "summary": {
    "active_count": 2,
    "expired_count": 1,
    "total_scopes": 7
  }
}
```

### Verify Delegation

Check if a delegation grants specific capability.

**Request**:
```http
POST /delegations/verify
Content-Type: application/json

{
  "delegator": "did:aip:0x1234567890abcdef",
  "delegate": "0x1111111111111111111111111111111111111111",
  "action": "swap",
  "chain_id": 1
}
```

**Response** (200 OK):
```json
{
  "valid": true,
  "delegator": "did:aip:0x1234567890abcdef",
  "delegate": "0x1111111111111111111111111111111111111111",
  "action": "swap",
  "delegation_id": "0xabc123def456789012345678901234567890abcd",
  "scope": ["transfer", "swap", "lend"],
  "expiry_time": "2026-08-15T10:30:00Z",
  "days_until_expiry": 175,
  "details": {
    "scope_includes_action": true,
    "not_expired": true,
    "chain_matches": true
  }
}
```

### Create Delegation

Create a new delegation (requires on-chain transaction).

**Request**:
```http
POST /delegations
Content-Type: application/json

{
  "delegator": "did:aip:0x1234567890abcdef",
  "delegate": "0x1111111111111111111111111111111111111111",
  "scope": ["transfer", "swap"],
  "chain_id": 1,
  "expiry_days": 180,
  "nonce": 5
}
```

**Response** (201 Created):
```json
{
  "delegation_id": "0xabc123def456789012345678901234567890abcd",
  "delegator": "did:aip:0x1234567890abcdef",
  "delegate": "0x1111111111111111111111111111111111111111",
  "transaction": {
    "hash": "0x123abc...",
    "data": "0xabcdef...",
    "to": "0x0000...DelegationRegistry"
  },
  "status": "pending",
  "created_at": "2026-02-20T10:30:00Z"
}
```

### Revoke Delegation

Revoke an active delegation.

**Request**:
```http
POST /delegations/{delegation_id}/revoke
Content-Type: application/json

{
  "reason": "Account security measure"
}
```

**Response** (200 OK):
```json
{
  "delegation_id": "0xabc123def456789012345678901234567890abcd",
  "revoked": true,
  "revoked_at": "2026-02-20T10:35:00Z",
  "transaction_hash": "0x456def...",
  "block_number": 19250002
}
```

---

## Schemas

### List Schemas

Get available attestation schemas.

**Request**:
```http
GET /schemas
```

**Query Parameters**:
- `status` (string, optional): `active`, `deprecated`, `all`. Default: `active`
- `search` (string, optional): Search by name/description
- `limit` (integer, optional): Default: 50
- `offset` (integer, optional): Default: 0

**Response** (200 OK):
```json
{
  "schemas": [
    {
      "uid": "0x1111111111111111111111111111111111111111",
      "name": "KYC",
      "description": "Know Your Customer verification",
      "creator": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
      "version": 2,
      "status": "active",
      "created_at": "2026-01-01T00:00:00Z",
      "ipfs_hash": "QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "attestation_count": 1250,
      "min_issuer_reputation": 50,
      "revocable": true
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

### Get Schema Details

Retrieve full schema definition.

**Request**:
```http
GET /schemas/{schema_uid}
```

**Response** (200 OK):
```json
{
  "uid": "0x1111111111111111111111111111111111111111",
  "name": "KYC",
  "description": "Know Your Customer verification",
  "creator": "0x742d35Cc6634C0532925a3b844Bc1e8dF0e72f3",
  "version": 2,
  "status": "active",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-02-10T12:00:00Z",
  "ipfs_hash": "QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "definition": {
    "name": "KYC",
    "type": "object",
    "properties": {
      "id_verified": {
        "type": "boolean",
        "description": "Identity verified"
      },
      "country": {
        "type": "string",
        "description": "Country of residence (ISO 3166-1 alpha-2)"
      },
      "accredited_investor": {
        "type": "boolean",
        "description": "Accredited investor status"
      }
    },
    "required": ["id_verified", "country"]
  },
  "attestations": {
    "total_count": 1250,
    "unique_issuers": 8,
    "unique_subjects": 980
  }
}
```

---

## Revocations

### Check Revocation Status

Check if an attestation or delegation is revoked.

**Request**:
```http
GET /revocations/{uid}
```

**Path Parameters**:
- `uid` (string): Attestation or delegation UID

**Response** (200 OK):
```json
{
  "uid": "0xabc123def456789012345678901234567890abcd",
  "type": "attestation",
  "revoked": false,
  "revoked_at": null,
  "revoked_by": null,
  "revocation_reason": null
}
```

### Batch Revocation Check

Check revocation status for multiple UIDs.

**Request**:
```http
POST /revocations/batch
Content-Type: application/json

{
  "uids": [
    "0xabc123def456789012345678901234567890abcd",
    "0xdef456789abcdef0123456789abcdef012345678"
  ]
}
```

**Response** (200 OK):
```json
{
  "results": [
    {
      "uid": "0xabc123def456789012345678901234567890abcd",
      "revoked": false
    },
    {
      "uid": "0xdef456789abcdef0123456789abcdef012345678",
      "revoked": true,
      "revoked_at": "2026-02-15T10:30:00Z"
    }
  ],
  "timestamp": "2026-02-20T10:30:00Z"
}
```

---

## Error Responses

### Error Response Format

All error responses follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "additional": "information"
  },
  "timestamp": "2026-02-20T10:30:00Z"
}
```

### Common Error Codes

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | INVALID_REQUEST | Request validation failed | Malformed JSON, missing required fields |
| 400 | INVALID_DID | Invalid DID format | DID doesn't match pattern `did:aip:0x[0-9a-f]{40}` |
| 400 | INVALID_ADDRESS | Invalid Ethereum address | Address not 0x-prefixed 40 hex chars |
| 401 | UNAUTHORIZED | Authentication required | Missing/invalid auth token for protected endpoint |
| 404 | NOT_FOUND | Resource not found | DID, UID, or schema doesn't exist |
| 429 | RATE_LIMITED | Too many requests | Exceeded rate limit (60 req/min per IP) |
| 500 | INTERNAL_ERROR | Server error | Unexpected error, check service logs |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable | Database or blockchain connection down |

### Example Errors

**Invalid DID Format**:
```json
{
  "error": "invalid_did",
  "message": "DID must match format: did:aip:0x[40 hex chars]",
  "code": "INVALID_DID",
  "timestamp": "2026-02-20T10:30:00Z"
}
```

**Identity Not Found**:
```json
{
  "error": "identity_not_found",
  "message": "No identity found for DID: did:aip:0x...",
  "code": "IDENTITY_NOT_FOUND",
  "timestamp": "2026-02-20T10:30:00Z"
}
```

**Rate Limited**:
```json
{
  "error": "rate_limited",
  "message": "Rate limit exceeded: 60 requests per minute per IP",
  "code": "RATE_LIMITED",
  "details": {
    "limit": 60,
    "window_seconds": 60,
    "retry_after_seconds": 45
  },
  "timestamp": "2026-02-20T10:30:00Z"
}
```

---

## Client Libraries

### JavaScript/TypeScript

```typescript
import { AgentIdentityClient } from '@agent-identity/sdk';

const client = new AgentIdentityClient({
  rpcUrl: 'http://localhost:8545',
  resolverUrl: 'http://localhost:3001'
});

// Get reputation
const reputation = await client.reputation.getScore(did);
console.log(`Score: ${reputation.score} (${reputation.tier})`);

// Verify delegation
const isValid = await client.delegation.verify({
  delegator: agentDID,
  delegate: agentAddress,
  action: 'swap'
});

if (isValid) {
  console.log('Delegation is valid!');
}
```

### Python

```python
from agent_identity import AgentIdentityClient

client = AgentIdentityClient(
    rpc_url="http://localhost:8545",
    resolver_url="http://localhost:3001"
)

# Get identity
identity = client.identity.get(did)
print(f"Controller: {identity.controller}")

# Get attestations
attestations = client.attestations.list(
    subject=did,
    status='active',
    limit=10
)

for att in attestations:
    print(f"Issuer: {att.issuer}, Schema: {att.schema_uid}")
```

### Go

```go
package main

import "github.com/agent-identity/sdk-go"

func main() {
    client := sdk.NewClient(
        sdk.WithRPCURL("http://localhost:8545"),
        sdk.WithResolverURL("http://localhost:3001"),
    )
    
    // Get delegation
    delegation, err := client.Delegation.Verify(ctx, &sdk.VerifyRequest{
        Delegator: agentDID,
        Delegate: agentAddr,
        Action:   "swap",
    })
    
    if delegation.Valid {
        fmt.Println("Delegation verified!")
    }
}
```

---

## Rate Limiting

All endpoints are rate-limited to **60 requests per minute per IP address**.

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1645359000
```

When limit exceeded: HTTP 429 with `Retry-After` header.

---

## Pagination

Endpoints returning lists support pagination:

```
GET /attestations/{did}?limit=50&offset=0
```

Response includes:
- `total`: Total items available
- `limit`: Items per page requested
- `offset`: Offset of this page
- `has_more`: Whether more pages available

---

## API Versioning

Current version: **v1**

Version specified in URL path: `/api/v1/...`

Breaking changes will increment version number. Previous versions supported for 6 months.

---

**Last Updated**: February 2026
