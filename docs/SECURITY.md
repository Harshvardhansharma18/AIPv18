# Security Policy

**Agent Identity Protocol v1.0**  
**Last Updated**: February 2026

## Table of Contents

1. [Trust Boundaries](#trust-boundaries)
2. [Role Model](#role-model)
3. [Attack Vectors & Mitigations](#attack-vectors--mitigations)
4. [Protocol Invariants](#protocol-invariants)
5. [Upgrade Policy](#upgrade-policy)
6. [Bug Bounty Program](#bug-bounty-program)
7. [Security Checklist](#security-checklist)

---

## Trust Boundaries

The Agent Identity Protocol is designed with clear trust boundaries. This table defines what components must be trusted and at what level.

| Component | Trust Level | Dependencies | Compromise Impact |
|-----------|-------------|--------------|-------------------|
| **Ethereum Smart Contracts** | CRITICAL | Consensus layer | Full protocol compromise |
| **Block Finality (12+ blocks)** | CRITICAL | Validator set | Event ordering compromise |
| **Indexer Service** | HIGH | Operator honesty | Score computation errors |
| **PostgreSQL Database** | HIGH | Database isolation | Off-chain state corruption |
| **IPFS Network** | MEDIUM | Content hash verification | Schema/data manipulation |
| **Resolver API Service** | MEDIUM | Query truthfulness | Stale/false reputation scores |
| **Redis Cache** | LOW | TTL validity | Temporary staleness |
| **Issuer Reputation** | VARIABLE | Issuer behavior | Quality of attestations varies |
| **Guardian Keys** | CRITICAL | Guardian security | Account recovery bypass |
| **DID Controller Keys** | CRITICAL | Key security | Identity takeover |

### Assumptions

**We assume**:
- Ethereum consensus is secure (>51% honest validators)
- Smart contract code is audited and behaves as specified
- Private keys are managed securely by agents
- Guardians are genuinely independent

**We don't assume**:
- Indexer operator is honest (can verify via replay)
- Resolver API is honest (can verify via Merkle proofs)
- All issuers are trustworthy (reputation-weighted)
- IPFS nodes store data permanently (use fallback gateways)

---

## Role Model

The protocol defines distinct roles with specific permissions:

| Role | Responsibilities | Permissions | Contract Functions |
|------|-----------------|-------------|-------------------|
| **Agent/Subject** | Entity with identity and reputation | Can rotate keys, create delegations, initiate recovery | `rotateKey()`, `delegationRegistry.create()`, `initiateRecovery()` |
| **Controller** | EOA or smart contract owning the identity | All agent permissions | All DIDRegistry functions |
| **Guardian** | Multi-sig recovery authority | Confirm recovery, veto recovery | `confirmRecovery()`, `cancelRecovery()` |
| **Issuer** | Authority issuing attestations | Create/revoke attestations | `attest()`, `revoke()` |
| **Schema Admin** | Manager of attestation schema | Deprecate schemas, restrict issuers | `deprecateSchema()`, `setSchemaIssuerWhitelist()` |
| **Protocol Admin** | DAO governance (future) | Upgrade contracts, set parameters | `updateRecoveryDelay()`, `updateSybilThreshold()` |
| **Delegate** | Authorized to act on behalf of agent | Act within granted scope only | No smart contract permissions (enforced off-chain) |
| **Indexer Operator** | Maintains off-chain state | Index events, compute reputation | (Off-chain service, no contract permissions) |
| **Paymaster** | Sponsors transactions for agents | Check reputation, decide sponsorship | `verifyReputation()` (view only) |

### Permission Matrix

| Function | Controller | Guardian | Issuer | Schema Admin | Delegate | Indexer | Paymaster |
|----------|-----------|----------|--------|--------------|----------|---------|-----------|
| `register()` | ✓ | - | - | - | - | - | - |
| `rotateKey()` | ✓ | - | - | - | - | - | - |
| `addGuardian()` | ✓ | - | - | - | - | - | - |
| `removeGuardian()` | ✓ | - | - | - | - | - | - |
| `initiateRecovery()` | - | ✓ | - | - | - | - | - |
| `confirmRecovery()` | - | ✓ | - | - | - | - | - |
| `cancelRecovery()` | ✓ | - | - | - | - | - | - |
| `executeRecovery()` | - | ✓ | - | - | - | - | - |
| `attest()` | - | - | ✓ | - | - | - | - |
| `revoke()` | ✓ or - | - | ✓ | - | - | - | - |
| `deprecateSchema()` | - | - | - | ✓ | - | - | - |
| `setSchemaIssuerWhitelist()` | - | - | - | ✓ | - | - | - |
| `createDelegation()` | ✓ | - | - | - | - | - | - |
| `revokeDelegation()` | ✓ | - | - | - | - | - | - |
| `getReputation()` (view) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `verifyMerkleProof()` (view) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Attack Vectors & Mitigations

Comprehensive list of known attack vectors with specific mitigations.

### 1. Private Key Compromise

**Vector**: Attacker gains access to agent's private key.

**Impact**: 
- Attacker can rotate identity key
- Attacker can create/revoke delegations
- Attacker can revoke attestations
- (Cannot bypass guardian recovery if guardians are secure)

**Detection**:
- Anomalous transaction frequency
- Unusual action types (swaps if never swapped before)
- Large fund transfers
- Guardian monitoring systems

**Mitigation**:
```solidity
// 1. Grace period on key rotation
function rotateKey(address newKey) external {
    require(msg.sender == controller);
    activeKey = newKey;
    gracePeriodEnd = now + 1 hour;
    emit KeyRotated(newKey);
}

// 2. Old key valid during grace period (for recovery)
function isValidKey(address key) external view returns (bool) {
    if (key == activeKey) return true;
    if (key == previousKey && now < gracePeriodEnd) return true;
    return false;
}

// 3. Guardian recovery with timelock
function initiateRecovery(address newController) external onlyGuardian {
    recovery.newController = newController;
    recovery.initiatedAt = now;
    emit RecoveryInitiated(newController);
}

function executeRecovery() external onlyGuardian {
    require(now >= recovery.initiatedAt + 24 hours);
    controller = recovery.newController;
}
```

**Recovery Window**: 
- Minutes 0-1: Agent rotates key to safe key
- Minutes 0-60: Old key remains valid
- Hours 0-24: Guardians can still cancel recovery
- Hour 24+: Recovery finalizes (if confirmed)

---

### 2. Sybil Attack (Identity Farm)

**Vector**: Attacker creates 1000+ identities, cross-attests to build fake reputation.

**Cost Analysis**:
```
Cost per identity: 0.02 ETH (gas) + attestations
N identities: 0.02N ETH + attestation costs
1000 identities: 20 ETH ≈ $60k

Revenue if renting identities for lending at 10% APY:
- Each identity borrows 100 ETH
- Fee: 10 ETH/year
- 1000 identities: 10,000 ETH/year ≈ $30M profit
- Break-even: ~7 days
```

**Detection**:
```python
def sybil_score(agent_did):
    """0.0 = legitimate, 1.0 = certain Sybil"""
    score = 0.0
    
    # 1. Age (30%)
    age_days = (now - agent.created_at).days
    if age_days < 7:
        score += 0.3
    elif age_days < 30:
        score += 0.15
    
    # 2. Issuer diversity (30%)
    issuers = get_attestation_issuers(agent)
    if len(issuers) < 2:
        score += 0.2
    # Check if issuers are also new
    issuer_avg_age = sum(get_age(i) for i in issuers) / len(issuers)
    if issuer_avg_age < 30:
        score += 0.2
    
    # 3. Behavioral similarity (20%)
    similar = get_similar_agents(agent)
    if len(similar) > 10:
        score += 0.2
    
    # 4. Action diversity (20%)
    actions = get_actions(agent, last_30d)
    if len(unique(actions)) <= 2:
        score += 0.2
    
    return min(1.0, score)
```

**Mitigation**:
```solidity
// 1. Cost of entry: require initial attestations
function register(address initialIssuer, bytes32 schemaUID) external {
    require(issuerReputation[initialIssuer] >= MIN_ISSUER_SCORE);
    // ...
}

// 2. Issuer diversification: weight by issuer diversity
function computeAttestationScore(bytes32 did) internal view returns (uint256) {
    Attestation[] memory atts = getAttestations(did);
    address[] memory issuers = uniqueIssuers(atts);
    
    uint256 totalScore = 0;
    for (uint i = 0; i < atts.length; i++) {
        uint256 issuerRep = getReputation(atts[i].issuer);
        totalScore += attValue(atts[i]) * issuerRep / 100;
    }
    
    // Diversity bonus: more issuers = higher multiplier
    uint256 diversityMultiplier = min(2.0, sqrt(issuers.length / 2.0));
    return totalScore * diversityMultiplier;
}

// 3. Freshness decay: new identities have reputation caps
function getReputation(bytes32 did) external view returns (uint256) {
    uint256 baseScore = computeBaseScore(did);
    uint256 ageDays = (now - identities[did].createdAt) / 1 days;
    
    if (ageDays < 30) {
        // Ramp up from 0 to 100 over 30 days
        return baseScore * ageDays / 30;
    }
    return baseScore;
}
```

---

### 3. Malicious Issuer

**Vector**: Attacker issues false attestations or colludes with Sybil ring to cross-attest.

**Example**:
```
Attacker creates:
1. Schema: "KYC" (controlled by attacker)
2. Oracle: Fake KYC oracle (attacker-controlled)
3. Sybil ring: 100 identities

Flow:
- Each Sybil applies to fake KYC oracle
- Oracle issues "verified" attestation
- Sybil now has reputation boost
- Cross-attest within ring
- All 100 Sibyls now appear trustworthy
```

**Detection**:
```python
def is_malicious_issuer(issuer, schema):
    """Detect fraudulent issuer-schema pair"""
    
    # 1. Issuer's own reputation
    if get_reputation(issuer) < schema.min_issuer_reputation:
        return True
    
    # 2. Recipients cross-attest each other (Sybil ring)
    atts = get_attestations_by(issuer, schema)
    recipients = set(a.subject for a in atts)
    
    cross_attestations = 0
    for att in get_attestations():
        if att.issuer in recipients and att.subject in recipients:
            cross_attestations += 1
    
    if cross_attestations / len(atts) > 0.7:  # >70% cross-attest
        return True
    
    # 3. Recipients have unusual similarity
    similarity = compute_avg_similarity(recipients)
    if similarity > 0.8:  # Very similar behavior
        return True
    
    return False
```

**Mitigation**:
```solidity
// 1. Whitelist trusted issuers per schema
mapping(bytes32 schema => address[]) public trustedIssuers;

function attest(bytes32 schema, ...) external {
    require(isTrustedIssuer(schema, msg.sender), "Untrusted issuer");
    // ...
}

// 2. Schema-specific minimum issuer reputation
struct Schema {
    bytes32 uid;
    uint256 min_issuer_reputation;  // e.g., 50 for KYC
}

function createSchema(uint256 minIssuerRep) external {
    schema.min_issuer_reputation = minIssuerRep;
}

// 3. Discount attestations from low-reputation issuers
function getAttestationWeight(bytes32 attestationUID) 
    internal view returns (uint256) {
    Attestation memory att = attestations[attestationUID];
    uint256 issuerRep = getReputation(att.issuer);
    
    if (issuerRep < 20) return att.baseWeight / 4;      // 25%
    if (issuerRep < 40) return att.baseWeight / 2;      // 50%
    if (issuerRep < 60) return att.baseWeight * 3 / 4;  // 75%
    return att.baseWeight;  // 100%
}
```

---

### 4. Indexer Manipulation

**Vector**: Attacker controls indexer, serves false reputation scores.

**Mitigation 1: Deterministic Replay**
```python
def verify_indexer_integrity():
    """
    Verify indexer state matches blockchain
    """
    # Fetch all events from chain (ground truth)
    events = rpc_client.get_events(
        contracts=['DIDRegistry', 'AttestationRegistry', ...],
        from_block=0
    )
    
    # Sort deterministically
    events.sort(key=lambda e: (e.block_number, e.log_index))
    
    # Replay through state machine
    true_state = {}
    for event in events:
        true_state = apply_event(true_state, event)
    
    # Compute Merkle root
    true_root = compute_merkle_root(true_state)
    
    # Compare with indexer
    indexer_root = indexer.get_state_root()
    
    if true_root != indexer_root:
        print("INDEXER COMPROMISED!")
        # Stop using this indexer
        alert_operators()
```

**Mitigation 2: Merkle Proof Verification**
```solidity
// Paymaster verifies reputation proof on-chain
function verifyReputationProof(
    bytes32 did,
    uint256 score,
    bytes32[] calldata proof
) external view returns (bool) {
    bytes32 claimedRoot = indexer.getStateRoot();
    bytes32 leaf = keccak256(abi.encode(did, score));
    
    require(merkleProve(proof, claimedRoot, leaf), "Invalid proof");
    
    // If verification succeeds, reputation is accurate
    return true;
}
```

**Mitigation 3: Multiple Independent Indexers**
```typescript
// Use multiple indexers, take majority vote
const scores = [
    await indexer1.getReputation(did),  // 75
    await indexer2.getReputation(did),  // 75
    await indexer3.getReputation(did),  // 20 (corrupted)
];

// Median is robust to one compromised indexer
const sorted = scores.sort((a,b) => a - b);
const medianScore = sorted[Math.floor(sorted.length / 2)];  // 75
```

---

### 5. Delegation Hijacking

**Vector**: Attacker compromises delegate, revokes delegations, blocks original agent's actions.

**Mitigation**: 
```solidity
// Delegator can revoke delegations even if delegate is compromised
function revokeDelegation(bytes32 delegationId) external {
    Delegation memory d = delegations[delegationId];
    require(msg.sender == getController(d.delegator), "Unauthorized");
    
    delegations[delegationId].expiryTime = block.timestamp;
    emit DelegationRevoked(delegationId);
}

// Revoking one delegation doesn't affect other delegations
function revokeAllDelegations(bytes32 delegatorDID) external {
    require(msg.sender == getController(delegatorDID), "Unauthorized");
    
    for (uint i = 0; i < delegationsByDelegator[delegatorDID].length; i++) {
        bytes32 delId = delegationsByDelegator[delegatorDID][i];
        delegations[delId].expiryTime = block.timestamp;
    }
}
```

---

### 6. Replay Attacks

**Vector**: Attacker replays transaction on another chain (if deployed to multiple chains).

**Mitigation**:
```solidity
// Include chain ID in signature
function rotateKey(
    bytes32 did,
    address newKey,
    uint256 nonce,
    bytes memory signature
) external {
    require(nonce == nextNonce[did], "Invalid nonce");
    
    bytes32 digest = keccak256(abi.encodePacked(
        "KEY_ROTATION_V1",
        block.chainid,           // Chain-specific
        did,
        newKey,
        nonce
    ));
    
    require(ECDSA.recover(digest, signature) == activeKey[did]);
    
    nextNonce[did]++;
    activeKey[did] = newKey;
}
```

---

### 7. Front-Running Key Rotation

**Vector**: Attacker sees key rotation in mempool, frontrunns with own rotation.

**Scenario**:
```
1. Agent A sends tx: rotate key to K1
2. Attacker sees in mempool
3. Attacker frontrunns: rotates key to K_attacker
4. Agent's tx executes, rotates K_attacker to K1
5. Attacker now has agent's key!
```

**Mitigation**:
```solidity
// Grace period allows recovery
function rotateKey(address newKey) external {
    require(msg.sender == controller);
    
    previousKey = activeKey;
    activeKey = newKey;
    gracePeriodEnd = block.timestamp + 1 hours;
    
    emit KeyRotated(newKey);
}

function isValidSignature(address key, bytes memory signature) 
    external view returns (bool) {
    if (key == activeKey) return true;
    
    // Old key valid during grace period
    if (key == previousKey && block.timestamp < gracePeriodEnd) {
        return true;
    }
    
    return false;
}

// If frontrun detected, agent can recover
function recoverFromFrontrun() external {
    require(block.timestamp < gracePeriodEnd, "Grace period expired");
    
    // Rotate back to original key
    activeKey = previousKey;
    gracePeriodEnd = 0;
    
    emit Recovery(msg.sender);
}
```

---

### 8. Reentrancy

**Vector**: External call followed by state update enables repeated value extraction.

**Mitigation**: Always use Checks-Effects-Interactions pattern:
```solidity
// VULNERABLE
function claimReputation(bytes32 did) external {
    uint256 amount = balances[did];
    (bool success, ) = did_owner.call("");  // External call first
    require(success);
    balances[did] = 0;  // State update after (reentrancy window)
}

// SAFE
function claimReputation(bytes32 did) external {
    uint256 amount = balances[did];
    balances[did] = 0;  // State update first
    (bool success, ) = did_owner.call("");  // External call last
    require(success);
}
```

---

### 9. Flash Loan Attack

**Vector**: Attacker borrows large amount via flash loan, uses to manipulate reputation scores.

**Mitigation**:
```python
def detect_flash_loan_attack(did):
    """
    Detect if reputation change is due to flash loan
    """
    # Reputation should not change within single transaction
    # If it does, likely flash loan attack
    
    old_rep = get_reputation_at_block(did, block_n - 1)
    new_rep = get_reputation_at_block(did, block_n)
    
    if abs(old_rep - new_rep) > 50:  # Large single-block change
        return True  # Likely attack
    
    return False
```

---

## Protocol Invariants

These invariants must always hold. Violation indicates a critical bug.

| # | Invariant | Verification |
|---|-----------|--------------|
| I1 | Each DID has exactly one controller | `assert(count(identities) == count(controllers))` |
| I2 | Controller key is always active | `assert(activeKey == controller OR key_rotation_grace_period_valid)` |
| I3 | Nonce always increases | `assert(nonce[n+1] > nonce[n])` |
| I4 | Delegation scope is valid bitmask | `assert(delegation.scope & ((1 << 256) - 1) == delegation.scope)` |
| I5 | Expiry times are in future | `assert(attest.expiryTime > block.timestamp OR expiryTime == 0)` |
| I6 | Revoked attestations remain revoked | `assert(revoked[uid] AND old_revoked[uid])` |
| I7 | Merkle root is deterministic | `assert(computeRoot(state1) == computeRoot(state1))` |
| I8 | Reputation is between 0-100 | `assert(0 <= reputation <= 100)` |
| I9 | Guardian threshold ≤ guardian count | `assert(guardianThreshold <= guardians.length)` |
| I10 | Recovery delay is positive | `assert(recoveryDelay > 0)` |

---

## Upgrade Policy

### Immutable by Default

Smart contracts are deployed as **immutable** (no upgradeable proxy). This is intentional:

**Rationale**:
- Upgradeable proxies introduce additional attack surface
- Security bugs cannot be "upgraded away" without migration
- Users know the contract code they're interacting with
- Prevents emergency admin overrides

**Implication**:
- All bugs must be worked around, not fixed
- If critical bug found, new contract deployment required
- All identities must migrate to new contract (via DID controller)

### Migration Path (If Critical Bug Found)

1. **Discovery & Audit**: Bug identified and confirmed
2. **Deprecation**: Old contract marked as deprecated
3. **New Deployment**: New contract deployed with fix
4. **Agent Migration**: Each agent calls `migrateIdentity(oldDID, newDID)`
5. **Attestation Acceptance**: Relying parties accept both old/new attestations during transition
6. **Sunset**: Old contract deprecated after 90-day transition period

---

## Bug Bounty Program

### Scope

**In Scope**:
- Smart contract logic errors
- Cryptographic vulnerabilities
- Off-chain indexer manipulation attacks
- Privacy leaks
- Consensus failures

**Out of Scope**:
- DOS attacks (gas-based)
- Theoretical cryptographic breaks (post-quantum)
- Social engineering
- Attacks requiring contract ownership

### Submission Process

1. **Email**: security@agent-identity-protocol.org
2. **Details**: Provide:
   - Vulnerability description
   - Proof of concept
   - Impact assessment
   - Suggested mitigation
3. **Confidentiality**: Do not disclose until fix deployed (minimum 30 days)
4. **Reward**: Based on severity:

| Severity | Bounty | Description |
|----------|--------|-------------|
| Critical | $50,000-$100,000 | Consensus failure, identity theft |
| High | $10,000-$50,000 | Reputation manipulation, fund theft |
| Medium | $1,000-$10,000 | Privacy leak, delegation hijacking |
| Low | $100-$1,000 | Minor logic errors, griefing |

### Responsible Disclosure Policy

- **90-day embargo** before public disclosure
- **30-day fix timeline** after report acceptance
- **Interim measures**: Emergency workarounds published
- **Credit**: Public acknowledgment in release notes (if desired)

---

## Security Checklist

### Pre-Deployment

- [ ] All smart contracts audited by third-party firm
- [ ] Test coverage > 95%
- [ ] All invariants verified via formal methods
- [ ] Fuzzing tests pass (500k+ iterations per function)
- [ ] Gas limits analyzed (no DoS via gas)
- [ ] Emergency pause mechanism designed
- [ ] Monitoring & alerting configured
- [ ] Incident response plan established

### Post-Deployment

- [ ] Mainnet deployment on isolated testnet first
- [ ] 2+ week observation period before mainnet
- [ ] Staggered rollout (10% → 50% → 100% of transactions)
- [ ] Real-time monitoring of contract calls
- [ ] Alerting on anomalous behavior patterns
- [ ] Weekly security review meetings
- [ ] Quarterly penetration testing
- [ ] Incident playbooks tested monthly

### Ongoing

- [ ] Dependencies updated for security patches
- [ ] New attack vectors documented
- [ ] Threat model reviewed quarterly
- [ ] Security advisories tracked (OpenZeppelin, Trail of Bits)
- [ ] Bug bounty program maintained
- [ ] Documentation kept current
- [ ] Stakeholders notified of security updates

---

## Contact

**Security Team Email**: security@agent-identity-protocol.org  
**Response Time**: 24 hours  
**Public Updates**: [Security Advisories](https://github.com/agent-identity-protocol/security)

---

**Last Reviewed**: February 2026  
**Next Review**: August 2026
