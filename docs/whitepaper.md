# Agent Identity Protocol: A Decentralized Identity and Composable Reputation Middleware for AI Agents and Smart Accounts

**Version 1.0 | February 2026**

---

## Abstract

The emergence of autonomous AI agents as economic actors introduces a fundamental challenge to decentralized systems: how to establish persistent identity and verifiable reputation for entities that operate continuously across multiple blockchains and applications without human intermediaries. Existing identity solutions—including the Ethereum Naming Service (ENS), Ethereum Attestation Service (EAS), and W3C Decentralized Identifiers (DIDs)—were designed for human-centric use cases and fail to address the unique requirements of autonomous agents: unbounded action capability, hierarchical delegation, cross-chain operation, and rapid reputation accumulation.

The Agent Identity Protocol (AIP) introduces a purpose-built decentralized identity and reputation system specifically optimized for AI agents and smart accounts. AIP provides four foundational capabilities: (1) cryptographically anchored, chain-agnostic identities persistent across blockchains, (2) composable hierarchical delegation enabling fine-grained authority distribution, (3) verifiable reputation with cryptographic proofs and privacy-preserving selective disclosure, and (4) integration with ERC-4337 Account Abstraction and Safe smart wallets. The protocol achieves gas efficiency through off-chain computation with deterministic replay validation, implements Sybil resistance through cost-of-entry analysis and freshness-based decay, and maintains privacy through zero-knowledge ready architecture.

This whitepaper formally specifies the AIP design goals, system architecture, cryptographic primitives, reputation computation model, security assumptions, and threat model. We analyze attack vectors including key compromise, Sybil farming, malicious issuers, indexer manipulation, and delegation hijacking, detailing mitigations for each. We demonstrate how AIP enables trustworthy agent-to-agent and agent-to-human interactions in decentralized networks where identity accountability has been previously infeasible.

---

## 1. Problem Statement

### 1.1 The Agentic Identity Gap

The Web3 ecosystem is rapidly evolving toward autonomous agent-driven applications. Today, AI agents execute transactions autonomously, manage digital assets, participate in governance, and interact with other agents—all without human intermediaries. However, the identity and trust infrastructure of Ethereum and broader blockchain networks was architected for human-centric use cases: account balances, asset ownership, simple smart contracts.

For autonomous agents, this creates a critical identity gap:

**No Persistent Accountability**: An agent account today is merely an address—an arbitrary 160-bit number with no intrinsic connection to the agent's behavior history. An attacker can easily create a new address and attempt the same malicious action, with no cost beyond gas fees. There is no mechanism to track "this agent has compromised keys" or "this agent repeatedly violates agreements."

**No Capability Credentialing**: When an agent wishes to delegate authority (e.g., "execute swaps on my behalf up to $10k per transaction"), existing systems offer only binary choices: grant full account access or deploy a specialized smart contract. Neither provides composable, revocable, time-bound delegation with verifiable scopes.

**No Reputation Portability**: Reputation must be earned anew on each chain. An agent with excellent reputation history on Ethereum cannot prove this history to applications on Polygon or Optimism. Reputation data exists in isolated smart contract storage with no standardized query interface.

**No Cross-Chain Identity**: An agent's identity is chain-specific. To operate on multiple chains, it must maintain separate accounts, each building separate reputation histories, each creating Sybil farming opportunities.

**No Revocation Finality**: If an agent's keys are compromised, there is no fast, global mechanism to revoke its credentials. Recovery requires deploying new smart contracts, migrating state, and notifying all parties—a process taking days or weeks.

### 1.2 Limitations of Existing Solutions

#### Ethereum Naming Service (ENS)
ENS solves human-readable naming but not identity verification. An ENS name is simply a pointer to an address; it provides no reputation, no delegation, and no verification that the name owner is actually who they claim to be. ENS is valuable for branding but insufficient for agent credentialing.

#### Ethereum Attestation Service (EAS)
EAS provides a flexible framework for issuing signed attestations (verifiable claims). However, EAS attestations are:
- **Reactive, not proactive**: EAS requires explicit querying of attestations; there is no aggregated reputation score
- **Isolated**: Each attestation stands alone; there is no mechanism to compose attestations into trustworthiness scores
- **Passive on revocation**: Revocation is recorded on-chain but requires application-level logic to interpret; there is no fast global revocation index
- **Not agent-optimized**: EAS has no model for agent delegation, hierarchical authority, or composable scopes

#### W3C Decentralized Identifiers (DID Specification)
The W3C DID spec is a comprehensive identity standard supporting multiple DID methods (did:eth, did:key, etc.). However:
- **No reputation model**: DIDs are identity primitives without integrated reputation scoring
- **Chain-specific methods**: Each chain requires a separate DID method; cross-chain identity requires off-chain aggregation
- **Storage overhead**: Full DID documents typically require 1-5 KB on-chain, making them expensive for high-frequency updates
- **Incomplete standardization**: Many DID operations (revocation, delegation) lack standardized semantics across methods

#### Smart Contract-Based Identity (Safe, Account Abstraction)
ERC-4337 and Safe wallets provide flexible account programming but do not address:
- **Identity persistence across wallets**: Reputation is bound to a wallet address, not a logical identity
- **Portable reputation**: No mechanism to take reputation history when migrating wallets
- **Revocation speed**: Recovery via guardians takes hours or days
- **Delegation composability**: No standard model for delegating specific capabilities to agents

### 1.3 Why Agent Identity Remains Unsolved

Three fundamental problems make agent identity unsolved despite existing infrastructure:

#### The Delegation Problem
Traditional identity systems assume delegation is rare and occurs between trusted parties. An AI agent, by contrast, may need to:
- Delegate swap authority to a different agent for the next 1 hour
- Delegate governance voting to a delegator agent for a specific proposal
- Delegate borrowing authority to a liquidity provider for the next block
- Delegate custody to a recovery agent upon detecting suspicious activity

This requires a model of hierarchical, composable, time-bound, revocable, scope-limited delegation. Existing systems provide none of this.

#### The Sybil Problem in Agent Networks
Without persistent cross-chain identity, an attacker can simply create a new agent address to evade reputation penalties. The cost of entry is a single transaction (≈0.01 ETH in gas). To prevent this, AIP must make Sybil attacks economically infeasible by:
- Charging a cost per new identity (via attestation creation)
- Decaying reputation for high-frequency identity creation
- Implementing graph-based Sybil detection

Existing systems do not address this.

#### The Revocation Latency Problem
If an agent's private keys are compromised, revocation must be fast and global. EAS and ENS support revocation, but:
- Revocation events are buried in transaction history
- There is no centralized revocation index
- Applications must explicitly query revocation status
- Revocation takes ≥12 seconds (one block) to finalize

For high-value interactions, this latency is unacceptable. AIP solves this with a dedicated RevocationRegistry and Merkle tree acceleration.

---

## 2. Design Goals

The Agent Identity Protocol is guided by seven core design goals:

### G1: Chain-Agnostic Identity Persistence

**Goal**: An agent maintains a single, persistent identity (DID) that operates across multiple blockchains without requiring chain-specific modifications or separate addresses per chain.

**Rationale**: Agents operate in multi-chain environments. Forcing chain-specific identities creates fragmentation, increases Sybil attack surface, and prevents reputation portability.

**Approach**: 
- Identities are anchored to Ethereum mainnet DIDRegistry via immutable smart contract events
- Agents establish chain-local delegation entries via DelegationRegistry on each chain they operate on
- Resolver service aggregates state across all chains to provide unified identity resolution

### G2: Composable, Hierarchical Delegation

**Goal**: Enable fine-grained, revocable, time-bound delegation of specific capabilities to other addresses or agents, supporting unlimited delegation depth.

**Rationale**: Agents frequently need to delegate authority to other agents for specific actions. The delegation model must support:
- Scope limiting: delegating only "swap" authority, not transfer authority
- Time limiting: delegation valid for exactly 1 hour
- Chain limiting: delegation valid only on Ethereum, not Polygon
- Revoking: canceling delegation without breaking downstream delegations
- Chaining: agent A delegates to agent B, agent B to agent C

**Approach**:
- Bitmask-based scope encoding (256 bits = 256 possible capabilities)
- Expiry timestamps for automatic expiration
- Chain-specific delegation entries
- Delegation chain verification via contract call (max 10 hop detection)

### G3: Verifiable Reputation with Cryptographic Proofs

**Goal**: Enable cryptographic proofs of reputation that can be verified on-chain without accessing off-chain data, supporting privacy-preserving selective disclosure.

**Rationale**: Applications must verify agent reputation on-chain (e.g., "paymaster will only sponsor transactions for agents with reputation > 50"). This requires deterministic, verifiable reputation computation.

**Approach**:
- Reputation computed deterministically from attestations, delegations, activity
- Merkle tree of all DIDs with reputation scores enables O(log n) proof size
- Proofs can be verified on-chain via merkleProve()
- Zero-knowledge ready: future versions can use zk-SNARKs for complete privacy

### G4: Privacy-Preserving by Default

**Goal**: Minimize sensitive information leaked on-chain while maintaining verifiability.

**Rationale**: Agent behavior patterns (attestation issuers, delegation targets) may be commercially sensitive. Privacy by default protects agents while supporting selective disclosure when needed.

**Approach**:
- On-chain, only attestation UIDs are recorded, not full attestation data
- Schemas and attestation data stored on IPFS, accessible only by possession of UID
- Reputation scores computed off-chain, disclosed selectively via Merkle proofs
- Future: ZK circuits for privacy-preserving reputation proofs

### G5: Gas-Efficient On-Chain Footprint

**Goal**: Minimize on-chain storage and computation to keep identity operations affordable.

**Rationale**: If identity operations cost >0.1 ETH per operation, agents will not use them at scale. AIP must keep costs minimal.

