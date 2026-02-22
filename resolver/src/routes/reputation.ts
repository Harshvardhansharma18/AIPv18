import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ReputationEngine } from '../reputation/engine.js';
import { keccak256 } from 'ethers';
import MerkleTree from 'merkletreejs';
import pino from 'pino';

const logger = pino();
const reputationEngine = new ReputationEngine();

const scoreProofSchema = z.object({
  subject: z.string(),
  score: z.number(),
  merkleRoot: z.string(),
  proof: z.array(z.string()),
  timestamp: z.number(),
});

function normalizeSubject(value: string): string {
  const lower = value.toLowerCase();
  if (!lower.startsWith('did:agent:')) {
    return lower;
  }
  const parts = lower.split(':');
  const last = parts[parts.length - 1] || '';
  return last.startsWith('0x') ? last : `0x${last}`;
}

export async function registerReputationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: { subject: string } }>(
    '/reputation/:subject',
    async (request: FastifyRequest<{ Params: { subject: string } }>, reply: FastifyReply) => {
      try {
        const { subject } = request.params;
        const subjectLower = normalizeSubject(subject);

        const score = await reputationEngine.computeScore(subjectLower);

        return reply.send(score);
      } catch (error) {
        logger.error({ error }, 'Error computing reputation score');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post<{ Body: z.infer<typeof scoreProofSchema> }>(
    '/reputation/verify',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parseResult = scoreProofSchema.safeParse(request.body);

        if (!parseResult.success) {
          return reply.status(400).send({ error: 'Invalid proof format' });
        }

        const proof = parseResult.data;

        const isValid = verifyMerkleProof(proof);

        return reply.send({
          valid: isValid,
          subject: proof.subject,
          score: proof.score,
          timestamp: proof.timestamp,
        });
      } catch (error) {
        logger.error({ error }, 'Error verifying proof');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}

function verifyMerkleProof(proof: z.infer<typeof scoreProofSchema>): boolean {
  try {
    const scoreHash = keccak256(
      Buffer.from(
        `${proof.subject}:${proof.score}:${proof.timestamp}`,
        'utf-8'
      )
    );

    const leaves = [scoreHash];
    const tree = new MerkleTree(leaves, keccak256 as any, { sortPairs: true });
    const root = tree.getRoot();

    const proofBuffers = proof.proof.map((p) => Buffer.from(p, 'hex'));
    const isValid = tree.verify(proofBuffers, scoreHash, root);

    return isValid;
  } catch (error) {
    logger.error({ error }, 'Error verifying merkle proof');
    return false;
  }
}
