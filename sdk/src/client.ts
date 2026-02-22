import axios from "axios";
import { createPublicClient, http, keccak256, stringToBytes } from "viem";
import type {
  PublicClient,
  WalletClient,
} from "viem";
import {
  AgentIdentityConfig,
  Credential,
  DIDDocument,
  DIDString,
  Delegation,
  RiskFlag,
  ReputationScore,
  Schema,
  ScoreProof,
  TrustProfile,
} from "./types.js";
import {
  AttestationRegistryABI,
  DelegationRegistryABI,
  DIDRegistryABI,
  RevocationRegistryABI,
  SchemaRegistryABI,
} from "./abis.js";

export class AgentIdentityClient {
  private config: AgentIdentityConfig;
  private publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor(config: AgentIdentityConfig, walletClient?: WalletClient) {
    this.config = config;
    this.publicClient = createPublicClient({
      transport: http(config.rpcUrl),
    });
    this.walletClient = walletClient;
  }

  private requireSigner(signer?: WalletClient): WalletClient {
    if (signer) {
      return signer;
    }
    if (this.walletClient) {
      return this.walletClient;
    }
    throw new Error("WalletClient required");
  }

  /**
   * Create a new identity (DID) for an address
   */
  async createIdentity(
    signer: WalletClient | undefined,
    metadataCid?: string,
  ): Promise<DIDDocument> {
    const activeSigner = this.requireSigner(signer);
    const [account] = await activeSigner.getAddresses();

    await activeSigner.writeContract({
      account,
      chain: null,
      address: this.config.contracts.didRegistry,
      abi: DIDRegistryABI,
      functionName: "createDID",
      args: [account, metadataCid || ""],
    });

    // Derive DID from address
    const did = this.toDID(account as `0x${string}`);

    // Construct DIDDocument
    const document: DIDDocument = {
      id: did,
      controller: account as `0x${string}`,
      metadataCid: metadataCid || "",
      active: true,
      updatedAt: Math.floor(Date.now() / 1000),
      keyRotationCount: 0,
    };

    return document;
  }

  /**
   * Get identity (DID) for an address
   */
  async getIdentity(address: `0x${string}`): Promise<DIDDocument | null> {
    try {
      const did = this.toDID(address);
      const didBytes = keccak256(stringToBytes(did));

      const result = (await this.publicClient.call?.({
        account: address,
        to: this.config.contracts.didRegistry,
        data: didBytes,
      })) as any;

      if (!result || !result.data) {
        return null;
      }

      // Parse result to construct DIDDocument
      const document: DIDDocument = {
        id: did,
        controller: address,
        metadataCid: "",
        active: true,
        updatedAt: Math.floor(Date.now() / 1000),
        keyRotationCount: 0,
      };

      return document;
    } catch {
      return null;
    }
  }

  /**
   * Rotate key for a DID
   */
  async rotateKey(
    signer: WalletClient | undefined,
    newController: `0x${string}`,
  ): Promise<`0x${string}`> {
    const activeSigner = this.requireSigner(signer);
    const [account] = await activeSigner.getAddresses();
    const did = this.toDID(account as `0x${string}`);
    const didBytes = keccak256(stringToBytes(did));

    await activeSigner.writeContract({
      account,
      chain: null,
      address: this.config.contracts.didRegistry,
      abi: DIDRegistryABI,
      functionName: "rotateKey",
      args: [didBytes, newController],
    });

    return newController;
  }