**Approach**:
- Move all computation off-chain (indexer service)
- Attestations stored via EAS or similar, not in AIP contracts
- Schemas stored on IPFS, not on-chain
- Merkle proofs enable verification without storing full data
- Batch operations reduce per-operation costs

**Target gas costs**:
- Register identity: 100k gas (≈$3)
- Rotate key: 50k gas (≈$1.50)
- Create delegation: 80k gas (≈$2.50)
- Attestation (via EAS): 60k gas (≈$1.50)

### G6: ERC-4337 and Safe Native Integration

**Goal**: Natively integrate with ERC-4337 account abstraction and Safe smart wallets, enabling agents to operate through smart accounts rather than EOAs.

**Rationale**: Smart accounts are the future of agent identity. AIP must provide first-class support for agents operating through:
- ERC-4337 smart accounts with session keys
- Safe multisig wallets with module-based authorization
- Custom implementations (e.g., agent wallet templates)

**Approach**:
- Delegation scopes map directly to ERC-4337 session key capabilities
- Paymaster integration: sponsorship gated by reputation score
- Safe module: Safe can query AIP for delegation validation
- SDK provides abstractions for both EOA and smart account patterns

### G7: Censorship Resistance

**Goal**: Make it impossible for any single entity to censor an agent's identity or reputation.

**Rationale**: Agents must be able to operate indefinitely, even if application developers, wallet providers, or node operators are compromised or coerced.

**Approach**:
- All critical data (identity registration, attestations) stored on-chain as immutable events
- Indexer service is stateless; any node can re-index the chain from genesis
- No centralized gatekeeper; identity resolution is permissionless
- Reputation computation is deterministic and auditable
- Schemas stored on IPFS; any node can host a gateway

---

## 3. System Architecture

### 3.1 Layered Architecture

The Agent Identity Protocol is organized into four semantic layers:

```
┌─────────────────────────────────────────────────────┐
│        Application Layer                            │
│  - dApps, agents, smart accounts                   │
│  - Business logic using identity/reputation        │
└─────────────────────────────────────────────────────┘
                        ↑↓ (TypeScript SDK)
┌─────────────────────────────────────────────────────┐
│        Query Layer (Resolver Service)               │
│  - REST API for identity resolution                │
│  - Reputation score calculation                    │
│  - Delegation verification                         │
│  - Merkle proof generation                         │
│  - Caching for performance                         │
└─────────────────────────────────────────────────────┘
                        ↑↓ (Event Stream)
┌─────────────────────────────────────────────────────┐
│    Indexing Layer (Event Processor)                 │
│  - Real-time blockchain event ingestion            │
│  - Deterministic state machine                     │
│  - Reputation computation engine                   │
│  - Data synchronization                            │
└─────────────────────────────────────────────────────┘
                        ↑↓ (Queries)
┌─────────────────────────────────────────────────────┐
│    Data Layer (PostgreSQL + Cache)                  │
│  - Identity state tables                           │
│  - Attestation indices                             │
│  - Delegation records                              │
│  - Revocation bitmap                               │
│  - Reputation cache                                │
└─────────────────────────────────────────────────────┘
                        ↑↓ (Events)
┌─────────────────────────────────────────────────────┐
│   Settlement Layer (Smart Contracts)               │
│  - DIDRegistry (identity registration)             │
│  - SchemaRegistry (schema management)              │
│  - AttestationRegistry / EAS (claims)              │
│  - DelegationRegistry (authority delegation)       │
│  - RevocationRegistry (global revocation)          │
└─────────────────────────────────────────────────────┘
                        ↑↓ (RPC)
┌─────────────────────────────────────────────────────┐
│   Persistence Layer (Ethereum + IPFS)              │
│  - Transaction ledger (immutable events)           │
│  - Content-addressed schemas (IPFS)                │
│  - Transaction receipts (proof of inclusion)       │
└─────────────────────────────────────────────────────┘
```

### 3.2 On-Chain ↔ Off-Chain Interaction

```
┌──────────────────┐
│ Agent Sends Txn  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  Smart Contract Execution    │
│  - Validate signature        │
│  - Update state              │
│  - Emit event                │
└────────┬─────────────────────┘
         │
         │ (Event Log)
         ▼
┌──────────────────────────────┐
│  Indexer Service             │
│  - Poll RPC @ 1000ms         │
│  - Fetch events              │
│  - Validate & parse          │
│  - Apply state machine       │
│  - Compute reputation        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  PostgreSQL Database         │
│  - Store identity state      │
│  - Store delegations         │
│  - Store attestations        │
│  - Store reputation scores   │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Redis Cache                 │
│  - Cache hot scores          │
│  - Cache Merkle trees        │
│  - TTL-based expiry          │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Resolver API                │
│  - Query identity            │
│  - Get reputation            │
│  - Verify delegation         │
│  - Generate proofs           │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  SDK Client                  │
│  - Identity operations       │
│  - Delegation management     │
│  - Reputation queries        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Application / Agent         │
│  - Decision making           │
│  - Action execution          │
└──────────────────────────────┘
```

### 3.3 Data Flow

**Identity Creation Flow**:
```
Agent → AgentIdentityClient.register()
  ↓
SDK → DIDRegistry.register(agent_address)
  ↓
Blockchain → Emit IdentityRegistered event
  ↓
Indexer → Poll events, insert into identities table
  ↓
Database → INSERT INTO identities (did, controller, active_key, ...)
  ↓
Cache → Cache miss, will be populated on first query
```

**Attestation Creation Flow**:
```
Issuer → AgentIdentityClient.attestation.create(subject, schema, data)
  ↓
SDK → Call EAS.attest() or AttestationRegistry.create()
  ↓
Blockchain → Emit Attested event
  ↓
Indexer → Poll events, fetch schema from IPFS, parse data
  ↓
Database → INSERT INTO attestations (uid, issuer, subject, schema, data, ...)
  ↓
Reputation Engine → Recalculate subject's score
  ↓
Cache → Invalidate subject's reputation cache
```

**Reputation Query Flow**:
```
Client → GET /reputation/{did}
  ↓
Resolver → Check cache
  ├─ CACHE HIT → Return cached score
  └─ CACHE MISS → Compute score
       ↓
       Query attestations for this DID
       ↓
       Query delegations for this DID
       ↓
       Query activity history
       ↓
       Apply reputation algorithm:
       score = (attestation_score * 0.4) +
               (delegation_score * 0.3) +
               (activity_score * 0.3)
       ↓
       Apply freshness decay
       ↓
       Cache result for 5 minutes
       ↓
       Return score
```

**Merkle Proof Generation Flow**:
```
Client → POST /merkle-proof {did: "...", minScore: 50}
  ↓
Resolver → Get all DIDs with reputation scores
  ↓
Compute Merkle tree of (did, score) pairs
  ↓
Find path from leaf to root for requested DID
  ↓
Return {proof: [hash1, hash2, ...], root, index}
  ↓
Client can prove on-chain:
  merkleProve(did, score, proof, root) → true/false
```

### 3.4 Chain Abstraction

AIP supports multi-chain operation through a delegated authority model:

**Mainnet (Ethereum)**: Authoritative identity registry
- DIDRegistry contracts
- AttestationRegistry / EAS
- SchemaRegistry
- RevocationRegistry

**Secondary Chains** (Polygon, Optimism, Arbitrum, etc.):
- DelegationRegistry (per-chain)
- Events indexed locally
- Unified resolution via mainnet DID reference

**Cross-Chain Flow**:
```
Agent on Polygon → DelegationRegistry.create(
  delegator_did: "did:aip:0x...",  // Mainnet identity
  delegate: agent_polygon_address,
  scope: ["swap"],
  chainId: 137  // Polygon
)
  ↓
Event emitted on Polygon
  ↓
Polygon Indexer subscribes to DelegationRegistry events
  ↓
Database stores: (did, delegate, scope, chain=137)
  ↓
Mainnet Resolver aggregates Polygon delegations
  ↓
GET /delegations/{did}?chain=137 → Returns Polygon delegations
```

---

## 4. Protocol Modules

### 4.1 DIDRegistry

The DIDRegistry is the authoritative registry of agent identities.

#### Design Rationale

Each agent must have a single, persistent identity that:
- Can be owned and controlled by the agent (or its guardian)
- Can be transferred to new key holders
- Can be recovered if keys are compromised
- Is unique and cryptographically bound to the agent

We implement this as:
- **DID Format**: `did:aip:0x{32-byte-identifier}`
- **Identifier**: Derived from registration event (block hash, log index, registrant)
- **Ownership Model**: EOA or smart contract as controller

#### Key Rotation Mechanics

An agent may rotate its signing key without changing its DID:

```solidity
function rotateKey(bytes32 did, address newKey) external {
    require(msg.sender == identities[did].controller, "Unauthorized");
    require(newKey != address(0), "Invalid key");
    require(identities[did].activeKey != newKey, "Key unchanged");
    
    identities[did].activeKey = newKey;
    identities[did].keyRotationTime = block.timestamp;
    
    emit KeyRotated(did, newKey, block.timestamp);
}
```

**Grace Period**: After key rotation, the old key remains valid for 1 hour, allowing recovery if the rotation was a mistake.

#### Guardian Recovery with Timelock

An agent may designate guardians (threshold-m-of-n multisig recovery):

