import { db } from '../db/index.js';
import { delegations } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import pino from 'pino';

const logger = pino();

interface DelegationCreatedEvent {
  args: {
    id: string;
    owner: string;
    agent: string;
    scope: string;
    expiresAt: bigint;
  };
  transactionHash: string;
}

interface DelegationRevokedEvent {
  args: {
    id: string;
    revoker: string;
  };
  transactionHash: string;
}

type DelegationEvent = DelegationCreatedEvent | DelegationRevokedEvent;

export async function processDelegationEvents(events: DelegationEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  for (const event of events) {
    try {
      const delegationId = (event.args as Record<string, unknown>).id as string;
      const delegationIdLower = delegationId.toLowerCase();

      if ('owner' in event.args) {
        const createdEvent = event as DelegationCreatedEvent;
        
        await db
          .insert(delegations)
          .values({
            id: delegationIdLower,
            owner: createdEvent.args.owner.toLowerCase(),
            agent: createdEvent.args.agent.toLowerCase(),
            scope: BigInt(createdEvent.args.scope),
            expiresAt: createdEvent.args.expiresAt > 0n
              ? new Date(Number(createdEvent.args.expiresAt) * 1000)
              : null,
            txHash: createdEvent.transactionHash.toLowerCase(),
          })
          .onConflictDoUpdate({
            target: delegations.id,
            set: {
              owner: createdEvent.args.owner.toLowerCase(),
              agent: createdEvent.args.agent.toLowerCase(),
              scope: BigInt(createdEvent.args.scope),
              txHash: createdEvent.transactionHash.toLowerCase(),
            },
          });

        logger.info(
          {
            delegationId: delegationIdLower,
            owner: createdEvent.args.owner,
            agent: createdEvent.args.agent,
          },
          'Delegation created'
        );
      } else if ('revoker' in event.args) {
        const revokedEvent = event as DelegationRevokedEvent;
        
        await db
          .update(delegations)
          .set({
            revoked: true,
            revokedAt: new Date(),
            txHash: revokedEvent.transactionHash.toLowerCase(),
          })
          .where(eq(delegations.id, delegationIdLower));

        logger.info(
          { delegationId: delegationIdLower, revoker: revokedEvent.args.revoker },
          'Delegation revoked'
        );
      }
    } catch (error) {
      logger.error({ error, event }, 'Error processing delegation event');
      throw error;
    }
  }
}
