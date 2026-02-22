import { db } from '../db/index.js';
import { revocations } from '../db/schema.js';
import pino from 'pino';

const logger = pino();

interface CredentialRevokedEvent {
  args: {
    credentialId: string;
    revoker: string;
    reason: string;
  };
  transactionHash: string;
}

export async function processRevocationEvents(events: CredentialRevokedEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  for (const event of events) {
    try {
      const credentialId = event.args.credentialId.toLowerCase();

      await db
        .insert(revocations)
        .values({
          credentialId,
          revoker: event.args.revoker.toLowerCase(),
          reason: event.args.reason || null,
          txHash: event.transactionHash.toLowerCase(),
        })
        .onConflictDoNothing();

      logger.info(
        {
          credentialId,
          revoker: event.args.revoker,
          reason: event.args.reason,
        },
        'Credential revoked'
      );
    } catch (error) {
      logger.error({ error, event }, 'Error processing revocation event');
      throw error;
    }
  }
}
