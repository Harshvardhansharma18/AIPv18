import { createPublicClient, http } from 'viem';
import { db, closeDb } from './db/index.js';
import { indexerState } from './db/schema.js';
import { config } from './config.js';
import { eq } from 'drizzle-orm';
import pino from 'pino';
import pretty from 'pino-pretty';
import { processDIDEvents } from './processors/didProcessor.js';
import { processSchemaEvents } from './processors/schemaProcessor.js';
import { processAttestationEvents } from './processors/attestationProcessor.js';
import { processDelegationEvents } from './processors/delegationProcessor.js';
import { processRevocationEvents } from './processors/revocationProcessor.js';
import {
  DID_REGISTRY_ABI,
  SCHEMA_REGISTRY_ABI,
  ATTESTATION_REGISTRY_ABI,
  DELEGATION_REGISTRY_ABI,
  REVOCATION_REGISTRY_ABI,
} from './abis/index.js';

const logger = pino(pretty({ colorize: true }));

interface IndexerState {
  chainId: number;
  lastProcessedBlock: number;
}

async function getOrInitializeIndexerState(): Promise<IndexerState> {
  const existing = await db.query.indexerState.findFirst({
    where: eq(indexerState.chainId, config.chainId),
  });

  if (existing) {
    return {
      chainId: existing.chainId,
      lastProcessedBlock: existing.lastProcessedBlock,
    };
  }

  const startBlock = config.startBlock;
  await db.insert(indexerState).values({
    chainId: config.chainId,
    lastProcessedBlock: startBlock,
  });

  return {
    chainId: config.chainId,
    lastProcessedBlock: startBlock,
  };
}

async function updateIndexerState(blockNumber: number): Promise<void> {
  await db
    .update(indexerState)
    .set({ lastProcessedBlock: blockNumber })
    .where(eq(indexerState.chainId, config.chainId));
}

async function processDIDRegistryEvents(
  client: ReturnType<typeof createPublicClient>,
  fromBlock: bigint,
  toBlock: bigint
): Promise<void> {
  try {
    const events = await client.getContractEvents({
      address: config.contractAddresses.DID_REGISTRY as `0x${string}`,
      abi: DID_REGISTRY_ABI,
      fromBlock,
      toBlock,
    });

    if (events.length > 0) {
      logger.info(`Processing ${events.length} DID registry events`);
      await processDIDEvents(events as any);
    }
  } catch (error) {
    logger.error({ error }, 'Error fetching DID registry events');
    throw error;
  }
}

async function processSchemaRegistryEvents(
  client: ReturnType<typeof createPublicClient>,
  fromBlock: bigint,
  toBlock: bigint
): Promise<void> {
  try {
    const events = await client.getContractEvents({
      address: config.contractAddresses.SCHEMA_REGISTRY as `0x${string}`,
      abi: SCHEMA_REGISTRY_ABI,
      fromBlock,
      toBlock,
    });

    if (events.length > 0) {
      logger.info(`Processing ${events.length} schema registry events`);
      await processSchemaEvents(events as any);
    }
  } catch (error) {
    logger.error({ error }, 'Error fetching schema registry events');
    throw error;
  }
}

async function processAttestationRegistryEvents(
  client: ReturnType<typeof createPublicClient>,
  fromBlock: bigint,
  toBlock: bigint
): Promise<void> {
  try {
    const events = await client.getContractEvents({
      address: config.contractAddresses.ATTESTATION_REGISTRY as `0x${string}`,
      abi: ATTESTATION_REGISTRY_ABI,
      fromBlock,
      toBlock,
    });

    if (events.length > 0) {
      logger.info(`Processing ${events.length} attestation registry events`);
      await processAttestationEvents(events as any);
    }
  } catch (error) {
    logger.error({ error }, 'Error fetching attestation registry events');
    throw error;
  }
}

async function processDelegationRegistryEvents(
  client: ReturnType<typeof createPublicClient>,
  fromBlock: bigint,
  toBlock: bigint
): Promise<void> {
  try {
    const events = await client.getContractEvents({
      address: config.contractAddresses.DELEGATION_REGISTRY as `0x${string}`,
      abi: DELEGATION_REGISTRY_ABI,
      fromBlock,
      toBlock,
    });

    if (events.length > 0) {
      logger.info(`Processing ${events.length} delegation registry events`);
      await processDelegationEvents(events as any);
    }
  } catch (error) {
    logger.error({ error }, 'Error fetching delegation registry events');
    throw error;
  }
}

async function processRevocationRegistryEvents(
  client: ReturnType<typeof createPublicClient>,
  fromBlock: bigint,
  toBlock: bigint
): Promise<void> {
  try {
    const events = await client.getContractEvents({
      address: config.contractAddresses.REVOCATION_REGISTRY as `0x${string}`,
      abi: REVOCATION_REGISTRY_ABI,
      fromBlock,
      toBlock,
    });

    if (events.length > 0) {
      logger.info(`Processing ${events.length} revocation registry events`);
      await processRevocationEvents(events as any);
    }
  } catch (error) {
    logger.error({ error }, 'Error fetching revocation registry events');
    throw error;
  }
}

async function pollBlockchain(): Promise<void> {
  const client = createPublicClient({
    transport: http(config.rpcUrl),
  });

  const state = await getOrInitializeIndexerState();
  let currentBlock = state.lastProcessedBlock;

  logger.info(
    { chainId: config.chainId, startBlock: currentBlock },
    'Indexer initialized'
  );

  async function indexInterval(): Promise<void> {
    try {
      const blockNumber = await client.getBlockNumber();
      const toBlock = blockNumber;
      const fromBlock = BigInt(currentBlock + 1);

      if (fromBlock > toBlock) {
        logger.debug('No new blocks to process');
        return;
      }

      logger.info(
        { fromBlock: fromBlock.toString(), toBlock: toBlock.toString() },
        'Processing blocks'
      );

      await Promise.all([
        processDIDRegistryEvents(client, fromBlock, toBlock),
        processSchemaRegistryEvents(client, fromBlock, toBlock),
        processAttestationRegistryEvents(client, fromBlock, toBlock),
        processDelegationRegistryEvents(client, fromBlock, toBlock),
        processRevocationRegistryEvents(client, fromBlock, toBlock),
      ]);

      currentBlock = Number(toBlock);
      await updateIndexerState(currentBlock);

      logger.info({ lastBlock: currentBlock }, 'Block range processed');
    } catch (error) {
      logger.error({ error }, 'Error in indexing loop, will retry in 5 seconds');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  const intervalId = setInterval(indexInterval, config.pollIntervalMs);

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down indexer gracefully');
    clearInterval(intervalId);
    await closeDb();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  logger.info('Indexer started, polling blockchain');
  await indexInterval();
}

pollBlockchain().catch((error) => {
  logger.error({ error }, 'Fatal error in indexer');
  process.exit(1);
});
