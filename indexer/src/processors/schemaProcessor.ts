import { db } from '../db/index.js';
import { schemas } from '../db/schema.js';
import pino from 'pino';

const logger = pino();

interface SchemaRegisteredEvent {
  args: {
    schemaId: string;
    creator: string;
    name: string;
    version: string;
    schemaCid: string;
  };
  transactionHash: string;
}

export async function processSchemaEvents(events: SchemaRegisteredEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  for (const event of events) {
    try {
      const schemaId = event.args.schemaId.toLowerCase();
      const creator = event.args.creator.toLowerCase();

      await db
        .insert(schemas)
        .values({
          id: schemaId,
          creator,
          name: event.args.name,
          version: event.args.version,
          schemaCid: event.args.schemaCid,
          txHash: event.transactionHash.toLowerCase(),
        })
        .onConflictDoUpdate({
          target: schemas.id,
          set: {
            creator,
            name: event.args.name,
            version: event.args.version,
            schemaCid: event.args.schemaCid,
            txHash: event.transactionHash.toLowerCase(),
          },
        });

      logger.info(
        {
          schemaId,
          creator,
          name: event.args.name,
          version: event.args.version,
        },
        'Schema registered'
      );
    } catch (error) {
      logger.error({ error, event }, 'Error processing schema event');
      throw error;
    }
  }
}
