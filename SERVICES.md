# Agent Identity Protocol - Services Guide

Complete guide for running the Indexer and Resolver services.

## Overview

Two core services:

### Indexer Service
- Listens to blockchain events in real-time
- Indexes events into PostgreSQL database
- Maintains synchronization state per chain
- Handles 5 smart contracts
- Automatic retry and error recovery

### Resolver Service
- REST API for querying indexed identity data
- Computes multi-factor reputation scores
- Generates Merkle proofs for scores
- Performs risk assessment
- Caches results for performance

## Prerequisites

- Node.js 20+ (LTS)
- PostgreSQL 14+
- 2GB RAM (indexer + resolver)
- RPC endpoint (Alchemy, Infura, or local)

## Quick Start

### Docker Compose

```bash
docker-compose -f services.docker-compose.yml up -d
```

### Manual Setup

```bash
# Terminal 1: PostgreSQL
docker run -d -e POSTGRES_USER=agent -e POSTGRES_PASSWORD=password -e POSTGRES_DB=agent_identity -p 5432:5432 postgres:16-alpine

# Terminal 2: Indexer
cd indexer && npm install && npm run dev

# Terminal 3: Resolver
cd resolver && npm install && npm run dev
```

## Configuration

### Indexer (.env)
```
RPC_URL=http://localhost:8545
CHAIN_ID=1
DATABASE_URL=postgresql://agent:password@localhost:5432/agent_identity
POLL_INTERVAL_MS=12000
START_BLOCK=0
CONTRACT_ADDRESSES='{"DID_REGISTRY":"0x...","SCHEMA_REGISTRY":"0x...","ATTESTATION_REGISTRY":"0x...","DELEGATION_REGISTRY":"0x...","REVOCATION_REGISTRY":"0x..."}'
```

### Resolver (.env)
```
DATABASE_URL=postgresql://agent:password@localhost:5432/agent_identity
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=*
```

## API Endpoints

### Identity
- `GET /identity/:did` - Get DID document
- `GET /identity/:did/trust-profile` - Get trust profile
- `GET /identity/:did/credentials` - Get credentials
- `GET /identity/:did/delegations` - Get delegations

### Reputation
- `GET /reputation/:subject` - Get reputation score
- `POST /reputation/verify` - Verify Merkle proof

### Schemas
- `GET /schema/:id` - Get schema
- `GET /schemas?creator=0x...` - List schemas

### Health
- `GET /health` - Service health

## Reputation Scoring

Score components (0-100):
- **Attestation** (35%): Valid credentials, schema diversity, freshness
- **Delegation** (25%): Active delegations, scope breadth, age
- **Activity** (25%): Recency (0-30 days), transaction volume
- **Penalty** (15%): Revocation rate, expiration rate

Trust tiers:
- Platinum: 80+
- Gold: 60-79
- Silver: 40-59
- Bronze: 20-39
- Unknown: <20

## Monitoring

```bash
# Check indexer
docker-compose logs -f indexer

# Check resolver
curl http://localhost:3001/health

# Database
SELECT last_processed_block FROM indexer_state;
SELECT COUNT(*) FROM attestations;
```

## Production Deployment

1. **Docker build and push**
```bash
docker build -t registry/indexer:v1 ./indexer
docker push registry/indexer:v1
```

2. **Environment setup**
   - Use secrets manager for credentials
   - Set proper RPC endpoints
   - Configure database replicas

3. **Monitoring**
   - Log aggregation (ELK, DataDog)
   - Alerting on no blocks processed
   - Database performance monitoring

## Troubleshooting

### "Cannot connect to RPC"
- Verify RPC_URL is correct
- Check network connectivity
- Confirm API key is valid

### "DATABASE_URL required"
- Set environment variable
- Check connection string format

### "Indexer stuck"
- Check RPC endpoint status
- Review error logs
- Reset indexer_state table if needed

See detailed guides in indexer/README.md and resolver/README.md
