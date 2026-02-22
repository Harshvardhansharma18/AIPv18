import fastify from 'fastify';
import cors from '@fastify/cors';
import { readFile } from 'node:fs/promises';
import { registerIdentityRoutes } from './routes/identity.js';
import { registerReputationRoutes } from './routes/reputation.js';
import { registerSchemaRoutes } from './routes/schema.js';
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = fastify({
  logger: true,
});

const previewUrl = new URL('../../preview.html', import.meta.url);

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

app.get('/', async (_request, reply) => {
  try {
    const html = await readFile(previewUrl, 'utf-8');
    return reply.type('text/html').send(html);
  } catch (error) {
    app.log.error({ error }, 'Failed to load preview UI');
    return reply.status(404).send({ error: 'Preview UI not found' });
  }
});

app.get('/health', async (_request, reply) => {
  return reply.send({ status: 'ok', timestamp: Date.now() });
});

await registerIdentityRoutes(app);
await registerReputationRoutes(app);
await registerSchemaRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  app.log.error({ error }, 'Unhandled error');
  reply.status(500).send({ error: 'Internal server error' });
});

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Resolver service started on ${HOST}:${PORT}`);
  } catch (error) {
    app.log.error(error, 'Failed to start resolver service');
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received, shutting down gracefully');
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  app.log.info('SIGINT received, shutting down gracefully');
  await app.close();
  process.exit(0);
});

start();
