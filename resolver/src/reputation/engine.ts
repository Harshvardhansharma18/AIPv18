import { ScoringStrategy } from './strategies/baseStrategy.js';
import { AttestationStrategy } from './strategies/attestationStrategy.js';
import { DelegationStrategy } from './strategies/delegationStrategy.js';
import { ActivityStrategy } from './strategies/activityStrategy.js';
import {
  ReputationScore,
  ReputationEdge,
  ScoreProof,
  ReputationData,
  CredentialSummary,
  DelegationSummary,
  RiskFlag,
  ScoreBreakdown,
} from '../types.js';
import { db, attestations as attestationsTable, delegations as delegationsTable } from '../db/index.js';
import { eq } from 'drizzle-orm';
import MerkleTree from 'merkletreejs';
import { keccak256 } from 'ethers';
import pino from 'pino';

const logger = pino();

interface CacheEntry {
  score: ReputationScore;
  timestamp: number;
}

export class ReputationEngine {
  private strategies: ScoringStrategy[];
  private cache: Map<string, CacheEntry>;
  private cacheValidityMs = 60 * 1000;

  constructor() {
    this.strategies = [
      new AttestationStrategy(),
      new DelegationStrategy(),
      new ActivityStrategy(),
    ];
    this.cache = new Map();
  }

