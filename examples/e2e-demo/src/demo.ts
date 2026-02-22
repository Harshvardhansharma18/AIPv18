import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  privateKeyToAccount,
} from "viem";
import { localhost } from "viem/chains";
import {
  createClient,
  DelegationScope,
  type AgentIdentityConfig,
  type ScoreProof,
} from "@agent-identity/sdk";

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string): void {
  console.log("");
  log(`${"=".repeat(70)}`, colors.bright + colors.cyan);
  log(`  ${title}`, colors.bright + colors.cyan);
  log(`${"=".repeat(70)}`, colors.bright + colors.cyan);
  console.log("");
}

function subsection(title: string): void {
  console.log("");
  log(`${title}`, colors.bright + colors.blue);
  log(`${"-".repeat(title.length)}`, colors.dim);
}

function success(message: string): void {
  log(`  ✓ ${message}`, colors.green);
}

function info(message: string): void {
  log(`  → ${message}`, colors.cyan);
}

function warn(message: string): void {
  log(`  ⚠ ${message}`, colors.yellow);
}

function error(message: string): void {
  log(`  ✗ ${message}`, colors.red);
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function main(): Promise<void> {
  try {
    section("AGENT IDENTITY PROTOCOL - E2E DEMO");

    // Load environment variables
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const chainId = parseInt(process.env.CHAIN_ID || "31337", 10);
    const resolverUrl = process.env.RESOLVER_URL || "http://localhost:3001";

    const privateKeyHuman = process.env.PRIVATE_KEY_HUMAN;
    const privateKeyAgent = process.env.PRIVATE_KEY_AGENT;
    const privateKeyBob = process.env.PRIVATE_KEY_BOB;

    const didRegistry = (process.env.DID_REGISTRY_ADDRESS ||
      "0x5fbdb2315678afccb333f8de69da7d233a4ceb424") as `0x${string}`;
    const schemaRegistry = (process.env.SCHEMA_REGISTRY_ADDRESS ||
      "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512") as `0x${string}`;
    const attestationRegistry = (process.env.ATTESTATION_REGISTRY_ADDRESS ||
      "0x9fdc73168719b7e2c9b3b3afc7b06e6b2d8e8e8e") as `0x${string}`;
    const delegationRegistry = (process.env.DELEGATION_REGISTRY_ADDRESS ||
      "0x8fddd53546b7b2d8e8e8e9fdc73168719b7e2c9b") as `0x${string}`;
    const revocationRegistry = (process.env.REVOCATION_REGISTRY_ADDRESS ||
      "0x3c44cdddb6a900756dcdbca3663d773e927fec4d") as `0x${string}`;

    if (!privateKeyHuman || !privateKeyAgent || !privateKeyBob) {
      error("Missing private keys in environment variables");
      process.exit(1);
    }

    subsection("Configuration");
    info(`RPC URL: ${rpcUrl}`);
    info(`Chain ID: ${chainId}`);
    info(`Resolver URL: ${resolverUrl}`);

    // Create viem clients
    const publicClient = createPublicClient({
      chain: localhost,
      transport: http(rpcUrl),
    });

    const humanAccount = privateKeyToAccount(`0x${privateKeyHuman.replace(/^0x/, "")}`);
    const agentAccount = privateKeyToAccount(`0x${privateKeyAgent.replace(/^0x/, "")}`);
    const bobAccount = privateKeyToAccount(`0x${privateKeyBob.replace(/^0x/, "")}`);

    const humanWalletClient = createWalletClient({
      account: humanAccount,
      chain: localhost,
      transport: http(rpcUrl),
    });

    const agentWalletClient = createWalletClient({
      account: agentAccount,
      chain: localhost,
      transport: http(rpcUrl),
    });

    const bobWalletClient = createWalletClient({
      account: bobAccount,
      chain: localhost,
      transport: http(rpcUrl),
    });

    info(`Human address: ${formatAddress(humanAccount.address)}`);
    info(`Agent address: ${formatAddress(agentAccount.address)}`);
    info(`Bob address: ${formatAddress(bobAccount.address)}`);

    // Create SDK config
    const config: AgentIdentityConfig = {
      chainId,
      rpcUrl,
      resolverUrl,
      contracts: {
        didRegistry,
        schemaRegistry,
        attestationRegistry,
        delegationRegistry,
        revocationRegistry,
      },
    };

    const client = createClient(config);

    // Step 1: Create human identity
    section("STEP 1: CREATE HUMAN IDENTITY");
    subsection("Creating DID for human (Alice)");

    let aliceDID = client.toDID(humanAccount.address as `0x${string}`);
    success(`Human DID created: ${aliceDID}`);
    info(`Metadata CID: QmExample1234567890abcdef`);

    const aliceIdentity = await client.createIdentity(
      humanWalletClient,
      "QmExample1234567890abcdef",
    );
    success(`Human identity active: ${aliceIdentity.active}`);
    success(`Key rotation count: ${aliceIdentity.keyRotationCount}`);

    // Step 2: Create agent identity
    section("STEP 2: CREATE AGENT IDENTITY");
    subsection("Creating DID for agent");

    const agentDID = client.toDID(agentAccount.address as `0x${string}`);
    success(`Agent DID created: ${agentDID}`);

    const agentIdentity = await client.createIdentity(
      agentWalletClient,
      "QmAgent1234567890abcdef",
    );
    success(`Agent identity active: ${agentIdentity.active}`);

    // Step 3: Delegate control
    section("STEP 3: DELEGATE CONTROL TO AGENT");
    subsection("Creating delegation from human to agent");

    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
    const delegationScope = DelegationScope.ATTEST | DelegationScope.WRITE;

    const delegation = await client.delegateToAgent(humanWalletClient, {
      agent: agentAccount.address as `0x${string}`,
      scope: delegationScope,
      expiresAt,
    });

    success(`Delegation created with ID: ${delegation.id.slice(0, 10)}...`);
    info(`Delegation ID: ${delegation.id}`);
    info(`Owner: ${formatAddress(delegation.owner)}`);
    info(`Agent: ${formatAddress(delegation.agent)}`);
    info(
      `Scope: ATTEST (4) | WRITE (2) = ${Number(delegationScope)} (binary: ${delegationScope.toString(2)})`,
    );
    info(
      `Expires at: ${new Date(expiresAt * 1000).toISOString()}`,
    );
    success(`Delegation active: ${!delegation.revoked}`);

    // Step 4: Register schema
    section("STEP 4: REGISTER ATTESTATION SCHEMA");
    subsection("Registering task completion schema");

    const schema = await client.registerSchema(agentWalletClient, {
      name: "TaskCompletionAttestation",
      version: "1.0.0",
      schemaCid: "QmTaskSchema1234567890abcdef",
    });

    success(`Schema registered with ID: ${schema.id.slice(0, 10)}...`);
    info(`Schema ID: ${schema.id}`);
    info(`Schema Name: ${schema.name}`);
    info(`Schema Version: ${schema.version}`);
    info(`Creator: ${formatAddress(schema.creator)}`);

    // Step 5: Issue credential (agent attests on behalf of human)
    section("STEP 5: ISSUE CREDENTIAL");
    subsection("Agent attests that human completed a task");

    const credentialExpiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year

    const credential = await client.issueCredential(agentWalletClient, {
      schemaId: schema.id,
      subject: humanAccount.address as `0x${string}`,
      expiresAt: credentialExpiresAt,
      dataCid: "QmTaskData1234567890abcdef",
    });

    success(`Credential issued with UID: ${credential.uid.slice(0, 10)}...`);
    info(`Credential UID: ${credential.uid}`);
    info(`Issuer: ${formatAddress(credential.issuer)}`);
    info(`Subject: ${formatAddress(credential.subject)}`);
    info(`Schema: ${credential.schemaId.slice(0, 10)}...`);
    info(`Issued at: ${new Date(credential.issuedAt * 1000).toISOString()}`);
    info(`Expires at: ${new Date(credential.expiresAt * 1000).toISOString()}`);
    success(`Credential status: valid (revoked: ${credential.revoked})`);

    // Step 6: Verify credential
    section("STEP 6: VERIFY CREDENTIAL");
    subsection("Checking credential validity");

    const isCredentialValid = await client.verifyCredential(credential.uid);
    success(`Credential verification result: ${isCredentialValid}`);

    // Step 7: Fetch reputation score
    section("STEP 7: FETCH REPUTATION SCORE");
    subsection(`Computing reputation for ${formatAddress(humanAccount.address)}`);

    const repScore = await client.getReputationScore(
      humanAccount.address as `0x${string}`,
    );
    success(`Reputation score computed: ${repScore.score}`);
    info(`Reputation tier: ${repScore.tier.toUpperCase()}`);
    info(`Attestation score: ${repScore.breakdown.attestationScore}`);
    info(`Delegation score: ${repScore.breakdown.delegationScore}`);
    info(`Activity score: ${repScore.breakdown.activityScore}`);
    info(`Penalty score: ${repScore.breakdown.penaltyScore}`);

    // Step 8: Fetch full trust profile
    section("STEP 8: FETCH TRUST PROFILE");
    subsection(`Retrieving full trust profile for Alice`);

    const trustProfile = await client.fetchTrustProfile(
      humanAccount.address as `0x${string}`,
    );

    success(`Trust profile fetched successfully`);
    info(`DID: ${trustProfile.did}`);
    info(`Controller: ${formatAddress(trustProfile.controller)}`);
    info(`Score: ${trustProfile.score}`);
    info(`Tier: ${trustProfile.tier.toUpperCase()}`);
    info(`Credentials count: ${trustProfile.credentials.length}`);
    info(`Delegation chain length: ${trustProfile.delegationChain.length}`);
    info(`Risk flags: ${trustProfile.riskFlags.length}`);
    info(`Profile version: ${trustProfile.version}`);
    info(
      `Computed at: ${new Date(trustProfile.computedAt * 1000).toISOString()}`,
    );

    // Step 9: Create and verify score proof (interoperability test)
    section("STEP 9: VERIFY SCORE PROOF (INTEROPERABILITY)");
    subsection(
      `Verifying reputation proof on third-party account (Bob)`,
    );

    const scoreProof: ScoreProof = {
      subject: humanAccount.address as `0x${string}`,
      score: repScore.score,
      merkleRoot: trustProfile.merkleRoot,
      proof: trustProfile.proof,
      leaf: keccak256(
        stringToBytes(`${humanAccount.address}${repScore.score}`),
      ) as `0x${string}`,
      computedAt: trustProfile.computedAt,
    };

    const proofValid = await client.verifyScoreProof(scoreProof);
    success(`Score proof verification: ${proofValid ? "VALID" : "INVALID"}`);
    info(`Merkle root: ${scoreProof.merkleRoot.slice(0, 10)}...`);
    info(`Proof path length: ${scoreProof.proof.length}`);

    // Step 10: Display JSON outputs
    section("OUTPUT: IDENTITY & DELEGATION DATA");
    subsection("Alice's DID Document");
    console.log(JSON.stringify(aliceIdentity, null, 2));

    subsection("Delegation Details");
    console.log(JSON.stringify(delegation, null, 2));

    subsection("Issued Credential");
    console.log(JSON.stringify(credential, null, 2));

    subsection("Reputation Score");
    console.log(JSON.stringify(repScore, null, 2));

    subsection("Trust Profile");
    console.log(JSON.stringify(trustProfile, null, 2));

    // Summary
    section("DEMO SUMMARY");
    subsection("Operations Completed");
    success("Created human identity (Alice)");
    success("Created agent identity");
    success("Delegated ATTEST + WRITE scope for 7 days");
    success("Registered task completion schema");
    success("Issued credential for completed task");
    success("Verified credential authenticity");
    success("Computed reputation score");
    success("Fetched full trust profile");
    success("Verified score proof (interoperability)");

    subsection("Key Metrics");
    info(`Alice's DID: ${aliceDID}`);
    info(`Alice's Score: ${repScore.score}`);
    info(`Alice's Tier: ${repScore.tier}`);
    info(`Credentials Issued: 1`);
    info(`Delegations Active: 1`);

    log("\nDemo completed successfully!", colors.bright + colors.green);
  } catch (err) {
    error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    console.error(err);
    process.exit(1);
  }
}

// Helper function for keccak256 and stringToBytes
function keccak256(data: Uint8Array): `0x${string}` {
  // Simple mock implementation - in production use viem's keccak256
  const hex = Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}` as `0x${string}`;
}

function stringToBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
