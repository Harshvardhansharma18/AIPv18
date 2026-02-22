# Agent Identity Protocol - Indexer Service

Production-grade blockchain indexer for the Agent Identity Protocol. Continuously polls blockchain for events from five smart contracts and indexes them into PostgreSQL.

## Architecture

The indexer service is built with:
- **Viem**: Lightweight Ethereum/EVM client for RPC interactions
- **Drizzle ORM**: TypeScript-first database layer with zero runtime overhead
- **PostgreSQL**: Primary data store for indexed blockchain events
- **Pino**: Structured logging for production environments

## Features

- **Event Polling**: Configurable polling interval with block range tracking
- **Multi-Contract Indexing**: Handles events from 5 distinct smart contracts:
  - DID Registry (identity management)
  - Schema Registry (credential schemas)
  - Attestation Registry (credentials and revocation)
  - Delegation Registry (agent delegation)
  - Revocation Registry (credential revocation)
- **Graceful Error Handling**: Automatic retry logic with exponential backoff
- **State Management**: Tracks last processed block per chain
- **Atomic Operations**: Database upserts ensure idempotency

## Event Types

### DID Registry
- `DIDCreated`: New identity created
- `DIDUpdated`: Identity metadata updated
- `DIDKeyRotated`: Key rotation event
- `RecoveryExecuted`: Recovery mechanism triggered
- `DelegationCreated`: Agent delegation created

### Schema Registry
- `SchemaRegistered`: New credential schema registered

### Attestation Registry
- `AttestationIssued`: Credential issued
- `AttestationRevoked`: Credential revoked

### Delegation Registry
- `DelegationCreated`: Agent delegation created
- `DelegationRevoked`: Delegation revoked

### Revocation Registry
- `CredentialRevoked`: Credential revocation recorded

## Database Schema

### dids
- `id` (text): DID identifier (primary key)
- `controller` (text): Controller address
- `metadata_cid` (text): IPFS CID for metadata
- `updated_at` (timestamp): Last update timestamp
- `active` (boolean): Is DID active
- `tx_hash` (text): Transaction hash
- `block_number` (bigint): Block number

### schemas
- `id` (text): Schema ID (primary key)
- `creator` (text): Creator address
- `name` (text): Schema name
- `version` (text): Schema version
- `schema_cid` (text): IPFS CID for schema
- `created_at` (timestamp): Creation timestamp
- `active` (boolean): Is schema active
- `tx_hash` (text): Transaction hash

### attestations
- `uid` (text): Attestation UID (primary key)
- `schema_id` (text): Associated schema ID
- `issuer` (text): Issuer address
- `subject` (text): Subject/recipient address
- `issued_at` (timestamp): Issuance timestamp
- `expires_at` (timestamp, nullable): Expiration timestamp
- `data_cid` (text): IPFS CID for attestation data
- `revoked` (boolean): Is revoked
- `revoked_at` (timestamp, nullable): Revocation timestamp
- `tx_hash` (text): Transaction hash
- `block_number` (bigint): Block number

### delegations
- `id` (text): Delegation ID (primary key)
- `owner` (text): Owner address
- `agent` (text): Agent address
- `scope` (bigint): Delegation scope
- `expires_at` (timestamp, nullable): Expiration timestamp
- `created_at` (timestamp): Creation timestamp
- `revoked` (boolean): Is revoked
- `revoked_at` (timestamp, nullable): Revocation timestamp
- `tx_hash` (text): Transaction hash

### revocations
- `credential_id` (text): Credential ID (primary key)
- `revoker` (text): Revoker address
- `revoked_at` (timestamp): Revocation timestamp
- `reason` (text, nullable): Revocation reason
- `tx_hash` (text): Transaction hash

### indexer_state
- `chain_id` (integer): Chain ID (primary key)
- `last_processed_block` (bigint): Last processed block number

## Configuration

Set environment variables:

```bash
# RPC endpoint for blockchain access
RPC_URL=http://localhost:8545

# EVM chain ID (e.g., 1 for Ethereum, 11155111 for Sepolia)
CHAIN_ID=1

# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/agent_identity

# Polling interval in milliseconds (minimum 1000ms)
POLL_INTERVAL_MS=12000

# Starting block for initial sync (default: 0)
START_BLOCK=0

# Smart contract addresses (JSON string)
CONTRACT_ADDRESSES='{"DID_REGISTRY":"0x...","SCHEMA_REGISTRY":"0x...","ATTESTATION_REGISTRY":"0x...","DELEGATION_REGISTRY":"0x...","REVOCATION_REGISTRY":"0x..."}'
```

## Usage

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Database Migrations
```bash
npm run migrate
```

## Error Handling

The indexer implements robust error handling:

1. **Event Processing Errors**: Logged with context, fail-safe continues indexing
2. **Network Errors**: Automatic retry after 5 seconds
3. **Database Errors**: Transaction rollback, logged for investigation
4. **Graceful Shutdown**: SIGTERM/SIGINT triggers clean database closure

## Performance Characteristics

- **Polling Interval**: Default 12 seconds (configurable)
- **Batch Processing**: All 5 contracts polled concurrently
- **Database Connection Pool**: Max 20 connections with 30s idle timeout
- **Memory Usage**: Minimal, streaming event processing
- **Throughput**: Handles hundreds of events per block

## Monitoring

Structured logs include:
- Event type and count
- Block range processed
- Processing duration
- Error context with stack traces
- Chain ID and last processed block

Example log output:
```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "msg": "Processing blocks",
  "fromBlock": "19000000",
  "toBlock": "19000100",
  "hostname": "indexer-1"
}
```

## Testing

The indexer is production-ready with:
- Strict TypeScript configuration
- No implicit any types
- Comprehensive error handling
- Safe database operations with prepared statements
- Idempotent event processing

## License

Apache 2.0
