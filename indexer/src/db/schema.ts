import { pgTable, text, bigint, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

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

export const revocations = pgTable('revocations', {
  credentialId: text('credential_id').primaryKey(),
  revoker: text('revoker').notNull(),
  revokedAt: timestamp('revoked_at').notNull().defaultNow(),
  reason: text('reason'),
  txHash: text('tx_hash').notNull(),
});

export const indexerState = pgTable('indexer_state', {
  chainId: integer('chain_id').primaryKey(),
  lastProcessedBlock: bigint('last_processed_block', { mode: 'number' }).notNull().default(0),
});

export type DID = typeof dids.$inferSelect;
export type Schema = typeof schemas.$inferSelect;
export type Attestation = typeof attestations.$inferSelect;
export type Delegation = typeof delegations.$inferSelect;
export type Revocation = typeof revocations.$inferSelect;
export type IndexerState = typeof indexerState.$inferSelect;
