import dotenv from 'dotenv';

dotenv.config();

interface ContractAddresses {
  DID_REGISTRY: string;
  SCHEMA_REGISTRY: string;
  ATTESTATION_REGISTRY: string;
  DELEGATION_REGISTRY: string;
  REVOCATION_REGISTRY: string;
}

interface Config {
  rpcUrl: string;
  chainId: number;
  databaseUrl: string;
  contractAddresses: ContractAddresses;
  startBlock: number;
  pollIntervalMs: number;
}

function parseContractAddresses(envVar: string): ContractAddresses {
  const addresses = JSON.parse(envVar);
  return {
    DID_REGISTRY: addresses.DID_REGISTRY,
    SCHEMA_REGISTRY: addresses.SCHEMA_REGISTRY,
    ATTESTATION_REGISTRY: addresses.ATTESTATION_REGISTRY,
    DELEGATION_REGISTRY: addresses.DELEGATION_REGISTRY,
    REVOCATION_REGISTRY: addresses.REVOCATION_REGISTRY,
  };
}

function loadConfig(): Config {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error('RPC_URL environment variable is required');
  }

  const chainIdStr = process.env.CHAIN_ID;
  if (!chainIdStr) {
    throw new Error('CHAIN_ID environment variable is required');
  }
  const chainId = parseInt(chainIdStr, 10);
  if (isNaN(chainId)) {
    throw new Error('CHAIN_ID must be a valid number');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const contractAddressesStr = process.env.CONTRACT_ADDRESSES;
  if (!contractAddressesStr) {
    throw new Error('CONTRACT_ADDRESSES environment variable is required');
  }

  let contractAddresses: ContractAddresses;
  try {
    contractAddresses = parseContractAddresses(contractAddressesStr);
  } catch (error) {
    throw new Error(`Failed to parse CONTRACT_ADDRESSES: ${String(error)}`);
  }

  const startBlockStr = process.env.START_BLOCK || '0';
  const startBlock = parseInt(startBlockStr, 10);
  if (isNaN(startBlock)) {
    throw new Error('START_BLOCK must be a valid number');
  }

  const pollIntervalMsStr = process.env.POLL_INTERVAL_MS || '12000';
  const pollIntervalMs = parseInt(pollIntervalMsStr, 10);
  if (isNaN(pollIntervalMs) || pollIntervalMs < 1000) {
    throw new Error('POLL_INTERVAL_MS must be a valid number >= 1000');
  }

  return {
    rpcUrl,
    chainId,
    databaseUrl,
    contractAddresses,
    startBlock,
    pollIntervalMs,
  };
}

export const config = loadConfig();
