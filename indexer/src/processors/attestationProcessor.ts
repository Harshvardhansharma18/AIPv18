import { db } from '../db/index.js';
import { attestations } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import pino from 'pino';

const logger = pino();

interface AttestationIssuedEvent {
  args: {
    uid: string;
    schemaId: string;
    issuer: string;
    subject: string;
    expiresAt: bigint;
    dataCid: string;
  };
  transactionHash: string;
  blockNumber: bigint;
  logIndex: number;
}

interface AttestationRevokedEvent {
  args: {
    uid: string;
    revoker: string;
  };
  transactionHash: string;
  blockNumber: bigint;
}

type AttestationEvent = AttestationIssuedEvent | AttestationRevokedEvent;

export async function processAttestationEvents(events: AttestationEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  for (const event of events) {
    try {
      const uid = (event.args as Record<string, unknown>).uid as string;
      const uidLower = uid.toLowerCase();

      if ('subject' in event.args) {
        const issuedEvent = event as AttestationIssuedEvent;
        
        await db
          .insert(attestations)
          .values({
            uid: uidLower,
            schemaId: issuedEvent.args.schemaId.toLowerCase(),
            issuer: issuedEvent.args.issuer.toLowerCase(),
            subject: issuedEvent.args.subject.toLowerCase(),
            issuedAt: new Date(Number(issuedEvent.args.expiresAt) * 1000),
            expiresAt: issuedEvent.args.expiresAt > 0n
              ? new Date(Number(issuedEvent.args.expiresAt) * 1000)
              : null,
            dataCid: issuedEvent.args.dataCid,
            txHash: issuedEvent.transactionHash.toLowerCase(),
            blockNumber: Number(issuedEvent.blockNumber),
          })
          .onConflictDoUpdate({
            target: attestations.uid,
            set: {
              schemaId: issuedEvent.args.schemaId.toLowerCase(),
              issuer: issuedEvent.args.issuer.toLowerCase(),
              subject: issuedEvent.args.subject.toLowerCase(),
              dataCid: issuedEvent.args.dataCid,
              txHash: issuedEvent.transactionHash.toLowerCase(),
              blockNumber: Number(issuedEvent.blockNumber),
            },
          });

        logger.info(
          {
            uid: uidLower,
            issuer: issuedEvent.args.issuer,
            subject: issuedEvent.args.subject,
          },
          'Attestation issued'
        );
      } else if ('revoker' in event.args) {
        const revokedEvent = event as AttestationRevokedEvent;
        
        await db
          .update(attestations)
          .set({
            revoked: true,
            revokedAt: new Date(),
            txHash: revokedEvent.transactionHash.toLowerCase(),
          })
          .where(eq(attestations.uid, uidLower));

        logger.info(
          { uid: uidLower, revoker: revokedEvent.args.revoker },
          'Attestation revoked'
        );
      }
    } catch (error) {
      logger.error({ error, event }, 'Error processing attestation event');
      throw error;
    }
  }
}
