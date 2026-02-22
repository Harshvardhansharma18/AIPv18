import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, schemas as schemasTable } from '../db/index.js';
import { eq } from 'drizzle-orm';
import pino from 'pino';

const logger = pino();

export async function registerSchemaRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: { id: string } }>(
    '/schema/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const idLower = id.toLowerCase();

        const schema = await db.query.schemas.findFirst({
          where: eq(schemasTable.id, idLower),
        });

        if (!schema) {
          return reply.status(404).send({ error: 'Schema not found' });
        }

        return reply.send({
          id: schema.id,
          creator: schema.creator,
          name: schema.name,
          version: schema.version,
          schemaCid: schema.schemaCid,
          createdAt: schema.createdAt.getTime(),
          active: schema.active,
          txHash: schema.txHash,
        });
      } catch (error) {
        logger.error({ error }, 'Error fetching schema');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get<{ Querystring: { creator?: string } }>(
    '/schemas',
    async (request: FastifyRequest<{ Querystring: { creator?: string } }>, reply: FastifyReply) => {
      try {
        const { creator } = request.query;

        const schemaRows = creator
          ? await db.query.schemas.findMany({
              where: eq(schemasTable.creator, creator.toLowerCase()),
            })
          : await db.query.schemas.findMany();

        return reply.send(
          schemaRows.map((s) => ({
            id: s.id,
            creator: s.creator,
            name: s.name,
            version: s.version,
            schemaCid: s.schemaCid,
            createdAt: s.createdAt.getTime(),
            active: s.active,
            txHash: s.txHash,
          }))
        );
      } catch (error) {
        logger.error({ error }, 'Error fetching schemas');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