```solidity
function addGuardian(bytes32 did, address guardian) external {
    require(msg.sender == identities[did].controller, "Unauthorized");
    identities[did].guardians.push(guardian);
    identities[did].guardianThreshold = (identities[did].guardians.length + 1) / 2;
}

function initiateRecovery(bytes32 did, address newController) external {
    require(isGuardian(did, msg.sender), "Not a guardian");
    
    RecoveryRequest storage recovery = recoveryRequests[did];
    recovery.newController = newController;
    recovery.initiatedAt = block.timestamp;
    recovery.confirmations[msg.sender] = true;
    recovery.confirmationCount++;
    
    emit RecoveryInitiated(did, newController);
}

function executeRecovery(bytes32 did) external {
    RecoveryRequest storage recovery = recoveryRequests[did];
    
    require(
        block.timestamp >= recovery.initiatedAt + RECOVERY_DELAY,
        "Timelock not elapsed"
    );
    require(
        recovery.confirmationCount >= identities[did].guardianThreshold,
        "Insufficient confirmations"
    );
    
    identities[did].controller = recovery.newController;
    identities[did].activeKey = recovery.newController;
    delete recoveryRequests[did];
    
    emit RecoveryExecuted(did, recovery.newController);
}
```

**Recovery Delay**: 24 hours (configurable per identity). This delay:
- Gives the legitimate controller time to notice and counter the recovery
- Prevents instant account takeover if a guardian is compromised
- Allows revocation of malicious guardians before recovery finalizes

#### Storage Layout

```solidity
struct Identity {
    address controller;          // Account that controls this identity
    address activeKey;           // Current signing key
    address[] guardians;         // Recovery guardians
    uint8 guardianThreshold;     // M-of-N threshold
    uint256 createdAt;           // Registration timestamp
    uint256 keyRotationTime;     // Last key rotation
    bool active;                 // Is identity active?
}

mapping(bytes32 => Identity) public identities;
mapping(bytes32 => RecoveryRequest) public recoveryRequests;
mapping(bytes32 => uint256) public nonce;  // Replay protection
```

### 4.2 Schema Registry

Schemas define the structure and semantics of attestations.

#### Content-Addressable Schemas

Schemas are stored on IPFS with content-addressing:

```typescript
const schema = {
  name: "KYC",
  description: "Know Your Customer verification",
  fields: [
    { name: "id_verified", type: "bool" },
    { name: "country", type: "string" },
    { name: "accredited_investor", type: "bool" }
  ]
};

const schemaHash = keccak256(encode(schema));
const ipfsHash = await ipfs.add(JSON.stringify(schema));
// ipfsHash = "QmXxxx..."

// Register on-chain
await schemaRegistry.registerSchema(schemaHash, ipfsHash);
```

Benefits:
- **Immutability**: Content hash prevents tampering
- **Bandwidth**: Schema fetched on-demand, not stored on-chain
- **Versioning**: Each version gets new content hash
- **Discoverability**: IPFS enables schema distribution

#### Versioning and Deprecation

```solidity
struct SchemaVersion {
    bytes32 ipfsHash;          // IPFS content hash
    uint256 registeredAt;      // Timestamp
    SchemaStatus status;       // ACTIVE, DEPRECATED, REVOKED
    string deprecationReason;  // Why deprecated
}

mapping(bytes32 schemaUID => SchemaVersion[]) public schemaVersions;

function registerSchemaVersion(
    bytes32 schemaUID,
    bytes32 ipfsHash
) external {
    schemaVersions[schemaUID].push(SchemaVersion({
        ipfsHash: ipfsHash,
        registeredAt: block.timestamp,
        status: SchemaStatus.ACTIVE,
        deprecationReason: ""
    }));
}

function deprecateSchema(
    bytes32 schemaUID,
    uint256 versionIndex,
    string memory reason
) external {
    require(isSchemaAdmin(msg.sender), "Unauthorized");
    schemaVersions[schemaUID][versionIndex].status = SchemaStatus.DEPRECATED;
    schemaVersions[schemaUID][versionIndex].deprecationReason = reason;
    
    emit SchemaDeprecated(schemaUID, versionIndex, reason);
}
```

#### IPFS Integration

Schema data is never stored on-chain. Attestations reference the schema IPFS hash:

```solidity
struct Attestation {
    bytes32 uid;
    address issuer;
    bytes32 subject;           // DID hash (not stored)
    bytes32 schemaUID;
    bytes32 dataHash;          // Hash of off-chain data
    uint256 time;
    uint256 expirationTime;
    bool revoked;
}
```

When an application validates an attestation:
1. Fetch schema from IPFS: `ipfs.get(schemaUID.ipfsHash)`
2. Reconstruct data from subject: `client.getAttestationData(uid)`
3. Hash the data: `dataHash = keccak256(abi.encode(data))`
4. Verify: `attestations[uid].dataHash == dataHash`

### 4.3 Attestation Registry

Attestations are verifiable claims made by issuers about subjects.

#### UID Generation

Attestation UIDs are deterministic, derived from:
- Issuer address
- Schema UID
- Recipient/subject
- Nonce (to allow multiple attestations per issuer-subject-schema)

```solidity
function _computeUID(
    address issuer,
    bytes32 schemaUID,
    bytes32 subject,
    uint256 nonce
) internal pure returns (bytes32) {
    return keccak256(abi.encode(issuer, schemaUID, subject, nonce));
}
```

This enables:
- Collision-free unique identifiers
- Deterministic proof of attestation existence
- Offline UID computation (given issuer, schema, subject, nonce)

#### Issuer Model

Any address can issue attestations. However:
- **Issuer Reputation**: Issuer's reputation score affects attestation weight
- **Schema Admin**: Schema creators can restrict who can issue a schema
- **Issuer Revocation**: Individual issuer can be revoked by its reputation falling below threshold

#### Expiry Semantics

```solidity
struct Attestation {
    bytes32 uid;
    address issuer;
    bytes32 subject;           // DID
    bytes32 schemaUID;
    uint256 time;              // Issued timestamp
    uint256 expirationTime;    // Unix timestamp (0 = never expires)
    bytes32 dataHash;          // Hash of attestation data
    bool revoked;              // Manual revocation
}

function isValidAttestation(bytes32 uid) external view returns (bool) {
    Attestation storage att = attestations[uid];
    
    if (att.revoked) return false;
    if (att.expirationTime == 0) return true;  // Never expires
    
    return block.timestamp <= att.expirationTime;
}
```

**Expiry Enforcement**: 
- Applications must check expiry when validating attestations
- Expired attestations remain on-chain (for historical record) but return invalid
- Reputation scoring decays attestation contribution as expiry approaches

#### Batch Optimization

To reduce transaction costs, multiple attestations can be created in one transaction:

```solidity
function batchAttest(
    bytes32[] calldata schemaUIDs,
    bytes32[] calldata subjects,
    bytes[] calldata dataHashes,
    uint256[] calldata expirationTimes
) external {
    require(schemaUIDs.length == subjects.length, "Length mismatch");
    
    for (uint i = 0; i < schemaUIDs.length; i++) {
        bytes32 uid = _computeUID(msg.sender, schemaUIDs[i], subjects[i], nonce[msg.sender]++);
        
        attestations[uid] = Attestation({
            uid: uid,
            issuer: msg.sender,
            subject: subjects[i],
            schemaUID: schemaUIDs[i],
            time: block.timestamp,
            expirationTime: expirationTimes[i],
            dataHash: dataHashes[i],
            revoked: false
        });
        
        emit Attested(uid, msg.sender, subjects[i], schemaUIDs[i]);
    }
}
```

**Cost Savings**: Batch of 100 attestations costs ≈5x less than 100 individual transactions.

### 4.4 Delegation Registry

The Delegation Registry models hierarchical authority delegation.

#### Scope Bitmask Design

Capabilities are encoded as 256-bit bitmask, allowing up to 256 distinct capabilities:

```solidity
// Capability bits
uint256 constant CAP_TRANSFER = 1 << 0;     // 0x01
uint256 constant CAP_SWAP = 1 << 1;         // 0x02
uint256 constant CAP_LEND = 1 << 2;         // 0x04
uint256 constant CAP_BORROW = 1 << 3;       // 0x08
uint256 constant CAP_VOTE = 1 << 4;         // 0x10
uint256 constant CAP_DELEGATE = 1 << 5;     // 0x20
// ... up to 256 capabilities

function createDelegation(
    bytes32 delegatorDID,
    address delegateAddress,
    uint256 scope,              // Bitmask of capabilities
    uint256 chainId,
    uint256 expiryTime
) external {
    require(msg.sender == idRegistry.getController(delegatorDID), "Unauthorized");
    
    bytes32 delegationId = keccak256(abi.encode(
        delegatorDID, delegateAddress, chainId, nonce[delegatorDID]++
    ));
    
    delegations[delegationId] = Delegation({
        id: delegationId,
        delegator: delegatorDID,
        delegate: delegateAddress,
        scope: scope,
        chainId: chainId,
        expiryTime: expiryTime,
        createdAt: block.timestamp
    });
    
    emit DelegationCreated(delegationId, delegatorDID, delegateAddress, scope);
}

function hasCapability(
    bytes32 delegatorDID,
    address delegateAddress,
    uint256 capability
) external view returns (bool) {
    bytes32[] memory delegationIds = delegationsByDelegate[delegateAddress];
    
    for (uint i = 0; i < delegationIds.length; i++) {
        Delegation storage d = delegations[delegationIds[i]];
        
        if (d.delegator == delegatorDID &&
            d.chainId == block.chainid &&
            block.timestamp <= d.expiryTime &&
            (d.scope & capability) != 0) {
            return true;
        }
    }
    
    return false;
}
```

#### Chain-of-Authority

A delegation can specify that the delegate is itself authorized to delegate:

```solidity
uint256 constant CAP_DELEGATE = 1 << 5;

// Agent A delegates to Agent B with CAP_DELEGATE
await aip.delegation.create(agentA_did, agentB_addr, {
    scope: ['swap', 'delegate'],
    chainId: 1,
    expiryTime: futureTime
});

// Agent B can now delegate to Agent C
await aip.delegation.create(agentA_did, agentC_addr, {
    scope: ['swap'],
    chainId: 1,
    expiryTime: futureTime,
    parent: delegationIdFromAtoB  // Prove B has delegation authority
});
```

