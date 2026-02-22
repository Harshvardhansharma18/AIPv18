/**
 * Vercel Cron Handler — runs the indexer's sync loop once per invocation.
 *
 * Called by Vercel Cron every minute (see vercel.json).
 * Processes all unindexed blocks since the last run and writes to Postgres.
 *
 * Protection: Vercel only calls cron endpoints from its own infrastructure,
 * but we also check the CRON_SECRET header for extra safety.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPublicClient, http } from 'viem';
import { db } from '../../indexer/src/db/index.js';
import { indexerState } from '../../indexer/src/db/schema.js';
import { config } from '../../indexer/src/config.js';
import { eq } from 'drizzle-orm';
import { processDIDEvents } from '../../indexer/src/processors/didProcessor.js';
import { processSchemaEvents } from '../../indexer/src/processors/schemaProcessor.js';
import { processAttestationEvents } from '../../indexer/src/processors/attestationProcessor.js';
import { processDelegationEvents } from '../../indexer/src/processors/delegationProcessor.js';
import { processRevocationEvents } from '../../indexer/src/processors/revocationProcessor.js';
import {
  DID_REGISTRY_ABI,
  SCHEMA_REGISTRY_ABI,
  ATTESTATION_REGISTRY_ABI,
  DELEGATION_REGISTRY_ABI,
  REVOCATION_REGISTRY_ABI,
} from '../../indexer/src/abis/index.js';

// Maximum blocks to process per cron invocation (keeps execution < 60s)
const MAX_BLOCKS_PER_RUN = 500n;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET (Vercel Cron) or requests with the correct secret
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();

  try {
    const client = createPublicClient({ transport: http(config.rpcUrl) });

    // Get or initialise indexer cursor
    let state = await db.query.indexerState.findFirst({
      where: eq(indexerState.chainId, config.chainId),
    });

    if (!state) {
      await db.insert(indexerState).values({
        chainId: config.chainId,
        lastProcessedBlock: config.startBlock,
      });
      state = { chainId: config.chainId, lastProcessedBlock: config.startBlock } as any;
    }

    const latestBlock = await client.getBlockNumber();
    const fromBlock = BigInt(state!.lastProcessedBlock + 1);
    const toBlock = fromBlock + MAX_BLOCKS_PER_RUN < latestBlock
      ? fromBlock + MAX_BLOCKS_PER_RUN
      : latestBlock;

    if (fromBlock > latestBlock) {
      return res.json({ synced: true, message: 'Already at head', block: Number(latestBlock) });
    }

    // Fetch and process all registry events in parallel
    const [didEvents, schemaEvents, attestEvents, delegEvents, revokeEvents] = await Promise.all([
      client.getContractEvents({ address: config.contractAddresses.DID_REGISTRY as `0x${string}`, abi: DID_REGISTRY_ABI, fromBlock, toBlock }),
      client.getContractEvents({ address: config.contractAddresses.SCHEMA_REGISTRY as `0x${string}`, abi: SCHEMA_REGISTRY_ABI, fromBlock, toBlock }),
      client.getContractEvents({ address: config.contractAddresses.ATTESTATION_REGISTRY as `0x${string}`, abi: ATTESTATION_REGISTRY_ABI, fromBlock, toBlock }),
      client.getContractEvents({ address: config.contractAddresses.DELEGATION_REGISTRY as `0x${string}`, abi: DELEGATION_REGISTRY_ABI, fromBlock, toBlock }),
      client.getContractEvents({ address: config.contractAddresses.REVOCATION_REGISTRY as `0x${string}`, abi: REVOCATION_REGISTRY_ABI, fromBlock, toBlock }),
    ]);

    await Promise.all([
      didEvents.length    && processDIDEvents(didEvents as any),
      schemaEvents.length && processSchemaEvents(schemaEvents as any),
      attestEvents.length && processAttestationEvents(attestEvents as any),
      delegEvents.length  && processDelegationEvents(delegEvents as any),
      revokeEvents.length && processRevocationEvents(revokeEvents as any),
    ]);

    // Persist cursor
    await db.update(indexerState)
      .set({ lastProcessedBlock: Number(toBlock) })
      .where(eq(indexerState.chainId, config.chainId));

    const totalEvents = didEvents.length + schemaEvents.length +
      attestEvents.length + delegEvents.length + revokeEvents.length;

    return res.json({
      ok: true,
      fromBlock: Number(fromBlock),
      toBlock: Number(toBlock),
      events: totalEvents,
      durationMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('Cron sync error:', error);
    return res.status(500).json({ error: error.message, durationMs: Date.now() - startTime });
  }
}
