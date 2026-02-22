# Testing the Indexer and Resolver Services

Complete testing guide for Agent Identity Protocol services.

## Prerequisites

- Docker and Docker Compose
- curl or Postman
- PostgreSQL client tools (psql)
- Node.js 20+

## 1. Local Development Testing

### Setup

```bash
# Start PostgreSQL
docker run -d \
  -e POSTGRES_USER=agent \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=agent_identity \
  -p 5432:5432 \
  --name postgres-test \
  postgres:16-alpine

# Wait for it to be ready
sleep 5

# Start indexer (Terminal 1)
cd indexer
npm install
npm run dev

# Start resolver (Terminal 2)
cd resolver
npm install
npm run dev
```

### Health Checks

```bash
# Resolver health
curl http://localhost:3001/health

# Expected output:
# {"status":"ok","timestamp":1234567890}
```

## 2. Database Integration Tests

### Verify Database Connectivity

```bash
# Connect to database
psql -h localhost -U agent -d agent_identity -W

# Check tables created
\dt

# Expected tables:
# - dids
# - schemas
# - attestations
# - delegations
# - revocations
# - indexer_state
```

### Seed Test Data

```bash
# Insert test DID
INSERT INTO dids (id, controller, metadata_cid, tx_hash, block_number, active)
VALUES ('0xabc123', '0xdef456', 'QmTest', '0x789abc', 100, true);

# Insert test schema
INSERT INTO schemas (id, creator, name, version, schema_cid, tx_hash, active)
VALUES ('0xschema1', '0xcreator1', 'TestSchema', '1.0.0', 'QmSchema', '0xtx1', true);

# Insert test attestation
INSERT INTO attestations (uid, schema_id, issuer, subject, issued_at, data_cid, tx_hash, block_number)
VALUES ('0xatest1', '0xschema1', '0dissuer1', '0xsubject1', NOW(), 'QmAttest', '0xtx2', 101);

# Insert test delegation
INSERT INTO delegations (id, owner, agent, scope, tx_hash)
VALUES ('0xdeleg1', '0xowner1', '0xagent1', 1::bigint, '0xtx3');
```

## 3. API Endpoint Testing

### Identity Endpoints

```bash
# Get DID document
curl -X GET http://localhost:3001/identity/0xabc123 | jq

# Expected response:
# {
#   "did": "0xabc123",
#   "controller": "0xdef456",
#   "active": true,
#   "metadataCid": "QmTest",
#   "updatedAt": 1234567890
# }

# Get trust profile
curl -X GET http://localhost:3001/identity/0xabc123/trust-profile | jq

# Get credentials
curl -X GET http://localhost:3001/identity/0xabc123/credentials | jq

# Get delegations
curl -X GET http://localhost:3001/identity/0xabc123/delegations | jq
```

### Reputation Endpoints

```bash
# Get reputation score
curl -X GET http://localhost:3001/reputation/0xsubject1 | jq

# Expected response includes:
# {
#   "subject": "0xsubject1",
#   "score": 45,
#   "tier": "silver",
#   "scoreBreakdown": {...},
#   "riskFlags": [...],
#   "proof": {...}
# }

# Verify proof
curl -X POST http://localhost:3001/reputation/verify \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "0xsubject1",
    "score": 45,
    "merkleRoot": "0x...",
    "proof": ["0x..."],
    "timestamp": 1234567890
  }' | jq
```

### Schema Endpoints

```bash
# Get schema by ID
curl -X GET http://localhost:3001/schema/0xschema1 | jq

# List all schemas
curl -X GET http://localhost:3001/schemas | jq

# Filter by creator
curl -X GET 'http://localhost:3001/schemas?creator=0xcreator1' | jq
```

## 4. Error Handling Tests

### Test Missing Data

```bash
# Request non-existent DID
curl -X GET http://localhost:3001/identity/0xnonexistent | jq

# Expected: 404 with error message
# {"error":"DID not found"}

# Request non-existent schema
curl -X GET http://localhost:3001/schema/0xnonexistent | jq

# Expected: 404 with error message
```

