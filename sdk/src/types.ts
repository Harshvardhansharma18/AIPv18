// DID
export type DIDString = `did:agent:${number}:${string}`;

export interface DIDDocument {
  id: DIDString;
  controller: `0x${string}`;
  metadataCid: string;
  active: boolean;
  updatedAt: number;
  keyRotationCount: number;
}

// Credential / Attestation
export interface Credential {
  uid: `0x${string}`;
  schemaId: `0x${string}`;
  issuer: `0x${string}`;
  subject: `0x${string}`;
  issuedAt: number;
  expiresAt: number;
  dataCid: string;
  revoked: boolean;
  data?: Record<string, unknown>;
}

// Delegation
export interface Delegation {
  id: `0x${string}`;
  owner: `0x${string}`;
  agent: `0x${string}`;
  scope: bigint;
  expiresAt: number;
  createdAt: number;
  revoked: boolean;
}

export const DelegationScope = {
  READ: 1n,
  WRITE: 2n,
  ATTEST: 4n,
  DELEGATE: 8n,
} as const;

export type ScopeName = keyof typeof DelegationScope;

// Reputation
export interface ReputationScore {
  subject: `0x${string}`;
  score: number;
  tier: "unknown" | "bronze" | "silver" | "gold" | "platinum";
  breakdown: {
    attestationScore: number;
    delegationScore: number;
    activityScore: number;
    penaltyScore: number;
  };
  edges: ReputationEdge[];
  computedAt: number;
}

export interface ReputationEdge {
  from: `0x${string}`;
  to: `0x${string}`;
  type: "ATTESTED" | "DELEGATED" | "RECOVERED";
  weight: number;
  timestamp: number;
}

export interface ScoreProof {
  subject: `0x${string}`;
  score: number;
  merkleRoot: `0x${string}`;
  proof: `0x${string}`[];
  leaf: `0x${string}`;
  computedAt: number;
}

export interface TrustProfile {
  did: DIDString;
  controller: `0x${string}`;
  score: number;
  tier: string;
  scoreBreakdown: ReputationScore["breakdown"];
  humanReadableExplanation: string;
  credentials: Credential[];
  delegationChain: Delegation[];
  riskFlags: RiskFlag[];
  merkleRoot: `0x${string}`;
  proof: `0x${string}`[];
  computedAt: number;
  version: "1.0";
}

export interface RiskFlag {
  type: "REVOKED_CREDENTIAL" | "EXPIRED_DELEGATION" | "SUSPICIOUS_ISSUER" | "LOW_ACTIVITY" | "RECENT_KEY_ROTATION";
  severity: "low" | "medium" | "high";
  description: string;
}

export interface Schema {
  id: `0x${string}`;
  creator: `0x${string}`;
  name: string;
  version: string;
  schemaCid: string;
  active: boolean;
}

// Config
export interface AgentIdentityConfig {
  chainId: number;
  rpcUrl: string;
  resolverUrl: string;
  contracts: {
    didRegistry: `0x${string}`;
    schemaRegistry: `0x${string}`;
    attestationRegistry: `0x${string}`;
    delegationRegistry: `0x${string}`;
    revocationRegistry: `0x${string}`;
  };
}
