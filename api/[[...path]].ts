/**
 * Vercel Serverless Handler — wraps the Fastify resolver app
 *
 * All requests to https://your-project.vercel.app/* are routed here.
 * The Fastify app is initialised once per cold-start (module-level singleton).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerIdentityRoutes } from '../resolver/src/routes/identity.js';
import { registerReputationRoutes } from '../resolver/src/routes/reputation.js';
import { registerSchemaRoutes } from '../resolver/src/routes/schema.js';

// Module-level singleton — survives across warm invocations
let app: ReturnType<typeof Fastify> | null = null;

async function getApp() {
  if (app) return app;

  app = Fastify({ logger: false });

  await app.register(cors, { origin: '*', credentials: true });

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: Date.now(),
    env: process.env.NODE_ENV,
  }));

  await registerIdentityRoutes(app);
  await registerReputationRoutes(app);
  await registerSchemaRoutes(app);

  await app.ready();
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const fastify = await getApp();
  // Inject the incoming Node request into Fastify's HTTP server
  fastify.server.emit('request', req, res);
}
