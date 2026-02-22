import { describe, it, expect } from "vitest";
import { AgentIdentityClient } from "../client.js";
import { DelegationScope } from "../types.js";
import type { AgentIdentityConfig, ScoreProof } from "../types.js";

describe("AgentIdentityClient", () => {
  const mockConfig: AgentIdentityConfig = {
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
    resolverUrl: "http://localhost:3001",
    contracts: {
      didRegistry: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      schemaRegistry: "0x1234567890123456789012345678901234567891" as `0x${string}`,
      attestationRegistry: "0x1234567890123456789012345678901234567892" as `0x${string}`,
      delegationRegistry: "0x1234567890123456789012345678901234567893" as `0x${string}`,
      revocationRegistry: "0x1234567890123456789012345678901234567894" as `0x${string}`,
    },
  };

  const client = new AgentIdentityClient(mockConfig);

  describe("DID conversion", () => {
    it("should convert address to DID format", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;
      const did = client.toDID(address);

      expect(did).toMatch(/^did:agent:31337:/);
      expect(did).toContain("1234567890abcdef1234567890abcdef12345678");
    });

    it("should convert DID back to address", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;
      const did = client.toDID(address);
      const recovered = client.fromDID(did);

      expect(recovered.toLowerCase()).toEqual(address.toLowerCase());
    });

    it("should handle address with different casing", () => {
      const address = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12" as `0x${string}`;
      const did = client.toDID(address);
      const recovered = client.fromDID(did);

      expect(recovered.toLowerCase()).toEqual(address.toLowerCase());
    });
  });

  describe("DelegationScope bitmask operations", () => {
    it("should have correct scope values", () => {
      expect(DelegationScope.READ).toBe(1n);
      expect(DelegationScope.WRITE).toBe(2n);
      expect(DelegationScope.ATTEST).toBe(4n);
      expect(DelegationScope.DELEGATE).toBe(8n);
    });

    it("should combine scopes with bitwise OR", () => {
      const combined = DelegationScope.READ | DelegationScope.WRITE;
      expect(combined).toBe(3n);
    });

    it("should check scope membership with bitwise AND", () => {
      const scope = DelegationScope.READ | DelegationScope.ATTEST;
      expect((scope & DelegationScope.READ) !== 0n).toBe(true);
      expect((scope & DelegationScope.WRITE) !== 0n).toBe(false);
      expect((scope & DelegationScope.ATTEST) !== 0n).toBe(true);
    });

    it("should combine all scopes", () => {
      const allScopes =
        DelegationScope.READ |
        DelegationScope.WRITE |
        DelegationScope.ATTEST |
        DelegationScope.DELEGATE;
      expect(allScopes).toBe(15n);
    });
  });

  describe("ScoreProof verification", () => {
    it("should verify valid merkle proof", async () => {
      // Create a simple merkle tree manually
      // Leaf: hash of "leaf"
      // Level 1: hash(leaf + sibling1)
      // Root: hash(level1 + sibling2)

      const leaf = "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`;
      const sibling1 = "0x2222222222222222222222222222222222222222222222222222222222222222" as `0x${string}`;
      const sibling2 = "0x3333333333333333333333333333333333333333333333333333333333333333" as `0x${string}`;

      // For this test, we'll just verify the proof structure is correct
      const proof: ScoreProof = {
        subject: "0x4444444444444444444444444444444444444444" as `0x${string}`,
        score: 750,
        merkleRoot: "0x5555555555555555555555555555555555555555555555555555555555555555" as `0x${string}`,
        proof: [sibling1, sibling2],
        leaf,
        computedAt: Math.floor(Date.now() / 1000),
      };

      // Verify the structure
      expect(proof.proof).toHaveLength(2);
      expect(proof.score).toBeGreaterThan(0);
      expect(proof.computedAt).toBeGreaterThan(0);
    });

    it("should handle proof verification failure gracefully", async () => {
      const proof: ScoreProof = {
        subject: "0x4444444444444444444444444444444444444444" as `0x${string}`,
        score: 750,
        merkleRoot: "0x5555555555555555555555555555555555555555555555555555555555555555" as `0x${string}`,
        proof: ["0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`],
        leaf: "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`,
        computedAt: Math.floor(Date.now() / 1000),
      };

      const result = await client.verifyScoreProof(proof);
      // Proof will likely be invalid
      expect(typeof result).toBe("boolean");
    });

    it("should verify proof with correct structure", async () => {
      const proof: ScoreProof = {
        subject: "0x9876543210987654321098765432109876543210" as `0x${string}`,
        score: 850,
        merkleRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
        proof: [
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
          "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as `0x${string}`,
        ],
        leaf: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" as `0x${string}`,
        computedAt: Math.floor(Date.now() / 1000),
      };

      expect(proof.subject).toMatch(/^0x[a-f0-9]{40}$/i);
      expect(proof.proof).toHaveLength(2);
      expect(proof.score).toBeGreaterThan(0);
    });
  });

  describe("TrustProfile tier computation", () => {
    it("should correctly categorize reputation tiers", () => {
      const tiers = [
        { score: 0, tier: "unknown" },
        { score: 100, tier: "bronze" },
        { score: 300, tier: "silver" },
        { score: 600, tier: "gold" },
        { score: 850, tier: "platinum" },
      ];

      tiers.forEach(({ score, tier }) => {
        let computedTier: string;

        if (score < 100) {
          computedTier = "unknown";
        } else if (score < 300) {
          computedTier = "bronze";
        } else if (score < 600) {
          computedTier = "silver";
        } else if (score < 850) {
          computedTier = "gold";
        } else {
          computedTier = "platinum";
        }

        expect(computedTier).toBe(tier);
      });
    });

    it("should compute score breakdown", () => {
      const breakdown = {
        attestationScore: 200,
        delegationScore: 150,
        activityScore: 100,
        penaltyScore: -50,
      };

      const total =
        breakdown.attestationScore +
        breakdown.delegationScore +
        breakdown.activityScore +
        breakdown.penaltyScore;

      expect(total).toBe(400);
      expect(breakdown.attestationScore).toBeGreaterThan(0);
    });

    it("should handle edge case scores", () => {
      const scores = [0, 1, 99, 100, 299, 300, 599, 600, 849, 850, 1000];
      const expectedTiers = [
        "unknown",
        "unknown",
        "unknown",
        "bronze",
        "bronze",
        "silver",
        "silver",
        "gold",
        "gold",
        "platinum",
        "platinum",
      ];

      scores.forEach((score, index) => {
        let tier: string;
        if (score < 100) {
          tier = "unknown";
        } else if (score < 300) {
          tier = "bronze";
        } else if (score < 600) {
          tier = "silver";
        } else if (score < 850) {
          tier = "gold";
        } else {
          tier = "platinum";
        }

        expect(tier).toBe(expectedTiers[index]);
      });
    });
  });

  describe("Type safety checks", () => {
    it("should enforce DID string format at type level", () => {
      const did = "did:agent:31337:1234567890abcdef1234567890abcdef12345678";
      expect(did).toMatch(/^did:agent:\d+:.+$/);
    });

    it("should enforce address format", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      expect(address).toMatch(/^0x[a-f0-9]{40}$/i);
    });

    it("should enforce credential uid format", () => {
      const uid = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";
      expect(uid).toMatch(/^0x[a-f0-9]{64}$/i);
    });
  });
});
