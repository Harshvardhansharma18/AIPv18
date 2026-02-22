export interface CredentialSummary {
  uid: string;
  schemaId: string;
  issuer: string;
  issuedAt: number;
  expiresAt?: number;
  revoked: boolean;
}

export interface DelegationSummary {
  id: string;
  agent: string;
  scope: string;
  expiresAt?: number;
  revoked: boolean;
}

export interface RiskFlag {
  type: 'expired_credentials' | 'high_revocation_rate' | 'recent_activity' | 'unverified_issuer' | 'delegation_abuse';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ScoreBreakdown {
  attestationScore: number;
  delegationScore: number;
  activityScore: number;
  penaltyScore: number;
}

export interface ScoreProof {
  subject: string;
  score: number;
  merkleRoot: string;
  proof: string[];
  timestamp: number;
}

export interface ReputationScore {
  subject: string;
  score: number;
  tier: 'unknown' | 'bronze' | 'silver' | 'gold' | 'platinum';
  scoreBreakdown: ScoreBreakdown;
  humanReadableExplanation: string;
  riskFlags: RiskFlag[];
  computedAt: number;
  proof: ScoreProof;
}

export interface ReputationEdge {
  from: string;
  to: string;
  type: 'issued_attestation' | 'received_delegation' | 'delegated_to' | 'revoked_credential';
  weight: number;
  metadata: Record<string, unknown>;
}

export interface TrustProfile {
  did: string;
  controller: string;
  score: number;
  tier: 'unknown' | 'bronze' | 'silver' | 'gold' | 'platinum';
  scoreBreakdown: ScoreBreakdown;
  humanReadableExplanation: string;
  credentials: CredentialSummary[];
  delegationChain: DelegationSummary[];
  riskFlags: RiskFlag[];
  merkleRoot: string;
  proof: string[];
  computedAt: number;
  version: '1.0';
}

export interface DIDDocument {
  did: string;
  controller: string;
  active: boolean;
  metadataCid: string;
  createdAt?: number;
  updatedAt: number;
  trustProfile?: TrustProfile;
}

export interface ReputationData {
  attestations: CredentialSummary[];
  delegations: DelegationSummary[];
  lastActivityAt: number;
  totalTransactions: number;
}
