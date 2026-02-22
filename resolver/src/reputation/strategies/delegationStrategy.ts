import { BaseStrategy } from './baseStrategy.js';
import { ReputationData, DelegationSummary } from '../../types.js';
import pino from 'pino';

const logger = pino();

export class DelegationStrategy extends BaseStrategy {
  name = 'delegation';
  weight = 0.25;

  async compute(subject: string, data: ReputationData): Promise<number> {
    try {
      const activeDelegations = data.delegations.filter(
        (d) => !d.revoked && (!d.expiresAt || d.expiresAt > Date.now())
      );

      if (activeDelegations.length === 0) {
        return 0;
      }

      const delegationCountScore = this.normalize(activeDelegations.length, 0, 15) * 0.4;
      const scopeScore = this.computeScopeScore(activeDelegations) * 0.35;
      const ageScore = this.computeAgeScore(activeDelegations) * 0.25;

      const combinedScore = delegationCountScore + scopeScore + ageScore;
      return this.clamp(combinedScore);
    } catch (error) {
      logger.error({ error, subject }, 'Error computing delegation score');
      return 0;
    }
  }

  private computeScopeScore(delegations: DelegationSummary[]): number {
    const uniqueScopes = new Set(delegations.map((d) => d.scope));
    return this.normalize(uniqueScopes.size, 0, 8);
  }

  private computeAgeScore(delegations: DelegationSummary[]): number {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    let totalAge = 0;
    for (const delegation of delegations) {
      const ageMs = now - delegation.expiresAt! || now;
      const ageDays = Math.max(0, (now - ageMs) / thirtyDaysMs);
      totalAge += Math.min(ageDays, 1);
    }

    return (totalAge / delegations.length) * 100;
  }
}
