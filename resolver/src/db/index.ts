import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, text, bigint, boolean, timestamp } from 'drizzle-orm/pg-core';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const dids = pgTable('dids', {
  id: text('id').primaryKey(),
  controller: text('controller').notNull(),
  metadataCid: text('metadata_cid').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  active: boolean('active').notNull().default(true),
  txHash: text('tx_hash').notNull(),
  blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
});

export const schemas = pgTable('schemas', {
  id: text('id').primaryKey(),
  creator: text('creator').notNull(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  schemaCid: text('schema_cid').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  active: boolean('active').notNull().default(true),
  txHash: text('tx_hash').notNull(),
});

export const attestations = pgTable('attestations', {
  uid: text('uid').primaryKey(),
  schemaId: text('schema_id').notNull(),
  issuer: text('issuer').notNull(),
  subject: text('subject').notNull(),
  issuedAt: timestamp('issued_at').notNull(),
  expiresAt: timestamp('expires_at'),
  dataCid: text('data_cid').notNull(),
  revoked: boolean('revoked').notNull().default(false),
  revokedAt: timestamp('revoked_at'),
  txHash: text('tx_hash').notNull(),
  blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
});

export const delegations = pgTable('delegations', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  agent: text('agent').notNull(),
  scope: bigint('scope', { mode: 'bigint' }).notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revoked: boolean('revoked').notNull().default(false),
  revokedAt: timestamp('revoked_at'),
  txHash: text('tx_hash').notNull(),
});

const schema = { dids, schemas, attestations, delegations };

export const db = drizzle(pool, { schema });

export async function closeDb(): Promise<void> {
  await pool.end();
}

export type Database = typeof db;
