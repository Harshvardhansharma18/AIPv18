import { BaseStrategy } from './baseStrategy.js';
import { ReputationData } from '../../types.js';
import pino from 'pino';

const logger = pino();

export class ActivityStrategy extends BaseStrategy {
  name = 'activity';
  weight = 0.25;

  async compute(subject: string, data: ReputationData): Promise<number> {
    try {
      const recencyScore = this.computeRecencyScore(data.lastActivityAt) * 0.5;
      const transactionScore = this.normalize(data.totalTransactions, 0, 100) * 0.5;

      const combinedScore = recencyScore + transactionScore;
      return this.clamp(combinedScore);
    } catch (error) {
      logger.error({ error, subject }, 'Error computing activity score');
      return 0;
    }
  }

  private computeRecencyScore(lastActivityAt: number): number {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityAt;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (timeSinceActivity < 0) {
      return 100;
    }

    if (timeSinceActivity > thirtyDaysMs) {
      return 0;
    }

    return this.normalize(thirtyDaysMs - timeSinceActivity, 0, thirtyDaysMs);
  }
}
