import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, attestations as attestationsTable, delegations as delegationsTable, dids as didsTable } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { DIDDocument, TrustProfile } from '../types.js';
import { ReputationEngine } from '../reputation/engine.js';
import pino from 'pino';

const logger = pino();
const reputationEngine = new ReputationEngine();
const chainIdValue = process.env.CHAIN_ID;
const chainId = chainIdValue ? Number(chainIdValue) : undefined;
const didPrefix = chainId && !Number.isNaN(chainId) ? `did:agent:${chainId}:` : null;

function normalizeSubject(value: string): string {
  const lower = value.toLowerCase();
  if (!lower.startsWith('did:agent:')) {
    return lower;
  }
  const parts = lower.split(':');
  const last = parts[parts.length - 1] || '';
  return last.startsWith('0x') ? last : `0x${last}`;
}

function toDid(value: string): string {
  if (!didPrefix) {
    return value;
  }
  const raw = value.startsWith('0x') ? value.slice(2) : value;
  return `${didPrefix}${raw}`;
}

export async function registerIdentityRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/identities',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const rows = await db.query.dids.findMany();
        return reply.send(
          rows.map((didRecord) => ({
            did: toDid(didRecord.id),
            controller: didRecord.controller,
            active: didRecord.active,
            metadataCid: didRecord.metadataCid,
            updatedAt: didRecord.updatedAt.getTime(),
          }))
        );
      } catch (error) {
        logger.error({ error }, 'Error fetching identities');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Querystring: { subject?: string; issuer?: string } }>(
    '/credentials',
    async (request: FastifyRequest<{ Querystring: { subject?: string; issuer?: string } }>, reply: FastifyReply) => {
      try {
        const { subject, issuer } = request.query;
        const subjectNormalized = subject ? normalizeSubject(subject) : undefined;
        const issuerNormalized = issuer ? normalizeSubject(issuer) : undefined;
        const whereClause =
          subjectNormalized && issuerNormalized
            ? and(eq(attestationsTable.subject, subjectNormalized), eq(attestationsTable.issuer, issuerNormalized))
            : subjectNormalized
            ? eq(attestationsTable.subject, subjectNormalized)
            : issuerNormalized
            ? eq(attestationsTable.issuer, issuerNormalized)
            : undefined;

        const rows = await db.query.attestations.findMany({
          where: whereClause,
        });

        return reply.send(
          rows.map((a) => ({
            uid: a.uid,
            schemaId: a.schemaId,
            issuer: a.issuer,
            subject: toDid(a.subject),
            issuedAt: a.issuedAt.getTime(),
            expiresAt: a.expiresAt?.getTime(),
            revoked: a.revoked,
          }))
        );
      } catch (error) {
        logger.error({ error }, 'Error fetching credentials');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Querystring: { owner?: string; agent?: string } }>(
    '/delegations',
    async (request: FastifyRequest<{ Querystring: { owner?: string; agent?: string } }>, reply: FastifyReply) => {
      try {
        const { owner, agent } = request.query;
        const ownerNormalized = owner ? normalizeSubject(owner) : undefined;
        const agentNormalized = agent ? normalizeSubject(agent) : undefined;
        const whereClause =
          ownerNormalized && agentNormalized
            ? and(eq(delegationsTable.owner, ownerNormalized), eq(delegationsTable.agent, agentNormalized))
            : ownerNormalized
            ? eq(delegationsTable.owner, ownerNormalized)
            : agentNormalized
            ? eq(delegationsTable.agent, agentNormalized)
            : undefined;

        const rows = await db.query.delegations.findMany({
          where: whereClause,
        });

        return reply.send(
          rows.map((d) => ({
            id: d.id,
            owner: toDid(d.owner),
            agent: d.agent,
            scope: d.scope.toString(),
            expiresAt: d.expiresAt?.getTime(),
            revoked: d.revoked,
          }))
        );
      } catch (error) {
        logger.error({ error }, 'Error fetching delegations');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Params: { did: string } }>(
    '/identity/:did',
    async (request: FastifyRequest<{ Params: { did: string } }>, reply: FastifyReply) => {
      try {
        const { did } = request.params;
        const didLower = normalizeSubject(did);

        const didRecord = await db.query.dids.findFirst({
          where: eq(didsTable.id, didLower),
        });

        if (!didRecord) {
          return reply.status(404).send({ error: 'DID not found' });
        }

        const document: DIDDocument = {
          did: toDid(didRecord.id),
          controller: didRecord.controller,
          active: didRecord.active,
          metadataCid: didRecord.metadataCid,
          updatedAt: didRecord.updatedAt.getTime(),
        };

        return reply.send(document);
      } catch (error) {
        logger.error({ error }, 'Error fetching DID document');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Params: { did: string } }>(
    '/identity/:did/trust-profile',
    async (request: FastifyRequest<{ Params: { did: string } }>, reply: FastifyReply) => {
      try {
        const { did } = request.params;
        const didLower = normalizeSubject(did);

        const didRecord = await db.query.dids.findFirst({
          where: eq(didsTable.id, didLower),
        });

        if (!didRecord) {
          return reply.status(404).send({ error: 'DID not found' });
        }

        const reputationScore = await reputationEngine.computeScore(didRecord.id);

        const attestationRecords = await db.query.attestations.findMany({
          where: eq(attestationsTable.subject, didRecord.id),
        });

        const delegationRecords = await db.query.delegations.findMany({
          where: eq(delegationsTable.owner, didRecord.id),
        });

        const trustProfile: TrustProfile = {
          did: toDid(didRecord.id),
          controller: didRecord.controller,
          score: reputationScore.score,
          tier: reputationScore.tier,
          scoreBreakdown: reputationScore.scoreBreakdown,
          humanReadableExplanation: reputationScore.humanReadableExplanation,
          credentials: attestationRecords.map((a) => ({
            uid: a.uid,
            schemaId: a.schemaId,
            issuer: a.issuer,
            issuedAt: a.issuedAt.getTime(),
            expiresAt: a.expiresAt?.getTime(),
            revoked: a.revoked,
          })),
          delegationChain: delegationRecords.map((d) => ({
            id: d.id,
            agent: d.agent,
            scope: d.scope.toString(),
            expiresAt: d.expiresAt?.getTime(),
            revoked: d.revoked,
          })),
          riskFlags: reputationScore.riskFlags,
          merkleRoot: reputationScore.proof.merkleRoot,
          proof: reputationScore.proof.proof,
          computedAt: reputationScore.computedAt,
          version: '1.0',
        };

        return reply.send(trustProfile);
      } catch (error) {
        logger.error({ error }, 'Error computing trust profile');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Params: { did: string } }>(
    '/identity/:did/credentials',
    async (request: FastifyRequest<{ Params: { did: string } }>, reply: FastifyReply) => {
      try {
        const { did } = request.params;
        const didLower = normalizeSubject(did);

        const attestationRecords = await db.query.attestations.findMany({
          where: eq(attestationsTable.subject, didLower),
        });

        const credentials = attestationRecords.map((a) => ({
          uid: a.uid,
          schemaId: a.schemaId,
          issuer: a.issuer,
          issuedAt: a.issuedAt.getTime(),
          expiresAt: a.expiresAt?.getTime(),
          revoked: a.revoked,
        }));

        return reply.send(credentials);
      } catch (error) {
        logger.error({ error }, 'Error fetching credentials');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Params: { did: string } }>(
    '/identity/:did/delegations',
    async (request: FastifyRequest<{ Params: { did: string } }>, reply: FastifyReply) => {
      try {
        const { did } = request.params;
        const didLower = normalizeSubject(did);

        const delegationRecords = await db.query.delegations.findMany({
          where: eq(delegationsTable.owner, didLower),
        });

        const delegationsList = delegationRecords.map((d) => ({
          id: d.id,
          agent: d.agent,
          scope: d.scope.toString(),
          expiresAt: d.expiresAt?.getTime(),
          revoked: d.revoked,
        }));

        return reply.send(delegationsList);
      } catch (error) {
        logger.error({ error }, 'Error fetching delegations');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
