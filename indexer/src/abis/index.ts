export const DID_REGISTRY_ABI = [
  {
    type: 'event',
    name: 'DIDCreated',
    inputs: [
      { name: 'controller', type: 'address', indexed: true },
      { name: 'metadataCid', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DIDUpdated',
    inputs: [
      { name: 'did', type: 'address', indexed: true },
      { name: 'metadataCid', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DIDKeyRotated',
    inputs: [
      { name: 'did', type: 'address', indexed: true },
      { name: 'newKeyHash', type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RecoveryProposed',
    inputs: [
      { name: 'did', type: 'address', indexed: true },
      { name: 'newController', type: 'address', indexed: false },
      { name: 'timestamp', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RecoveryExecuted',
    inputs: [
      { name: 'did', type: 'address', indexed: true },
      { name: 'newController', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DelegationCreated',
    inputs: [
      { name: 'delegationId', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'agent', type: 'address', indexed: true },
      { name: 'scope', type: 'bytes32', indexed: false },
      { name: 'expiresAt', type: 'uint64', indexed: false },
    ],
  },
] as const;

export const SCHEMA_REGISTRY_ABI = [
  {
    type: 'event',
    name: 'SchemaRegistered',
    inputs: [
      { name: 'schemaId', type: 'bytes32', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'version', type: 'string', indexed: false },
      { name: 'schemaCid', type: 'string', indexed: false },
    ],
  },
] as const;

export const ATTESTATION_REGISTRY_ABI = [
  {
    type: 'event',
    name: 'AttestationIssued',
    inputs: [
      { name: 'uid', type: 'bytes32', indexed: true },
      { name: 'schemaId', type: 'bytes32', indexed: true },
      { name: 'issuer', type: 'address', indexed: true },
      { name: 'subject', type: 'address', indexed: false },
      { name: 'expiresAt', type: 'uint64', indexed: false },
      { name: 'dataCid', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AttestationRevoked',
    inputs: [
      { name: 'uid', type: 'bytes32', indexed: true },
      { name: 'revoker', type: 'address', indexed: true },
    ],
  },
] as const;

export const DELEGATION_REGISTRY_ABI = [
  {
    type: 'event',
    name: 'DelegationCreated',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'agent', type: 'address', indexed: true },
      { name: 'scope', type: 'bytes32', indexed: false },
      { name: 'expiresAt', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DelegationRevoked',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'revoker', type: 'address', indexed: true },
    ],
  },
] as const;

export const REVOCATION_REGISTRY_ABI = [
  {
    type: 'event',
    name: 'CredentialRevoked',
    inputs: [
      { name: 'credentialId', type: 'bytes32', indexed: true },
      { name: 'revoker', type: 'address', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
] as const;
