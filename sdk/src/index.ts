export { AgentIdentityClient } from "./client.js";
export * from "./types.js";
export { DelegationScope } from "./types.js";
export {
  DIDRegistryABI,
  SchemaRegistryABI,
  AttestationRegistryABI,
  DelegationRegistryABI,
  RevocationRegistryABI,
} from "./abis.js";

import type { AgentIdentityConfig } from "./types.js";
import type { WalletClient } from "viem";
import { AgentIdentityClient } from "./client.js";

/**
 * Factory function to create an AgentIdentityClient instance
 */
export function createClient(
  config: AgentIdentityConfig,
  walletClient?: WalletClient,
): AgentIdentityClient {
  return new AgentIdentityClient(config, walletClient);
}
