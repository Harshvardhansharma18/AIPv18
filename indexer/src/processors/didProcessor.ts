import { db } from '../db/index.js';
import { dids } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import pino from 'pino';

const logger = pino();

interface DIDCreatedEvent {
  args: {
    controller: string;
    metadataCid: string;
    timestamp: bigint;
  };
  transactionHash: string;
  blockNumber: bigint;
  address: string;
}

interface DIDUpdatedEvent {
  args: {
    did: string;
    metadataCid: string;
    timestamp: bigint;
  };
  transactionHash: string;
  blockNumber: bigint;
}

interface DIDKeyRotatedEvent {
  args: {
    did: string;
    newKeyHash: string;
    timestamp: bigint;
  };
  transactionHash: string;
  blockNumber: bigint;
}

interface RecoveryExecutedEvent {
  args: {
    did: string;
    newController: string;
    timestamp: bigint;
  };
  transactionHash: string;
  blockNumber: bigint;
}

type DIDEvent = DIDCreatedEvent | DIDUpdatedEvent | DIDKeyRotatedEvent | RecoveryExecutedEvent;

export async function processDIDEvents(events: DIDEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  for (const event of events) {
    try {
      let eventName: string | undefined;
      if ('eventName' in event && typeof event.eventName === 'string') {
        eventName = event.eventName;
      }
      
      if (eventName === 'DIDCreated' || 'address' in event) {
        const createEvent = event as DIDCreatedEvent;
        const didId = createEvent.address.toLowerCase();
        
        await db
          .insert(dids)
          .values({
            id: didId,
            controller: createEvent.args.controller.toLowerCase(),
            metadataCid: createEvent.args.metadataCid,
            txHash: createEvent.transactionHash.toLowerCase(),
            blockNumber: Number(createEvent.blockNumber),
          })
          .onConflictDoUpdate({
            target: dids.id,
            set: {
              controller: createEvent.args.controller.toLowerCase(),
              metadataCid: createEvent.args.metadataCid,
              txHash: createEvent.transactionHash.toLowerCase(),
              blockNumber: Number(createEvent.blockNumber),
            },
          });
        
        logger.info(
          { did: didId, controller: createEvent.args.controller },
          'DID created/updated'
        );
      } else if (eventName === 'RecoveryExecuted' || ('args' in event && 'newController' in event.args)) {
        const recoveryEvent = event as RecoveryExecutedEvent;
        const didId = recoveryEvent.args.did.toLowerCase();
        
        await db
          .update(dids)
          .set({
            controller: recoveryEvent.args.newController.toLowerCase(),
            txHash: recoveryEvent.transactionHash.toLowerCase(),
            blockNumber: Number(recoveryEvent.blockNumber),
          })
          .where(eq(dids.id, didId));
        
        logger.info(
          { did: didId, newController: recoveryEvent.args.newController },
          'DID recovery executed'
        );
      }
    } catch (error) {
      logger.error({ error, event }, 'Error processing DID event');
      throw error;
    }
  }
}