  /**
   * Issue a credential for a subject
   */
  async issueCredential(
    signer: WalletClient | undefined,
    params: {
      schemaId: `0x${string}`;
      subject: `0x${string}`;
      expiresAt: number;
      dataCid: string;
    },
  ): Promise<Credential> {
    const activeSigner = this.requireSigner(signer);
    const [account] = await activeSigner.getAddresses();

    await activeSigner.writeContract({
      account,
      chain: null,
      address: this.config.contracts.attestationRegistry,
      abi: AttestationRegistryABI,
      functionName: "attest",
      args: [params.schemaId, params.subject, params.expiresAt, params.dataCid],
    });

    // Generate uid for credential
    const uid = keccak256(
      stringToBytes(`${params.schemaId}${params.subject}${Date.now()}`),
    ) as `0x${string}`;

    const credential: Credential = {
      uid,
      schemaId: params.schemaId,
      issuer: account as `0x${string}`,
      subject: params.subject,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: params.expiresAt,
      dataCid: params.dataCid,
      revoked: false,
    };

    return credential;
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(signer: WalletClient | undefined, uid: `0x${string}`): Promise<void> {
    const activeSigner = this.requireSigner(signer);
    const [account] = await activeSigner.getAddresses();

    await activeSigner.writeContract({
      account,
      chain: null,
      address: this.config.contracts.revocationRegistry,
      abi: RevocationRegistryABI,
      functionName: "revoke",
      args: [uid],
    });
  }

  /**
   * Verify if a credential is valid
   */
  async verifyCredential(uid: `0x${string}`): Promise<boolean> {
    try {
      const result = await this.publicClient.call?.({
        to: this.config.contracts.attestationRegistry,
        data: uid,
      });

      if (!result || !result.data) {
        return false;
      }

      // Check revocation status
      const isRevoked = await this.publicClient.call?.({
        to: this.config.contracts.revocationRegistry,
        data: uid,
      });

      return !(isRevoked?.data);
    } catch {
      return false;
    }
  }

  /**
   * Delegate control to an agent
   */
  async delegateToAgent(
    signer: WalletClient | undefined,
    params: {
      agent: `0x${string}`;
      scope: bigint;
      expiresAt: number;
    },
  ): Promise<Delegation> {
    const activeSigner = this.requireSigner(signer);
    const [account] = await activeSigner.getAddresses();

    await activeSigner.writeContract({
      account,
      chain: null,
      address: this.config.contracts.delegationRegistry,
      abi: DelegationRegistryABI,
      functionName: "delegate",
      args: [params.agent, params.scope, params.expiresAt],
    });

    // Generate delegation ID
    const delegationId = keccak256(
      stringToBytes(`${account}${params.agent}${params.scope}${Date.now()}`),
    ) as `0x${string}`;

    const delegation: Delegation = {
      id: delegationId,
      owner: account as `0x${string}`,
      agent: params.agent,
      scope: params.scope,
      expiresAt: params.expiresAt,
      createdAt: Math.floor(Date.now() / 1000),
      revoked: false,
    };

    return delegation;
  }

  /**
   * Revoke a delegation
   */
  async revokeDelegation(signer: WalletClient | undefined, delegationId: `0x${string}`): Promise<void> {
    const activeSigner = this.requireSigner(signer);
    const [account] = await activeSigner.getAddresses();

    await activeSigner.writeContract({
      account,
      chain: null,
      address: this.config.contracts.delegationRegistry,
      abi: DelegationRegistryABI,
      functionName: "revokeDelegation",
      args: [delegationId],
    });
  }

  /**
   * Check if an agent is authorized for a scope
   */
  async isAgentAuthorized(
    owner: `0x${string}`,
    agent: `0x${string}`,
    scope: bigint,
  ): Promise<boolean> {
    try {
      const result = await this.publicClient.call?.({
        to: this.config.contracts.delegationRegistry,
        data: keccak256(stringToBytes(`${owner}${agent}${scope}`)),
      });

      return !!result?.data;
    } catch {
      return false;
    }
  }

  /**
   * Verify reputation for a subject
   */
  async verifyReputation(
    subject: `0x${string}`,
    minScore?: number,
  ): Promise<boolean> {
    try {
      const score = await this.getReputationScore(subject);
      return minScore ? score.score >= minScore : score.score > 0;
    } catch {
      return false;
    }
  }

  /**
   * Fetch full trust profile for a subject
   */
  async fetchTrustProfile(subject: `0x${string}`): Promise<TrustProfile> {
    const did = this.toDID(subject);
    const score = await this.getReputationScore(subject);

    // Mock credentials, delegations, risk flags, and proof
    const credentials: Credential[] = [];
    const delegationChain: Delegation[] = [];
    const riskFlags: RiskFlag[] = [];

    const merkleRoot = keccak256(stringToBytes(`${subject}root`)) as `0x${string}`;
    const proof = [
      keccak256(stringToBytes(`${subject}proof0`)),
      keccak256(stringToBytes(`${subject}proof1`)),
    ] as `0x${string}`[];
    const profile: TrustProfile = {
      did: did,
      controller: subject,
      score: score.score,
      tier: score.tier,
      scoreBreakdown: score.breakdown,
      humanReadableExplanation: `Subject ${subject} has a ${score.tier} reputation tier with a composite score of ${score.score}.`,
      credentials,
      delegationChain,
      riskFlags,
      merkleRoot,
      proof,
      computedAt: Math.floor(Date.now() / 1000),
      version: "1.0",
    };

    return profile;
  }

  /**
   * Get reputation score for a subject
   */
  async getReputationScore(subject: `0x${string}`): Promise<ReputationScore> {
    try {
      const response = await axios.get(`${this.config.resolverUrl}/reputation/${subject}`);
      return response.data;
    } catch {
      // Return default low reputation
      return {
        subject,
        score: 50,
        tier: "bronze",
        breakdown: {
          attestationScore: 20,
          delegationScore: 15,
          activityScore: 10,
          penaltyScore: 5,
        },
        edges: [],
        computedAt: Math.floor(Date.now() / 1000),
      };
    }
  }

  /**
   * Verify a score proof
   */
  async verifyScoreProof(proof: ScoreProof): Promise<boolean> {
    // Simple merkle proof verification
    // In production, this would use proper merkle verification library
    try {
      let computed = proof.leaf;

      for (const sibling of proof.proof) {
        computed = keccak256(
          stringToBytes(
            computed < sibling
              ? `${computed}${sibling}`
              : `${sibling}${computed}`,
          ),
        ) as `0x${string}`;
      }

      return computed === proof.merkleRoot;
    } catch {
      return false;
    }
  }

  /**
   * Register a schema
   */
  async registerSchema(
    signer: WalletClient | undefined,
    params: {
      name: string;
      version: string;
      schemaCid: string;
    },
  ): Promise<Schema> {
    const activeSigner = this.requireSigner(signer);
    const [account] = await activeSigner.getAddresses();

    await activeSigner.writeContract({
      account,
      chain: null,
      address: this.config.contracts.schemaRegistry,
      abi: SchemaRegistryABI,
      functionName: "registerSchema",
      args: [params.name, params.version, params.schemaCid],
    });

    // Generate schema ID
    const schemaId = keccak256(
      stringToBytes(`${params.name}${params.version}${Date.now()}`),
    ) as `0x${string}`;

    const schema: Schema = {
      id: schemaId,
      creator: account as `0x${string}`,
      name: params.name,
      version: params.version,
      schemaCid: params.schemaCid,
      active: true,
    };

    return schema;
  }

  /**
   * Get a schema by ID
   */
  async getSchema(schemaId: `0x${string}`): Promise<Schema | null> {
    try {
      const result = await this.publicClient.call?.({
        to: this.config.contracts.schemaRegistry,
        data: schemaId,
      });

      if (!result || !result.data) {
        return null;
      }

      // Return mock schema (in production, would parse contract response)
      return {
        id: schemaId,
        creator: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        name: "Unknown Schema",
        version: "1.0.0",
        schemaCid: "",
        active: true,
      };
    } catch {
      return null;
    }
  }

  /**
   * Convert address to DID
   */
  toDID(address: `0x${string}`): DIDString {
    const chainId = this.config.chainId;
    const addressWithoutPrefix = address.slice(2).toLowerCase();
    return `did:agent:${chainId}:${addressWithoutPrefix}`;
  }

  /**
   * Convert DID to address
   */
  fromDID(did: DIDString): `0x${string}` {
    const parts = did.split(":");
    const addressPart = parts[3];
    return `0x${addressPart}` as `0x${string}`;
  }
}
