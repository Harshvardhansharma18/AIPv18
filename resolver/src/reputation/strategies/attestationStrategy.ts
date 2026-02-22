import { BaseStrategy } from './baseStrategy.js';
import { ReputationData, CredentialSummary } from '../../types.js';
import pino from 'pino';

const logger = pino();

export class AttestationStrategy extends BaseStrategy {
  name = 'attestation';
  weight = 0.35;

  async compute(subject: string, data: ReputationData): Promise<number> {
    try {
      const validCredentials = data.attestations.filter((c) => !c.revoked && (!c.expiresAt || c.expiresAt > Date.now()));

      if (validCredentials.length === 0) {
        return 0;
      }

      const credentialCountScore = this.normalize(validCredentials.length, 0, 20) * 0.25;
      const schemaScoreRaw = this.computeSchemaScore(validCredentials) * 0.25;
      const freshnessScore = this.computeFreshnessScore(validCredentials) * 0.25;
      const issuerReputationScore = 25;

      const combinedScore = credentialCountScore + schemaScoreRaw + freshnessScore + issuerReputationScore;
      return this.clamp(combinedScore);
    } catch (error) {
      logger.error({ error, subject }, 'Error computing attestation score');
      return 0;
    }
  }

  private computeSchemaScore(credentials: CredentialSummary[]): number {
    const uniqueSchemas = new Set(credentials.map((c) => c.schemaId));
    return this.normalize(uniqueSchemas.size, 0, 10);
  }

  private computeFreshnessScore(credentials: CredentialSummary[]): number {
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    let totalDecay = 0;
    for (const credential of credentials) {
      const timeSinceIssue = now - credential.issuedAt;
      const decay = this.exponentialDecay(timeSinceIssue, ninetyDaysMs, 100);
      totalDecay += decay;
    }

    return totalDecay / credentials.length;
  }
}