  async computeScore(subject: string): Promise<ReputationScore> {
    const cached = this.cache.get(subject);
    if (cached && Date.now() - cached.timestamp < this.cacheValidityMs) {
      return cached.score;
    }

    try {
      const data = await this.gatherReputationData(subject);
      const scoreBreakdown = await this.computeScoreBreakdown(subject, data);
      const score = this.computeWeightedScore(scoreBreakdown);
      const tier = this.scoreTier(score);
      const riskFlags = this.assessRisks(data, score);
      const proof = await this.generateMerkleProof(subject, score);

      const result: ReputationScore = {
        subject,
        score,
        tier,
        scoreBreakdown,
        humanReadableExplanation: this.generateExplanation(score, tier, riskFlags),
        riskFlags,
        computedAt: Date.now(),
        proof,
      };

      this.cache.set(subject, {
        score: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      logger.error({ error, subject }, 'Error computing reputation score');
      throw error;
    }
  }

  async buildGraph(subject: string): Promise<ReputationEdge[]> {
    try {
      const edges: ReputationEdge[] = [];
      const data = await this.gatherReputationData(subject);

      for (const credential of data.attestations) {
        edges.push({
          from: credential.issuer,
          to: subject,
          type: 'issued_attestation',
          weight: credential.revoked ? -5 : 10,
          metadata: {
            uid: credential.uid,
            schemaId: credential.schemaId,
            expiresAt: credential.expiresAt,
          },
        });
      }

      for (const delegation of data.delegations) {
        if (!delegation.revoked) {
          edges.push({
            from: subject,
            to: delegation.agent,
            type: 'delegated_to',
            weight: 8,
            metadata: {
              delegationId: delegation.id,
              scope: delegation.scope,
              expiresAt: delegation.expiresAt,
            },
          });
        }
      }

      return edges;
    } catch (error) {
      logger.error({ error, subject }, 'Error building reputation graph');
      throw error;
    }
  }

  async generateMerkleProof(subject: string, score: number): Promise<ScoreProof> {
    try {
      const now = Date.now();
      const scoreHash = keccak256(
        Buffer.from(`${subject}:${score}:${now}`, 'utf-8')
      );

      const leaves = [scoreHash];
      const tree = new MerkleTree(leaves, keccak256 as any, { sortPairs: true });
      const root = tree.getRoot();
      const proof = tree.getProof(scoreHash);

      return {
        subject,
        score,
        merkleRoot: root.toString('hex'),
        proof: proof.map((p) => p.data.toString('hex')),
        timestamp: now,
      };
    } catch (error) {
      logger.error({ error, subject }, 'Error generating merkle proof');
      throw error;
    }
  }

  private async gatherReputationData(subject: string): Promise<ReputationData> {
    try {
      const [attestationRecords, delegationRecords] = await Promise.all([
        db.query.attestations.findMany({
          where: eq(attestationsTable.subject, subject),
        }),
        db.query.delegations.findMany({
          where: eq(delegationsTable.owner, subject),
        }),
      ]);

      const attestations: CredentialSummary[] = attestationRecords.map((a) => ({
        uid: a.uid,
        schemaId: a.schemaId,
        issuer: a.issuer,
        issuedAt: a.issuedAt.getTime(),
        expiresAt: a.expiresAt?.getTime(),
        revoked: a.revoked,
      }));

      const delegations: DelegationSummary[] = delegationRecords.map((d) => ({
        id: d.id,
        agent: d.agent,
        scope: d.scope.toString(),
        expiresAt: d.expiresAt?.getTime(),
        revoked: d.revoked,
      }));

      const lastActivityAt = Math.max(
        attestationRecords.length > 0
          ? Math.max(...attestationRecords.map((a) => a.issuedAt.getTime()))
          : 0,
        delegationRecords.length > 0
          ? Math.max(...delegationRecords.map((d) => d.createdAt.getTime()))
          : 0
      );

      const totalTransactions = attestationRecords.length + delegationRecords.length;

      return {
        attestations,
        delegations,
        lastActivityAt,
        totalTransactions,
      };
    } catch (error) {
      logger.error({ error, subject }, 'Error gathering reputation data');
      throw error;
    }
  }

  private async computeScoreBreakdown(
    subject: string,
    data: ReputationData
  ): Promise<ScoreBreakdown> {
    const scorePromises = this.strategies.map((strategy) =>
      strategy.compute(subject, data)
    );
    const scores = await Promise.all(scorePromises);

    return {
      attestationScore: scores[0] || 0,
      delegationScore: scores[1] || 0,
      activityScore: scores[2] || 0,
      penaltyScore: this.computePenaltyScore(data),
    };
  }

  private computeWeightedScore(breakdown: ScoreBreakdown): number {
    const weighted =
      breakdown.attestationScore * 0.35 +
      breakdown.delegationScore * 0.25 +
      breakdown.activityScore * 0.25 +
      breakdown.penaltyScore * 0.15;

    return Math.min(100, Math.max(0, weighted));
  }

  private computePenaltyScore(data: ReputationData): number {
    let penalty = 0;

    const revokedCount = data.attestations.filter((a) => a.revoked).length;
    if (revokedCount > 0) {
      const revocationRate = revokedCount / data.attestations.length;
      penalty += revocationRate * 30;
    }

    const expiredCount = data.attestations.filter(
      (a) => a.expiresAt && a.expiresAt < Date.now()
    ).length;
    if (expiredCount > 0) {
      const expiredRate = expiredCount / data.attestations.length;
      penalty += expiredRate * 20;
    }

    return Math.min(30, penalty);
  }

  private scoreTier(score: number): 'unknown' | 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (score >= 80) return 'platinum';
    if (score >= 60) return 'gold';
    if (score >= 40) return 'silver';
    if (score >= 20) return 'bronze';
    return 'unknown';
  }

  private assessRisks(data: ReputationData, score: number): RiskFlag[] {
    const risks: RiskFlag[] = [];

    const expiredCount = data.attestations.filter(
      (a) => a.expiresAt && a.expiresAt < Date.now()
    ).length;
    if (expiredCount > 0) {
      risks.push({
        type: 'expired_credentials',
        severity: expiredCount > data.attestations.length * 0.5 ? 'high' : 'medium',
        description: `${expiredCount} expired credentials detected`,
      });
    }

    const revokedRate =
      data.attestations.filter((a) => a.revoked).length / Math.max(1, data.attestations.length);
    if (revokedRate > 0.1) {
      risks.push({
        type: 'high_revocation_rate',
        severity: revokedRate > 0.3 ? 'high' : 'medium',
        description: `Revocation rate: ${(revokedRate * 100).toFixed(1)}%`,
      });
    }

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.lastActivityAt > thirtyDaysMs) {
      risks.push({
        type: 'recent_activity',
        severity: 'low',
        description: 'No activity in the last 30 days',
      });
    }

    if (score < 20) {
      risks.push({
        type: 'unverified_issuer',
        severity: 'high',
        description: 'Identity has very low reputation score',
      });
    }

    return risks;
  }

  private generateExplanation(
    score: number,
    tier: string,
    risks: RiskFlag[]
  ): string {
    let explanation = `Trust tier: ${tier}. `;

    if (score >= 80) {
      explanation += 'This identity has excellent reputation backed by multiple verified credentials.';
    } else if (score >= 60) {
      explanation += 'This identity has good reputation with solid credential base.';
    } else if (score >= 40) {
      explanation += 'This identity has moderate reputation but could benefit from additional credentials.';
    } else if (score >= 20) {
      explanation += 'This identity has emerging reputation but limited credential history.';
    } else {
      explanation += 'This identity has minimal reputation and unverified status.';
    }

    if (risks.length > 0) {
      const highRisks = risks.filter((r) => r.severity === 'high');
      if (highRisks.length > 0) {
        explanation += ` Warning: ${highRisks.map((r) => r.description).join('; ')}.`;
      }
    }

    return explanation;
  }
}