#### Expiry and Revocation

```solidity
function revokeDelegation(bytes32 delegationId) external {
    Delegation storage d = delegations[delegationId];
    require(msg.sender == idRegistry.getController(d.delegator), "Unauthorized");
    
    d.expiryTime = block.timestamp;  // Immediate expiry
    
    emit DelegationRevoked(delegationId, block.timestamp);
}

function isDelegationActive(bytes32 delegationId) external view returns (bool) {
    Delegation storage d = delegations[delegationId];
    return d.expiryTime > block.timestamp;
}
```

### 4.5 Revocation Registry

The Revocation Registry provides fast global revocation using Merkle trees.

#### Global Revocation

Any address (issuer, subject, or arbiter) can revoke an attestation or delegation:

```solidity
mapping(bytes32 => bool) public revoked;  // UID => is revoked

function revoke(bytes32 uid) external {
    require(canRevoke(msg.sender, uid), "Unauthorized to revoke");
    revoked[uid] = true;
    emit Revoked(uid, msg.sender);
}

function canRevoke(address account, bytes32 uid) internal view returns (bool) {
    // Issuer can always revoke
    if (attestations[uid].issuer == account) return true;
    
    // Subject controller can revoke
    if (idRegistry.getController(attestations[uid].subject) == account) return true;
    
    // Arbiter (governance) can revoke (if configured)
    if (isArbiter[account]) return true;
    
    return false;
}
```

#### Batch Efficiency

Revocations are recorded in a bitmap for efficient querying:

```solidity
// Revocations bitmap: block_number => attestation_index => revoked_bit
mapping(uint256 blockNumber => mapping(uint256 index => uint256 bitmap)) 
    public revocationBitmap;

function batchRevoke(bytes32[] calldata uids) external {
    for (uint i = 0; i < uids.length; i++) {
        bytes32 uid = uids[i];
        Attestation storage att = attestations[uid];
        
        require(canRevoke(msg.sender, uid), "Unauthorized");
        
        // Record in bitmap
        uint256 blockNum = att.blockNumber;
        uint256 bitmapIndex = att.indexInBlock / 256;
        uint256 bitPosition = att.indexInBlock % 256;
        
        revocationBitmap[blockNum][bitmapIndex] |= (1 << bitPosition);
        revoked[uid] = true;
    }
    
    emit BatchRevoked(uids);
}
```

#### Revocation Latency Analysis

Revocation finality: ≤12 seconds (one Ethereum block)

- **Local confirmation**: 1 block (≈12 seconds)
- **Safe confirmation**: 12 blocks (≈2.5 minutes, economic finality)
- **Cross-chain**: propagates via indexer (≤60 seconds for secondary chains)

---

## 5. Identity Lifecycle

### 5.1 Identity Creation

```
┌─ Agent generates DID
│
├─ Agent calls: didRegistry.register(agent_address)
│
├─ Smart contract validates:
│   └─ Signature is valid
│   └─ Nonce prevents replay
│
├─ Smart contract stores:
│   └─ DID => { controller: agent, key: agent, guardians: [], ... }
│
├─ Smart contract emits event:
│   └─ IdentityRegistered(did, controller, activeKey)
│
├─ Indexer processes event:
│   └─ INSERT INTO identities (did, controller, active_key, created_at)
│   └─ reputation[did] = 0  (bootstrapping)
│
├─ Resolver responds:
│   └─ GET /identity/{did} → {did, controller, reputation: 0}
│
└─ Agent uses DID in delegations, attestations, etc.
```

**Transaction**:
```javascript
const tx = await didRegistry.register(agentAddress);
const receipt = await tx.wait();
const event = receipt.events.find(e => e.event === 'IdentityRegistered');
const did = event.args.did;
```

### 5.2 Key Rotation

```
┌─ Agent's key is compromised (detected via activity monitoring)
│
├─ Agent calls: didRegistry.rotateKey(did, newKeyAddress)
│
├─ Smart contract validates:
│   └─ msg.sender == identities[did].controller
│   └─ newKey != oldKey
│
├─ Smart contract updates:
│   ├─ identities[did].activeKey = newKey
│   └─ identities[did].keyRotationTime = now
│
├─ Grace period starts:
│   └─ Old key remains valid for 1 hour (for recovery)
│   └─ New key is immediately valid
│
├─ Smart contract emits event:
│   └─ KeyRotated(did, newKey, timestamp)
│
├─ Indexer processes event:
│   └─ UPDATE identities SET active_key = newKey WHERE did = ...
│   └─ UPDATE identities SET key_rotation_time = timestamp WHERE did = ...
│
└─ Client makes future transactions with new key
```

**Recovery if rotation was a mistake**:
```javascript
// Within 1 hour of rotation
const tx = await didRegistry.rotateKey(did, originalKey);
```

### 5.3 Recovery

```
Scenario: Controller key lost or compromised

┌─ Agent detects loss (key not in possession)
│
├─ Guardian initiates recovery:
│   └─ didRegistry.initiateRecovery(did, newControllerAddress)
│   └─ Recovery request stored with timestamp
│   └─ Guardian votes YES
│
├─ Other guardians vote:
│   └─ Each calls: didRegistry.confirmRecovery(did, confirmationIndex)
│   └─ Confirmations tracked
│
├─ Wait for timelock:
│   └─ recoveryDelay = 24 hours (configured at registration)
│   └─ recoveryRequests[did].initiatedAt + 24h <= now?
│
├─ Check threshold:
│   └─ confirmationCount >= guardianThreshold?
│
├─ Execute recovery:
│   └─ didRegistry.executeRecovery(did)
│   └─ Controller is changed to newControllerAddress
│   └─ Recovery request deleted
│   └─ Event: RecoveryExecuted(did, newController)
│
├─ Indexer processes event:
│   └─ UPDATE identities SET controller = newController WHERE did = ...
│
└─ Agent now controls DID with new key
```

**During 24-hour recovery window**:
- Original controller can revoke recovery: `didRegistry.cancelRecovery(did)`
- Original controller can rotate key to a secure key
- Guardians can adjust voting

### 5.4 Delegation

```
┌─ Agent A wants to delegate swap authority to Agent B
│
├─ Agent A calls:
│   └─ delegationRegistry.createDelegation({
│        delegator: agentA_did,
│        delegate: agentB_addr,
│        scope: ['swap'],        // Capability bitmask
│        chainId: 1,
│        expiryTime: futureTime
│      })
│
├─ Smart contract validates:
│   └─ msg.sender == getController(agentA_did)
│   └─ expiryTime > now
│   └─ scope is valid bitmask
│
├─ Smart contract stores:
│   └─ delegationId => { delegator, delegate, scope, chainId, expiryTime }
│   └─ delegationsByDelegate[agentB_addr].push(delegationId)
│
├─ Smart contract emits:
│   └─ DelegationCreated(delegationId, agentA_did, agentB_addr, scope)
│
├─ Indexer processes:
│   └─ INSERT INTO delegations (delegation_id, delegator_did, delegate, scope, chain_id, expiry_time)
│
├─ Agent B can now act on behalf of Agent A:
│   └─ Calls: delegationRegistry.hasCapability(agentA_did, agentB_addr, CAP_SWAP)
│   └─ Returns: true (if delegation active)
│
└─ When expired or revoked:
   └─ hasCapability returns false
   └─ Agent B can no longer act on behalf
```

### 5.5 Deactivation

```
┌─ Agent wants to permanently revoke identity (rare)
│
├─ Agent calls: didRegistry.deactivate(did)
│
├─ Smart contract validates:
│   └─ msg.sender == controller
│
├─ Smart contract updates:
│   └─ identities[did].active = false
│   └─ All delegations from this DID expire
│   └─ All attestations marked inactive
│
├─ Smart contract emits:
│   └─ IdentityDeactivated(did)
│
├─ Indexer processes:
│   └─ UPDATE identities SET active = false WHERE did = ...
│   └─ UPDATE delegations SET expiry_time = now WHERE delegator_did = ...
│
└─ Identity resolution returns: {status: "deactivated"}
```

---

## 6. Reputation Computation Model

Reputation is a quantitative trust score reflecting an agent's behavior history and social proof.

### 6.1 Reputation Graph Structure

```
Agent (DID)
    ├─ Incoming Attestations
    │  ├─ Attestation 1 (issuer A, score +10)
    │  ├─ Attestation 2 (issuer B, score +15)
    │  └─ Attestation 3 (issuer C, score +8)
    │
    ├─ Delegations Received
    │  ├─ From DID X (score +5)
    │  └─ From DID Y (score +3)
    │
    ├─ Activity History
    │  ├─ Txns in last 30 days: 50 (+2)
    │  ├─ Consistency (no gaps): (+3)
    │  └─ Never compromised: (+5)
    │
    └─ Outgoing Delegations
       ├─ To Agent D (indicates trust in D)
       └─ To Agent E (indicates trust in E)
```

### 6.2 Scoring Strategies

#### 6.2.1 Attestation Score

```
attestation_score = Σ(weighted_issuer_score × attestation_weight)

where:
  weighted_issuer_score = issuer_reputation * issuer_trust
  issuer_trust = 1.0 if issuer_reputation >= ISSUER_MIN
                0.5 if issuer_reputation < ISSUER_MIN
  attestation_weight = base_weight * freshness_decay * validity_factor

  base_weight = schema-specific (KYC=+15, LTV=+5, Activity=+1)
  freshness_decay = e^(-0.1 * days_since_issuance)  // Exponential decay
  validity_factor = 1.0 if not revoked, 0.0 if revoked
```

**Example**:
- Issuer with 80 reputation issues attestation (base_weight=15): +12 points
- Issuer with 20 reputation issues same attestation: +7.5 points (discounted 50%)
- Attestation issued 30 days ago: +10.1 points (decay factor ≈ 0.67)