### Test Invalid Input

```bash
# Invalid proof verification
curl -X POST http://localhost:3001/reputation/verify \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "invalid",
    "score": "not_a_number",
    "merkleRoot": "invalid",
    "proof": "not_array"
  }' | jq

# Expected: 400 with validation error
```

### Test Timeout Handling

```bash
# Simulate slow database by adding delay
# Kill and restart resolver with artificial delay:
# Add: await new Promise(r => setTimeout(r, 5000)) before queries
# Then test response timeout

curl -m 2 http://localhost:3001/identity/0xabc123
# Should timeout after 2 seconds
```

## 5. Performance Testing

### Load Testing with Apache Bench

```bash
# Test health endpoint
ab -n 1000 -c 10 http://localhost:3001/health

# Test reputation endpoint
ab -n 100 -c 5 http://localhost:3001/reputation/0xsubject1

# Results show:
# - Requests per second
# - Time per request
# - Failed requests
```

### Load Testing with Autocannon

```bash
npm install -g autocannon

# 10 second test, 10 concurrent connections
autocannon -d 10 -c 10 http://localhost:3001/health

# 1 minute test
autocannon -d 60 -c 50 http://localhost:3001/reputation/0xsubject1
```

### Cache Testing

```bash
# First request (uncached)
time curl http://localhost:3001/reputation/0xsubject1 > /dev/null

# Second request (cached) - should be faster
time curl http://localhost:3001/reputation/0xsubject1 > /dev/null

# Third request after 60+ seconds - recalculates
sleep 65
time curl http://localhost:3001/reputation/0xsubject1 > /dev/null
```

## 6. Database Performance Tests

```bash
# Check query performance
psql -h localhost -U agent -d agent_identity << 'SQL'
EXPLAIN ANALYZE
SELECT * FROM attestations WHERE subject = '0xsubject1';

EXPLAIN ANALYZE
SELECT * FROM delegations WHERE owner = '0xowner1';

-- Check index usage
SELECT * FROM pg_stat_user_indexes;
SQL
```

## 7. Integration Test Scenarios

### Scenario 1: Complete Identity Lifecycle

```bash
# 1. Create DID
psql -h localhost -U agent -d agent_identity << 'SQL'
INSERT INTO dids (id, controller, metadata_cid, tx_hash, block_number)
VALUES ('0xtest1', '0xctrl1', 'QmMeta1', '0xtx1', 100);
SQL

# 2. Create schema
psql -h localhost -U agent -d agent_identity << 'SQL'
INSERT INTO schemas (id, creator, name, version, schema_cid, tx_hash)
VALUES ('0xsch1', '0xcreator', 'NameSchema', '1.0', 'QmSch1', '0xtx2');
SQL

# 3. Issue credential
psql -h localhost -U agent -d agent_identity << 'SQL'
INSERT INTO attestations (uid, schema_id, issuer, subject, issued_at, data_cid, tx_hash, block_number)
VALUES ('0xatt1', '0xsch1', '0xissuer', '0xtest1', NOW(), 'QmData', '0xtx3', 101);
SQL

# 4. Query via API
curl http://localhost:3001/identity/0xtest1/trust-profile | jq '.score'

# 5. Revoke credential
psql -h localhost -U agent -d agent_identity << 'SQL'
UPDATE attestations SET revoked = true, revoked_at = NOW() WHERE uid = '0xatt1';
SQL

# 6. Check updated score
curl http://localhost:3001/identity/0xtest1/trust-profile | jq '.score'

# Score should decrease due to revocation
```

### Scenario 2: Multi-Issuer Reputation Building

