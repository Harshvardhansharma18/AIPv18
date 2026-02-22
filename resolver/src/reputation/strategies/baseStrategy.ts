import { ReputationData } from '../../types.js';

export interface ScoringStrategy {
  name: string;
  weight: number;
  compute(subject: string, data: ReputationData): Promise<number>;
}

export abstract class BaseStrategy implements ScoringStrategy {
  abstract name: string;
  abstract weight: number;

  abstract compute(subject: string, data: ReputationData): Promise<number>;

  protected clamp(value: number, min: number = 0, max: number = 100): number {
    return Math.min(Math.max(value, min), max);
  }

  protected normalize(value: number, min: number, max: number): number {
    if (max <= min) return 0;
    return this.clamp((value - min) / (max - min) * 100);
  }

  protected exponentialDecay(
    timeSinceEvent: number,
    halfLifeMs: number,
    maxValue: number = 100
  ): number {
    const decayFactor = Math.pow(0.5, timeSinceEvent / halfLifeMs);
    return maxValue * decayFactor;
  }
}