#### 6.2.2 Delegation Score

```
delegation_score = Σ(count_delegations * delegation_weight)

where:
  delegation_weight = min(5, incoming_delegation_count) / 10

Impact:
  0 delegations: +0
  1 delegation: +0.5
  2 delegations: +1.0
  5+ delegations: +2.5
```

**Rationale**: Receiving delegations indicates other agents trust you. However, the impact is capped to prevent gaming.

#### 6.2.3 Activity Score

```
activity_score = consistency_score + on_chain_frequency + zero_compromise

where:
  consistency_score = 5 if (txn_count > 10 AND days_active > 30)
                      else min(5, txn_count / 10) + min(5, days_active / 30)
  
  on_chain_frequency = min(3, recent_txn_count_7d / 10)
  
  zero_compromise = 5 if identity never compromised
                    0 otherwise
```

**Example**:
- Agent with 50 transactions over 60 days, 10 txns in last 7 days, never compromised
- consistency_score = 5 + min(3, 50/10) + min(5, 60/30) = 5 + 3 + 2 = 10
- on_chain_frequency = min(3, 10/10) = 1
- zero_compromise = 5
- activity_score = 10 + 1 + 5 = 16 (max capped at 20)

### 6.3 Weighted Aggregation

Final reputation score = (attestation_score × 0.4) + (delegation_score × 0.3) + (activity_score × 0.3)

```python
def compute_reputation(did: str) -> int:
    attestations = get_valid_attestations(did)
    delegations = get_delegations_to(did)
    activity = get_activity_history(did)
    
    att_score = compute_attestation_score(attestations)      # 0-40
    del_score = compute_delegation_score(delegations)        # 0-25
    act_score = compute_activity_score(activity)             # 0-20
    
    total = (att_score * 0.4) + (del_score * 0.3) + (act_score * 0.3)
    
    # Clamp to 0-100
    return min(100, max(0, round(total)))
```

### 6.4 Merkle Proof Generation

To enable on-chain verification, reputation is published as Merkle tree:

```python
def generate_reputation_merkle_tree():
    # Get all active DIDs with scores
    dids_and_scores = [
        (did_1, score_1),
        (did_2, score_2),
        ...
        (did_n, score_n)
    ]
    
    # Sort lexicographically for determinism
    dids_and_scores.sort(key=lambda x: x[0])
    
    # Create leaves
    leaves = [
        keccak256(abi.encode(did, score))
        for (did, score) in dids_and_scores
    ]
    
    # Build Merkle tree
    tree = MerkleTree(leaves)
    
    return {
        'root': tree.root,
        'proof_for_did': tree.get_proof(index_of_did),
        'leaves': leaves
    }
```

**On-chain verification**:
```solidity
function verifyReputationProof(
    bytes32 did,
    uint256 score,
    bytes32[] memory proof,
    bytes32 merkleRoot
) public pure returns (bool) {
    bytes32 leaf = keccak256(abi.encode(did, score));
    return verify(proof, merkleRoot, leaf);
}
```

### 6.5 Tier Classification

Scores are mapped to tiers for user-facing display:

```
Tier      Score Range   Interpretation
─────────────────────────────────────
Unknown   0-20          New agent, unproven
Bronze    20-40         Established but limited history
Silver    40-60         Good track record
Gold      60-80         Trusted, multiple issuers
Platinum  80-100        Highly trusted, strong community reputation
```

**Usage**:
- Paymaster sponsorship: requires ≥ Gold tier
- Lending protocol collateral discount: Silver = 5%, Gold = 10%
- DAO voting: Bronze members = 1x voting power, Platinum = 2x

### 6.6 Score Freshness and Caching

Scores are computed on-demand but cached for efficiency:

```
GET /reputation/{did}
  ├─ Check cache
  │  ├─ If fresh (< 5 min): return cached score
  │  └─ If stale: recompute and refresh
  │
  ├─ Recomputation:
  │  ├─ Query attestations from DB
  │  ├─ Query delegations from DB
  │  ├─ Query activity from logs
  │  └─ Apply scoring formula (O(n log n) with n = number of attestations)
  │
  ├─ Cache result for 5 minutes
  │  └─ Redis key: `rep:{did}` with TTL=300s
  │
  └─ Return score with freshness metadata
     ├─ score: 75
     ├─ lastUpdate: "2026-02-20T10:25:00Z"
     ├─ age: 300 seconds
     └─ staleness: false
```

**Batch Computation**: Reputation for multiple DIDs computed in parallel:

```python
def batch_reputation(dids: List[str]) -> Dict[str, int]:
    # Check cache hits
    cached = {did: cache.get(f"rep:{did}") for did in dids if f"rep:{did}" in cache}
    uncached = [did for did in dids if did not in cached]
    
    # Compute uncached in parallel
    scores = parallel_map(compute_reputation, uncached)
    
    # Cache new results
    for did, score in zip(uncached, scores):
        cache.set(f"rep:{did}", score, ttl=300)
    
    # Merge results
    return {**cached, **dict(zip(uncached, scores))}
```

---

## 7. Trust and Security Assumptions

### 7.1 Trust Boundaries

```
┌─────────────────────────────────────────┐
│  TRUST BOUNDARY 1: Blockchain           │
│  ├─ Smart contracts are correct         │
│  ├─ Events are immutable                │
│  ├─ Consensus is final (12+ blocks)     │
│  └─ Assumption: Honest majority of miners
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  TRUST BOUNDARY 2: Indexer              │
│  ├─ Events are indexed correctly        │
│  ├─ State machine is deterministic      │
│  ├─ No data loss or corruption          │
│  └─ Assumption: Operator is honest
│     (Or: run your own indexer)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  TRUST BOUNDARY 3: IPFS                 │
│  ├─ Content hashes are correct          │
│  ├─ Schemas are not modified            │
│  ├─ Data is retrievable                 │
│  └─ Assumption: Content-addressed
│     guarantee (hash verification)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  UNTRUSTED COMPONENTS                   │
│  ├─ Issuer reputation (can be attacked) │
│  ├─ Resolver API (can serve stale data) │
│  ├─ Off-chain computation results       │
│  └─ Note: All verifiable on-chain       │
└─────────────────────────────────────────┘
```

### 7.2 Threat Model

**Attacker Capabilities**:
1. Can create unlimited identities (cost: ≥ 0.1 ETH per identity)
2. Can control multiple agent addresses
3. Can compromise a single agent's key (but not guardian multisig)
4. Can corrupt the indexer database (if operating indexer)
5. Cannot forge blockchain events (requires 51% attack)
6. Cannot modify immutable smart contract code (unless contract is upgradeable)

**Attacker Goals**:
1. Deceive applications into thinking agent is trustworthy (Sybil attack)
2. Drain value from victim agents via stolen keys
3. Block an agent's recovery (denial of service)
4. Forge reputation scores
5. Prevent reputation verification (censorship)

### 7.3 Key Compromise

#### Detection

Compromise is detected through:
1. **Activity Monitoring**: Unusual transaction patterns
2. **Guardian Alerts**: Guardians can be notified of suspicious activity
3. **Self-Report**: Agent can initiate key rotation
4. **Rate Limiting**: Too many transactions in short time triggers alert

```python
def detect_compromise(did: str) -> bool:
    recent_txns = get_txns(did, last_24h=True)
    historical_avg = get_txn_average(did, window_days=30)
    
    # 10x spike in activity
    if len(recent_txns) > 10 * historical_avg:
        return True
    
    # Transactions from unusual chains/protocols
    protocols = set(t.protocol for t in recent_txns)
    if len(protocols) > 5 * historical_protocol_count:
        return True
    
    # Large dollar amount transactions
    total_value = sum(t.value for t in recent_txns)
    if total_value > 100 * historical_avg_txn_value:
        return True
    
    return False
```

#### Recovery Window

```
Time 0:   Key compromised (attacker acts)
          └─ Suspicious activity triggered

Time ~5m: Agent/guardian notices alert
          └─ Initiates recovery or key rotation
          └─ Old key grace period starts (1 hour)

Time 5m-60m: Recovery window
          ├─ Legitimate controller can cancel recovery
          ├─ Legitimate controller can override with old key
          └─ Guardians can vote to change controller

Time 60m: Grace period expires
          └─ Old key no longer valid
          └─ Recovery finalizes if guardians voted

Time 24h: Recovery timelock expires
          └─ New controller takes effect
          └─ Recovery process complete
```

#### Guardian Threshold

Recovery requires m-of-n guardian signatures. Recommended configurations:

```
n=1: Single guardian (not recommended)
n=2, m=1: Either guardian can recover (useful for solo agents with backup)
n=3, m=2: Majority of 3 (good security/usability tradeoff)
n=5, m=3: Majority of 5 (high security, slow recovery)
```

**Impact of m-of-n compromise**:
- If all guardians compromised: recovery can be abused, but timelock still provides window
- If m-1 guardians compromised: legitimate recovery still requires m-th guardian

### 7.4 Sybil Attacks

#### Cost Analysis

Cost for attacker to create N Sybil agent identities:

```
Cost = N * (identity_creation_fee + attestation_cost)

where:
  identity_creation_fee = 0 (registration is free, only gas)
  attestation_cost = gas_cost + issuer_fee (varies by schema)
  typical_gas_cost = 60k gas ≈ $2 (at $30 gwei)
  typical_issuer_fee = $1-100 depending on schema

Minimum cost per identity: ~$2 (just registration)
Realistic cost to gain credible reputation: $50-500 per identity
  (multiple attestations from reputable issuers)

Economic break-even:
If agent can extract >$500 per Sybil identity, Sybil farming is profitable.
Most applications set transaction limits lower than this.
```

#### Graph-Based Detection

Sybil detection uses clustering algorithms to identify suspicious account groups:

```python
def detect_sybil_cluster(agents: List[str]) -> List[List[str]]:
    """
    Find clusters of agents with suspicious similarity patterns.
    """
    # Build relationship graph
    graph = defaultdict(list)
    
    for agent in agents:
        # Shared attestation issuers
        issuer_set_a = get_issuers(agent)
        
        for other_agent in agents:
            if agent == other_agent:
                continue
            
            issuer_set_b = get_issuers(other_agent)
            
            # If >80% issuer overlap, likely Sybil
            overlap = len(issuer_set_a & issuer_set_b) / len(issuer_set_a | issuer_set_b)
            if overlap > 0.8:
                graph[agent].append(other_agent)
    
    # Find connected components (clusters)
    clusters = find_connected_components(graph)
    
    return clusters
```

**Mitigations**:
1. **Freshness Penalties**: Attestations from agents created in same hour have reduced weight
2. **Issuer Diversification**: Reputation weighted by issuer diversity
3. **Time Locks**: New identities have reputation caps for first 30 days

### 7.5 Malicious Issuer

An issuer can attempt to:
- Issue false attestations
- Flood an agent with low-value attestations to game scoring
- Collude with Sybil cluster to cross-attest

#### Mitigations

**Schema-Level Trust**:
```solidity
mapping(bytes32 => IssuerWhitelist) public schemaIssuers;

function setSchemaIssuerWhitelist(
    bytes32 schemaUID,
    address[] calldata approvedIssuers
) external {
    require(msg.sender == schemaAdmin[schemaUID], "Unauthorized");
    schemaIssuers[schemaUID] = IssuerWhitelist(approvedIssuers);
}

function canIssue(bytes32 schemaUID, address issuer) external view returns (bool) {
    // If no whitelist, anyone can issue
    if (schemaIssuers[schemaUID].approvedIssuers.length == 0) return true;
    
    // Check whitelist
    return schemaIssuers[schemaUID].contains(issuer);
}
```

**Issuer Reputation Bootstrapping**:
```python
def compute_issuer_weight(issuer: str) -> float:
    """
    Compute how much an issuer's attestations are weighted.
    """
    issuer_score = get_reputation(issuer)  # Issuers are agents too!
    
    if issuer_score >= 80:  # Platinum
        return 1.0
    elif issuer_score >= 60:  # Gold
        return 0.9
    elif issuer_score >= 40:  # Silver
        return 0.6
    elif issuer_score >= 20:  # Bronze
        return 0.3
    else:  # Unknown
        return 0.1
```

**Attest Spam Detection**:
```python
def detect_attestation_spam(did: str, issuer: str) -> bool:
    """
    Detect if issuer is flooding agent with attestations.
    """
    attestations = get_attestations(did, issuer=issuer, window_hours=24)
    
    # More than 10 attestations per day from same issuer is suspicious
    if len(attestations) > 10:
        return True
    
    # Check if attestations are from Sybil cluster
    recent_issuers = get_recent_attestation_issuers(did)
    if len(recent_issuers) == 1:  # Only one issuer in last 24h
        return True
    
    return False
```

### 7.6 Indexer Manipulation

