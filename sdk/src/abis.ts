import { Abi } from "viem";

export const DIDRegistryABI: Abi = [
  {
    type: "function",
    name: "createDID",
    inputs: [
      { name: "controller", type: "address", internalType: "address" },
      { name: "metadataCid", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rotateKey",
    inputs: [
      { name: "did", type: "bytes32", internalType: "bytes32" },
      { name: "newController", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateMetadata",
    inputs: [
      { name: "did", type: "bytes32", internalType: "bytes32" },
      { name: "metadataCid", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "proposeRecovery",
    inputs: [
      { name: "did", type: "bytes32", internalType: "bytes32" },
      { name: "newController", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeRecovery",
    inputs: [
      { name: "did", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addGuardian",
    inputs: [
      { name: "did", type: "bytes32", internalType: "bytes32" },
      { name: "guardian", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeGuardian",
    inputs: [
      { name: "did", type: "bytes32", internalType: "bytes32" },
      { name: "guardian", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getDID",
    inputs: [{ name: "did", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct IDIDRegistry.DIDData",
        components: [
          { name: "id", type: "bytes32", internalType: "bytes32" },
          { name: "controller", type: "address", internalType: "address" },
          { name: "metadataCid", type: "string", internalType: "string" },
          { name: "active", type: "bool", internalType: "bool" },
          { name: "updatedAt", type: "uint256", internalType: "uint256" },
          { name: "keyRotationCount", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getController",
    inputs: [{ name: "did", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isActive",
    inputs: [{ name: "did", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "DIDCreated",
    inputs: [
      { name: "did", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "controller", type: "address", indexed: true, internalType: "address" },
      { name: "metadataCid", type: "string", indexed: false, internalType: "string" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "KeyRotated",
    inputs: [
      { name: "did", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "newController", type: "address", indexed: true, internalType: "address" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
];

export const SchemaRegistryABI: Abi = [
  {
    type: "function",
    name: "registerSchema",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "version", type: "string", internalType: "string" },
      { name: "schemaCid", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deprecateSchema",
    inputs: [{ name: "schemaId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getSchema",
    inputs: [{ name: "schemaId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISchemaRegistry.SchemaData",
        components: [
          { name: "id", type: "bytes32", internalType: "bytes32" },
          { name: "creator", type: "address", internalType: "address" },
          { name: "name", type: "string", internalType: "string" },
          { name: "version", type: "string", internalType: "string" },
          { name: "schemaCid", type: "string", internalType: "string" },
          { name: "active", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "schemaExists",
    inputs: [{ name: "schemaId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "SchemaRegistered",
    inputs: [
      { name: "schemaId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "name", type: "string", indexed: false, internalType: "string" },
      { name: "version", type: "string", indexed: false, internalType: "string" },
    ],
  },
];

export const AttestationRegistryABI: Abi = [
  {
    type: "function",
    name: "attest",
    inputs: [
      { name: "schemaId", type: "bytes32", internalType: "bytes32" },
      { name: "subject", type: "address", internalType: "address" },
      { name: "expiresAt", type: "uint256", internalType: "uint256" },
      { name: "dataCid", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "batchAttest",
    inputs: [
      {
        name: "attestations",
        type: "tuple[]",
        internalType: "struct IAttestationRegistry.AttestationRequest[]",
        components: [
          { name: "schemaId", type: "bytes32", internalType: "bytes32" },
          { name: "subject", type: "address", internalType: "address" },
          { name: "expiresAt", type: "uint256", internalType: "uint256" },
          { name: "dataCid", type: "string", internalType: "string" },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32[]", internalType: "bytes32[]" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeAttestation",
    inputs: [{ name: "uid", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyAttestation",
    inputs: [{ name: "uid", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAttestation",
    inputs: [{ name: "uid", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct IAttestationRegistry.AttestationData",
        components: [
          { name: "uid", type: "bytes32", internalType: "bytes32" },
          { name: "schemaId", type: "bytes32", internalType: "bytes32" },
          { name: "issuer", type: "address", internalType: "address" },
          { name: "subject", type: "address", internalType: "address" },
          { name: "issuedAt", type: "uint256", internalType: "uint256" },
          { name: "expiresAt", type: "uint256", internalType: "uint256" },
          { name: "dataCid", type: "string", internalType: "string" },
          { name: "revoked", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "AttestationCreated",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "issuer", type: "address", indexed: true, internalType: "address" },
      { name: "subject", type: "address", indexed: true, internalType: "address" },
      { name: "schemaId", type: "bytes32", indexed: false, internalType: "bytes32" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
];

export const DelegationRegistryABI: Abi = [
  {
    type: "function",
    name: "delegate",
    inputs: [
      { name: "agent", type: "address", internalType: "address" },
      { name: "scope", type: "uint256", internalType: "uint256" },
      { name: "expiresAt", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeDelegation",
    inputs: [{ name: "delegationId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isAuthorized",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "agent", type: "address", internalType: "address" },
      { name: "scope", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDelegation",
    inputs: [{ name: "delegationId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct IDelegationRegistry.DelegationData",
        components: [
          { name: "id", type: "bytes32", internalType: "bytes32" },
          { name: "owner", type: "address", internalType: "address" },
          { name: "agent", type: "address", internalType: "address" },
          { name: "scope", type: "uint256", internalType: "uint256" },
          { name: "expiresAt", type: "uint256", internalType: "uint256" },
          { name: "createdAt", type: "uint256", internalType: "uint256" },
          { name: "revoked", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAgentDelegations",
    inputs: [{ name: "agent", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bytes32[]", internalType: "bytes32[]" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "DelegationCreated",
    inputs: [
      { name: "delegationId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "owner", type: "address", indexed: true, internalType: "address" },
      { name: "agent", type: "address", indexed: true, internalType: "address" },
      { name: "scope", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "expiresAt", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
];

export const RevocationRegistryABI: Abi = [
  {
    type: "function",
    name: "revoke",
    inputs: [{ name: "uid", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "batchRevoke",
    inputs: [{ name: "uids", type: "bytes32[]", internalType: "bytes32[]" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isRevoked",
    inputs: [{ name: "uid", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Revoked",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "revoker", type: "address", indexed: true, internalType: "address" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
];