```bash
# Insert multiple credentials from different issuers
for i in {1..5}; do
  psql -h localhost -U agent -d agent_identity << SQL
INSERT INTO attestations (uid, schema_id, issuer, subject, issued_at, data_cid, tx_hash, block_number)
VALUES ('0xatt$i', '0xsch1', '0xissuer$i', '0xtest2', NOW() - INTERVAL '$((i-1)) days', 'QmData$i', '0xtx$((i+3))', $((101+i)));
SQL
done

# Check reputation score
curl http://localhost:3001/reputation/0xtest2 | jq '.score'
# Should show high attestation score
```

### Scenario 3: Delegation Chain

```bash
# Insert delegation chain
psql -h localhost -U agent -d agent_identity << 'SQL'
INSERT INTO delegations (id, owner, agent, scope, tx_hash) VALUES ('0xd1', '0xowner1', '0xagent1', 1, '0xtx1');
INSERT INTO delegations (id, owner, agent, scope, tx_hash) VALUES ('0xd2', '0xowner1', '0xagent2', 2, '0xtx2');
INSERT INTO delegations (id, owner, agent, scope, tx_hash) VALUES ('0xd3', '0xowner1', '0xagent3', 4, '0xtx3');
SQL

# Query delegations
curl http://localhost:3001/identity/0xowner1/delegations | jq '.[] | {id, agent, scope}'

# Get trust profile with delegation score
curl http://localhost:3001/identity/0xowner1/trust-profile | jq '.scoreBreakdown.delegationScore'
```

## 8. Indexer Testing

### Monitor Indexer Logs

```bash
# Watch indexer processing
docker-compose logs -f indexer | grep "Processing"

# Expected pattern:
# Processing 45 DID registry events
# Processing 12 attestation registry events
# ...
# Block range processed
```

### Test Block State Tracking

```bash
# Check current state
psql -h localhost -U agent -d agent_identity << 'SQL'
SELECT chain_id, last_processed_block FROM indexer_state;
SQL

# Wait a bit and check again - should increment
sleep 15
psql -h localhost -U agent -d agent_identity << 'SQL'
SELECT chain_id, last_processed_block FROM indexer_state;
SQL
```

### Test Error Recovery

```bash
# Kill indexer
pkill -f "indexer"

# Check logs show error
# Restart
npm start

# Should resume from last block
grep "last_processed_block" logs/indexer.log
```

## 9. Stress Testing

### Large Dataset Test

```bash
# Insert 1000 attestations
psql -h localhost -U agent -d agent_identity << 'SQL'
INSERT INTO attestations (uid, schema_id, issuer, subject, issued_at, data_cid, tx_hash, block_number)
SELECT 
  'uid_' || GENERATE_SERIES(1, 1000),
  '0xsch1',
  '0xissuer1',
  '0xtest3',
  NOW() - INTERVAL '1 day' * RANDOM(),
  'QmData_' || GENERATE_SERIES(1, 1000),
  '0xtx_' || GENERATE_SERIES(1, 1000),
  100 + GENERATE_SERIES(1, 1000)
SQL

# Query reputation
time curl http://localhost:3001/reputation/0xtest3 > /dev/null

# Check response time and database load
```

### Concurrent Requests

```bash
# 100 concurrent requests
for i in {1..100}; do
  curl -s http://localhost:3001/health &
done
wait

# Monitor resolver logs for errors or slow requests
```

## 10. Cleanup

```bash
# Stop services
docker-compose down

# Remove test database
docker stop postgres-test
docker rm postgres-test

# Or full cleanup
docker system prune -a
```

## Expected Test Results

### Response Time Targets
- Health check: <10ms
- DID lookup: <50ms
- Reputation score (cached): <20ms
- Reputation score (computed): <500ms
- Schema list: <100ms

### Success Criteria
- All endpoints respond correctly
- Error handling works as expected
- Database maintains consistency
- Indexer processes events without data loss
- Reputation scores are accurate

## Continuous Testing

### Watch Mode

```bash
# Run tests on file changes
npm run dev -- --watch-tests
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Services
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: password
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install -g npm@latest
      - run: cd indexer && npm install && npm run build
      - run: cd resolver && npm install && npm run build
```