An attacker controlling the indexer could:
- Serve stale reputation scores
- Drop events (claim they don't exist)
- Reorder events (change replay order)
- Modify stored data

#### Mitigations

**Event Logs as Ground Truth**:
```python
def verify_indexer_state(indexer_state: Dict) -> bool:
    """
    Verify indexer state matches blockchain events.
    """
    # Replay all events from chain
    events = rpc_client.get_events(contract_addresses, from_block=0)
    events.sort(key=lambda e: (e.block_number, e.log_index))
    
    # Apply deterministic state machine
    true_state = {}
    for event in events:
        true_state = apply_event(true_state, event)
    
    # Compare with indexer state
    return true_state == indexer_state
```

**Deterministic Replay**:
The indexer state machine is deterministic—given the same events, any two indexers should compute identical state:

```typescript
// Indexer A processes events at block 1000
state_a = applyEvent(state_a, event);
root_a = merkleRoot(state_a);

// Indexer B processes same event
state_b = applyEvent(state_b, event);
root_b = merkleRoot(state_b);

assert root_a == root_b;  // Should always be true
```

**Merkle Proofs as Verification**:
```solidity
// Contract can verify indexer claim without trusting indexer
bytes32 claimedRoot = indexer.getStateRoot();
bytes32 recomputedRoot = compute_merkle_root(local_events);

if (claimedRoot != recomputedRoot) {
    // Indexer is lying!
    indexer.slashBond();
}
```

### 7.7 Smart Contract Attack Vectors

#### Reentrancy

```solidity
// VULNERABLE
function attestAndPay(bytes32 subject, uint256 amount) external {
    // 1. Make external call
    (bool success, ) = attester.call("");
    require(success);
    
    // 2. Update state (reentrancy window)
    attestations[subject] = Attestation(...);
}

// SAFE
function attestAndPay(bytes32 subject, uint256 amount) external {
    // 1. Update state first
    attestations[subject] = Attestation(...);
    
    // 2. External call last
    (bool success, ) = attester.call("");
    require(success);
}
```

**AIP Mitigation**: 
- Use Checks-Effects-Interactions pattern
- All external calls are at end of function
- State updated before event emission

#### Replay Attacks

```solidity
// VULNERABLE
function rotate Key(bytes32 did, address newKey, bytes memory signature) external {
    require(recoverSigner(signature, did, newKey) == activeKey[did]);
    activeKey[did] = newKey;
}
// Attack: Attacker replays transaction on another chain

// SAFE
function rotateKey(bytes32 did, address newKey, uint256 nonce, bytes memory signature) external {
    require(nonce == nextNonce[did], "Invalid nonce");
    require(recoverSigner(signature, did, newKey, nonce, block.chainid) == activeKey[did]);
    
    nextNonce[did]++;
    activeKey[did] = newKey;
}
```

**AIP Mitigation**:
- Nonce tracking per identity
- Chain ID included in signature

#### Front-Running Key Rotation

```
Scenario:
1. Agent A sends tx to rotate key to K1
2. Attacker sees tx in mempool, frontrunns with K0->K2
3. Agent's transaction executes after, rotates K2->K1
4. Attacker now controls the key!
```

**Mitigation**: Grace period on old key
- Even if attacker rotates to their key, old key remains valid for 1 hour
- Agent can recover with old key

---

## 8. Privacy Model

### 8.1 On-Chain Privacy Tradeoffs

AIP makes privacy tradeoffs to enable efficient verification:

```
                Privacy         Efficiency
                ───────         ──────────
Full privacy      HIGH            LOW
AIP design       MEDIUM           HIGH
No privacy        LOW             HIGH

AIP Design Tradeoffs:
- On-chain: Only UIDs visible (no issuer, schema, or data)
- Off-chain: Full data accessible with UID (no encryption)
- Application: Application decides what to share
```

### 8.2 Selective Disclosure

```python
# Issuer issues attestation
att = Attestation(
    issuer="oracle.example",
    subject=agent_did,
    schema="KYC",
    data={
        "id_verified": True,
        "country": "US",
        "accredited": True
    }
)

# On-chain, only stored
uid = hash(att)

# Off-chain, full attestation stored
attestation_storage.put(uid, att)

# Agent selectively discloses
client.getAttestationData(uid)
// Returns full data (no privacy)

// Future: client.getAttestationProof(uid, "id_verified")
// Returns zk-proof that "id_verified == true" without revealing other fields
```

### 8.3 Future: ZK-based Credential Presentation

Future versions will support zero-knowledge proofs:

```solidity
// zkCircuit: Prove reputation >= 50 without revealing exact score
function verifyReputationProof(
    bytes32 did,
    uint256 minScore,
    bytes calldata zkProof
) external view returns (bool) {
    // Verify ZK proof
    // Proves: reputation[did] >= minScore
    // Without revealing: reputation[did]
    
    return zkVerifier.verify(zkProof);
}
```

### 8.4 Data Minimization

AIP follows data minimization principles:

1. **Only store minimum required data on-chain**: UIDs, not full data
2. **Purge outdated data**: Expired attestations can be archived
3. **Opt-in disclosure**: Agents choose what to share
4. **Access controls**: Schemas can specify who can read data

---

## 9. Interoperability

### 9.1 ERC-4337 Account Abstraction

AIP integrates natively with ERC-4337:

```solidity
// Paymaster can check agent reputation before sponsoring
contract AgentIdentityPaymaster is BasePaymaster {
    IAgentIdentity public aip;
    
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (bytes memory context, uint256 validationData) {
        // Extract agent DID from UserOperation
        bytes32 agentDID = extractDID(userOp.callData);
        
        // Check reputation
        uint256 score = aip.getReputation(agentDID);
        require(score >= 50, "Insufficient reputation");  // Gold tier minimum
        
        // Sponsor transaction
        return ("", 0);
    }
}
```

**Session Keys with Delegation**:
```typescript
// Agent A creates session key for Agent B (with delegation)
const sessionKey = agent_b_address;
const delegation = await aip.delegation.create({
    delegator: agent_a_did,
    delegate: sessionKey,
    scope: ['swap'],
    chainId: 1,
    expiryTime: Date.now() + 1_hour
});

// Session key operation
const op = {
    sender: sessionKeyAddress,
    data: swapCall,
    // ... other fields
};

// Session key sign transaction
const signature = agent_b.signUserOp(op);

// Paymaster verifies delegation
require(
    aip.delegation.hasCapability(agent_a_did, sessionKey, CAP_SWAP),
    "No capability"
);

// Sponsor transaction
paymaster.sponsorUserOp(op);
```

### 9.2 Safe Smart Accounts

AIP provides a Safe module for reputation-gated operations:

```solidity
contract AgentIdentityModule is Module {
    IAgentIdentity public aip;
    Safe public safe;
    
    // Safe can require minimum reputation for certain operations
    modifier requireReputation(bytes32 did, uint256 minScore) {
        require(aip.getReputation(did) >= minScore, "Insufficient reputation");
        _;
    }
    
    function executeIfReputable(
        bytes32 did,
        address to,
        uint256 value,
        bytes calldata data
    ) external requireReputation(did, 60)  {  // Gold tier
        safe.executeTransaction(to, value, data);
    }
}
```

### 9.3 Ethereum Attestation Service (EAS)

AIP can integrate with EAS for attestation storage:

```typescript
// Use EAS as attestation backend
class EASAttestationProvider {
    constructor(public eas: EAS) {}
    
    async attest(subject: string, schema: string, data: any) {
        // Store via EAS
        const uid = await this.eas.attest({
            schema: schemaUID,
            data: {
                recipient: subject,
                expirationTime: expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data: encodeData(data)
            }
        });
        
        // Index in AIP
        await aip_indexer.processEASAttestation(uid);
        
        return uid;
    }
}
```

### 9.4 Ceramic Network / Decentralized Storage

Schemas and attestation data can be stored on Ceramic:

```typescript
// Store schema on Ceramic
const ceramicStream = await ceramic.createStream('tile', {
    content: {
        type: 'schema',
        name: 'KYC',
        fields: [...]
    }
});

// Reference in AIP
await aip.schema.register({
    uid: schemaUID,
    ceramic_stream_id: ceramicStream.id
});

// Resolver can fetch from Ceramic
const schema = await ceramic.loadStream(streamId);
```

### 9.5 W3C DID Core Specification Alignment

AIP identities are W3C DID compatible:

```json
{
  "did": "did:aip:0x1234567890abcdef",
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/v2"
  ],
  "publicKey": [
    {
      "id": "did:aip:0x1234...#key-1",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "0x...",
      "publicKeyHex": "..."
    }
  ],
  "authentication": [
    "did:aip:0x1234...#key-1"
  ],
  "service": [
    {
      "id": "did:aip:0x1234...#resolver",
      "type": "AgentIdentityResolver",
      "serviceEndpoint": "https://resolver.example.com/did/..."
    }
  ]
}
```

---

## 10. ERC-4337 Integration Model

### Session Keys as Delegations

```
Agent A wants to enable Agent B to swap without per-transaction approval

1. Agent A creates session key in Safe Account Abstraction
   └─ sessionKey = Agent B's address
   └─ validUntil = timestamp

2. Agent A creates AIP delegation
   └─ delegator: agent_a_did
   └─ delegate: sessionKey
   └─ scope: CAP_SWAP
   └─ expiryTime: validUntil

3. Agent B initiates transaction
   └─ UserOperation created
   └─ Signed by sessionKey
   └─ Includes swapCall

4. Paymaster verifies
   └─ Checks: aip.hasCapability(agent_a_did, sessionKey, CAP_SWAP)
   └─ Returns: true
   └─ Sponsors transaction

5. Bundle incl in block
   └─ sessionKey (Agent B) executes swap
   └─ On behalf of Agent A
```

### Reputation-Based Sponsorship

```
Paymaster decision tree:

GET /reputation/{did}
  ├─ score >= 80: SPONSOR (Platinum)
  ├─ score >= 60: SPONSOR with limits (Gold)
  │  └─ Max 10 ETH per block
  │  └─ Max 10 transactions per hour
  ├─ score >= 40: SPONSOR with strict limits (Silver)
  │  └─ Max 1 ETH per block
  │  └─ Max 1 transaction per hour
  └─ score < 40: REJECT (Bronze/Unknown)
```

### Agent Action → Attestation Flow

```
1. Agent B executes swap via Session Key
2. Swap completes successfully
3. Protocol emits event: SwapExecuted(agent_b, amount, token)
4. Off-chain service listens to events
5. Service creates attestation:
   {
     issuer: protocol.address,
     subject: agent_a_did,
     schema: "SwapActivity",
     data: {
       delegate: agent_b,
       amount: amount,
       token: token,
       success: true
     }
   }
6. Attestation recorded via EAS
7. Indexer processes attestation
8. Agent A's reputation score updated (+activity points)
```

---

## 11. Attack Analysis (Detailed)

### 11.1 Key Compromise Attack

**Attack Vector**:
1. Attacker steals private key of Agent A
2. Attacker gains control of Agent A's active key
3. Attacker can now:
   - Create arbitrary delegations
   - Revoke existing delegations
   - Transfer assets
   - Take out loans using reputation

**Detection**:
- Unusual transaction patterns (high frequency, large amounts)
- Guardian monitoring
- Agent self-detection and immediate action

**Guardian Recovery Flow**:
```
Hour 0:     Key stolen, attacker acts
Hour 0.5:   Agent detects compromise
Hour 0.5:   Agent initiates key rotation to new key
            └─ Old key retains validity for 1 hour
Hour 1:     Key rotation complete
            └─ Old key now invalid
            └─ New key active

Alternative path (if agent loses control completely):
Hour 0:     Key stolen, attacker acts
Hour 2:     Guardian detects unusual activity
Hour 2:     Guardian initiates recovery (requires m-of-n signatures)
Hour 2.5:   Guardians confirm recovery
Hour 26.5:  Recovery timelock expires
Hour 26.5:  New controller takes effect
```

**Impact Mitigation**:
- Attacker can only act for ~1 hour during grace period
- Can only act on chains where identities are established
- Reputation doesn't transfer, so Sybil attacks are ineffective
- Delegations can be revoked once legitimate controller regains access

### 11.2 Sybil Attack via Agent Farms

**Attack Vector**:
1. Attacker creates 1,000 agent identities
2. Identities attest each other to build false reputation
3. Attacker rents out identities to low-reputation agents
4. Low-reputation agents now appear trustworthy

**Economic Analysis**:
```
Cost per identity: 0.02 ETH (gas) + attestations
Cost of 1,000 identities: 20 ETH ≈ $60,000

Revenue per rented identity (assuming lending):
- Low-reputation agent borrows 100 ETH at 10% APY
- Fee: 10 ETH per year
- Revenue from 1,000 identities: 10,000 ETH per year = $30M

Break-even: ~1 week
Conclusion: Without strong mitigations, Sybil is profitable.
```

**Detection Heuristics**:
```python
def is_sybil_farm(agent: str) -> float:
    """
    Returns Sybil score (0.0 = legitimate, 1.0 = certain Sybil)
    """
    
    score = 0.0
    
    # 1. Age check: new identities are suspect
    age_days = (now - agent.created_at).days
    if age_days < 7:
        score += 0.3  # New identity
    if age_days < 30:
        score += 0.2  # Very recent
    
    # 2. Issuer homogeneity: cross-attestation ring
    issuers = get_attestation_issuers(agent)
    if len(issuers) == 1:
        score += 0.2  # Only one issuer
    issuer_ages = [get_agent_age(i) for i in issuers]
    if all(age < 30 days for age in issuer_ages):
        score += 0.3  # All new issuers
    
    # 3. Behavioral similarity: act like each other
    similar_agents = get_similar_agents(agent)
    if len(similar_agents) > 10:
        score += 0.3  # Many similar agents
    
    # 4. Niche behavior: only perform specific actions
    actions = get_actions(agent, last_30d)
    if len(set(actions)) <= 2:
        score += 0.2  # Limited action diversity
    
    return min(1.0, score)
```

**Mitigations**:
1. **Cost of Entry**: Require attestations from established issuers (cost >$100)
2. **Freshness Penalties**: New identities have reputation caps
3. **Graph Analysis**: Detect and discount cross-attestation rings
4. **Behavioral Analysis**: Monitor for non-human patterns

### 11.3 Malicious Issuer Attack

**Attack Vector**:
1. Attacker issues fraudulent attestations
2. Attacker colludes with Sybil cluster to cross-attest
3. Fraudulent agents build false reputation

**Example**:
```
Attacker creates:
- Fake KYC oracle (schema owner)
- 100 Sybil identities
- Fake KYC service

Flow:
- Sybil 1 applies for KYC with fake oracle
- Fake oracle issues KYC attestation
- Sybil 1 reputation increases
- Sybil 1 attests Sybil 2 (social credibility)
- Sybil 2 reputation increases
- Repeat for all 100 identities

Result: 100 agents with 80 reputation each
Cost: ~$1000 (just gas)
```

**Detection & Mitigation**:
```python
def is_malicious_issuer(issuer: str, schema: str) -> bool:
    """Detect if issuer is issuing fraudulent attestations"""
    
    # Get attestations by issuer
    atts = get_attestations_by_issuer(issuer)
    
    # Check: Do recipients cross-attest each other?
    recipients = set(a.subject for a in atts)
    cross_attestations = 0
    for att in get_attestations_by_issuer_set(recipients):
        if att.issuer in recipients:
            cross_attestations += 1
    
    if cross_attestations / len(atts) > 0.7:  # >70% cross-attest
        return True  # Likely Sybil ring
    
    # Check: Are recipients related?
    avg_similarity = compute_avg_similarity(recipients)
    if avg_similarity > 0.8:
        return True  # Likely Sybil cluster
    
    # Check: Issuer reputation < schema minimum?
    if get_reputation(issuer) < schema.min_issuer_reputation:
        return True  # Untrustworthy issuer
    
    return False
```

**On-Chain Mitigation**:
```solidity
// Schema owner can restrict who can issue
function setSchemaIssuerWhitelist(bytes32 schemaUID, address[] calldata issuers) {
    require(msg.sender == schemaOwner[schemaUID]);
    whitelistedIssuers[schemaUID] = issuers;
}

// Only whitelisted issuers can attest
function attest(bytes32 schemaUID, ...) external {
    require(
        isWhitelistedIssuer(schemaUID, msg.sender),
        "Issuer not whitelisted"
    );
    // ... attest
}
```

### 11.4 Indexer Manipulation Attack

**Attack Vector**:
1. Attacker controls indexer
2. Attacker serves false reputation scores
3. Attacker makes agents appear more/less trustworthy
4. Applications make wrong decisions based on false scores

**Mitigation 1: Deterministic Replay**
```python
# Client verifies indexer state
def verify_indexer_root(indexer_state_root: bytes32) -> bool:
    # Fetch all events from chain
    events = rpc.get_events(from_block=0, to_block='latest')
    
    # Deterministically compute state
    true_state = {}
    for event in events:
        true_state = apply_event(true_state, event)
    
    # Compute Merkle root
    true_root = compute_merkle_root(true_state)
    
    # Compare
    return indexer_state_root == true_root
```

**Mitigation 2: Merkle Proof Verification**
```solidity
// Paymaster verifies proof on-chain
function verifyReputationProof(
    bytes32 did,
    uint256 score,
    bytes32[] calldata proof
) external {
    bytes32 claimedRoot = indexer.getStateRoot();
    bytes32 leaf = keccak256(abi.encode(did, score));
    
    require(
        merkleProve(leaf, proof, claimedRoot),
        "Invalid proof"
    );
}
```

**Mitigation 3: Multiple Indexers**
Applications can use multiple independent indexers and majority-vote:
```typescript
const indexer1 = client.getRep(did);  // Score: 75
const indexer2 = client.getRep(did);  // Score: 75
const indexer3 = client.getRep(did);  // Score: 20 (compromised)

// Take median
const scores = [75, 75, 20].sort((a,b) => a - b);
const medianScore = scores[1];  // 75
```

### 11.5 Delegation Chain Hijacking

**Attack Vector**:
1. Agent A delegates to Agent B
2. Agent B's key compromised
3. Attacker impersonates Agent B
4. Attacker revokes Agent A's delegations
5. Agent A loses control of authorization

**Mitigation**:
```solidity
// Agent A can revoke delegations even after B's compromise
function revokeDelegationByDelegator(bytes32 delegationId) external {
    Delegation storage d = delegations[delegationId];
    require(msg.sender == getController(d.delegator), "Unauthorized");
    
    d.expiryTime = block.timestamp;  // Immediate expiry
    
    emit DelegationRevoked(delegationId);
}

// Agent A can revoke ALL delegations
function revokeAllDelegations(bytes32 did) external {
    require(msg.sender == getController(did), "Unauthorized");
    
    bytes32[] memory delegationIds = delegationsByDelegator[did];
    for (uint i = 0; i < delegationIds.length; i++) {
        delegations[delegationIds[i]].expiryTime = block.timestamp;
    }
    
    emit AllDelegationsRevoked(did);
}
```

### 11.6 Replay Attack on Key Rotation

**Attack Vector**:
1. Agent A rotates key to K1
2. Attacker replays old transaction with old key
3. Attacker rotates key to K2
4. Agent A's new key is overridden

**Mitigation**:
```solidity
function rotateKey(
    bytes32 did,
    address newKey,
    uint256 nonce,           // Include nonce
    bytes memory signature   // Signature includes nonce & chainId
) external {
    require(nonce == nextNonce[did], "Invalid nonce");
    
    // Verify signature includes nonce and chain ID
    bytes32 digest = keccak256(abi.encode(
        "KEY_ROTATION_V1",
        did,
        newKey,
        nonce,
        block.chainid
    ));
    
    require(
        ECDSA.recover(digest, signature) == activeKey[did],
        "Invalid signature"
    );
    
    nextNonce[did]++;
    activeKey[did] = newKey;
    
    emit KeyRotated(did, newKey);
}
```

---

## 12. Future Extensions

### 12.1 ZK Reputation (zk-SNARKs for Private Score Proofs)

Enable agents to prove reputation without revealing exact scores:

```solidity
// Prove reputation >= 50 without revealing exact score
function verifyMinReputationProof(
    bytes32 did,
    uint256 minScore,
    bytes calldata zkProof
) external view returns (bool) {
    // zkProof proves: reputation[did] >= minScore
    // without revealing: reputation[did]
    
    return zkVerifier.verifyProof(
        zkProof,
        [did, minScore]
    );
}
```

### 12.2 Cross-Chain Identity Bridging

Enable unified identity across multiple blockchains:

```typescript
// Agent on Ethereum
const eth_did = "did:aip:0x...";

// Agent on Polygon
const polygon_did = "did:aip:0x...";

// Link them
await aip.identity.linkDIDs([eth_did, polygon_did]);

// Now unified queries
const unified_rep = await resolver.getReputationAcrossChains(eth_did);
// Aggregates: Ethereum reputation + Polygon reputation + Arbitrum reputation
```

### 12.3 AI Agent Behavioral Attestations

Specialized attestations for agent behaviors:

```typescript
// Attestation schema for agent behavior
const behaviorSchema = {
  name: "AgentBehavior",
  fields: [
    { name: "execution_success_rate", type: "uint256" },  // 0-100
    { name: "slippage_control", type: "bool" },
    { name: "transaction_frequency", type: "uint256" },
    { name: "mev_awareness", type: "bool" },
    { name: "error_recovery", type: "uint256" }           // 0-100
  ]
};

// Issued by monitoring service
const monitoringService = "0x...";
await aip.attestation.create({
  issuer: monitoringService,
  subject: agent_did,
  schema: behaviorSchema.hash,
  data: {
    execution_success_rate: 99,
    slippage_control: true,
    transaction_frequency: 50,
    mev_awareness: true,
    error_recovery: 85
  },
  expiry: Date.now() + 30 * 24 * 60 * 60 * 1000  // 30 days
});
```

### 12.4 Reputation Markets

Secondary market for reputation tokens:

```typescript
// Reputation token (ERC20)
token = new ReputationToken(aip);

// Agent can stake reputation for yield
token.stake(did, amount);
// Earns yield: 5% APY
// Can unstake anytime (but loses accrued rewards)

// Reputation becomes composable asset
// - Can be used as collateral
// - Can be transferred to other agents
// - Can be locked for governance voting
```

### 12.5 Decentralized Dispute Resolution

Protocol for resolving disputed attestations:

```solidity
// Subject can challenge attestation
function challengeAttestation(
    bytes32 uid,
    string memory reason
) external {
    Attestation storage att = attestations[uid];
    require(subject_of(uid) == msg.sender, "Only subject can challenge");
    
    DisputeRequest memory dispute = DisputeRequest({
        uid: uid,
        challenger: msg.sender,
        reason: reason,
        evidence: "",
        createdAt: block.timestamp,
        status: DisputeStatus.OPEN
    });
    
    disputes[uid] = dispute;
    
    // DAO votes on validity
    // If challenge succeeds: attestation revoked
    // If challenge fails: challenger penalized
}
```

---

## 13. Conclusion

The Agent Identity Protocol addresses a critical gap in blockchain infrastructure: the lack of persistent, verifiable identity and reputation for autonomous AI agents. By introducing a purpose-built system optimized specifically for agent use cases, AIP enables:

1. **Trustworthy agent-to-agent interactions** through persistent identity and social credibility
2. **Efficient delegation and authorization** enabling complex multi-agent workflows
3. **Gas-efficient on-chain operations** making agent identity economically feasible
4. **Privacy-preserving verification** protecting agent behavior while enabling selective disclosure
5. **Sybil resistance** through cost of entry and reputation-based penalties
6. **Cross-chain operation** enabling agents to maintain unified identity across multiple blockchains

The protocol's modular design enables future extensions including zero-knowledge reputation proofs, cross-chain identity bridging, and reputation markets—creating a foundation for the emerging AI agent economy.

---

## References

**Core DID & Identity**
- [W3C Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)
- [Verifiable Credentials Data Model 1.0](https://www.w3.org/TR/vc-data-model/)
- [ENS Specification](https://docs.ens.domains/)

**Account Abstraction**
- [ERC-4337: Account Abstraction via Entry Point Contract specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Safe Smart Account Documentation](https://safe.global/home)
- [Session Keys & Smart Accounts](https://safe.global/home)

**Attestation & Credentials**
- [Ethereum Attestation Service (EAS) Specification](https://attest.sh/)
- [Schema Registry Design](https://github.com/ethereum-attestation-service/eas-contracts)

**Cryptography & Merkle Trees**
- [Merkle Trees and Merkle Proofs](https://en.wikipedia.org/wiki/Merkle_tree)
- [ECDSA Signature Verification](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)
- [Zero-Knowledge Proofs (ZK-SNARKs)](https://arxiv.org/pdf/1202.6464.pdf)

**Decentralized Storage**
- [IPFS Specification](https://spec.ipfs.tech/)
- [Ceramic Network Documentation](https://ceramic.network/)
- [Content Addressing](https://en.wikipedia.org/wiki/Content-addressable_storage)

**Security & Attacks**
- [Sybil Attack Definition](https://en.wikipedia.org/wiki/Sybil_attack)
- [Reentrancy Attacks](https://en.wikipedia.org/wiki/Reentrancy_(computing))
- [Front-Running in Blockchain](https://blog.blocknative.com/blog/front-running)
- [OWASP Smart Contract Security](https://owasp.org/www-project-smart-contract-top-10/)

**Blockchain & Consensus**
- [Ethereum Yellow Paper](https://ethereum.org/en/developers/docs/whitepaper/)
- [Byzantine Fault Tolerance](https://en.wikipedia.org/wiki/Byzantine_fault)
- [Proof of Work vs Proof of Stake](https://ethereum.org/en/developers/docs/consensus-mechanisms/)

**Related Protocols**
- [Lens Protocol](https://lens.xyz/)
- [Farcaster Protocol](https://farcaster.xyz/)
- [TheGraph (Subgraphs)](https://thegraph.com/)

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Status**: Specification (Ready for Implementation)
