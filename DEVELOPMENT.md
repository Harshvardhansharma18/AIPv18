# Development Guide

Complete guide for developing and extending the Agent Identity Protocol.

## Project Structure

```
agent-identity-protocol/
├── sdk/                          # TypeScript SDK
│   ├── src/
│   │   ├── types.ts             # All type definitions
│   │   ├── abis.ts              # Contract ABIs (5 contracts)
│   │   ├── client.ts            # Main AgentIdentityClient
│   │   ├── index.ts             # Exports & factory
│   │   └── tests/
│   │       └── client.test.ts    # Vitest unit tests
│   ├── dist/                     # Compiled output
│   ├── package.json
│   └── tsconfig.json
│
├── examples/
│   └── e2e-demo/                 # End-to-end example
│       ├── src/
│       │   └── demo.ts           # Complete workflow demo
│       ├── .env.example
│       ├── package.json
│       └── tsconfig.json
│
├── contracts/                    # Smart contracts (Foundry)
├── resolver/                     # Reputation resolver service
├── indexer/                      # Event indexer
└── README.md                     # Full documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript 5.6+

### Setup

1. Clone the repository
2. Install SDK dependencies:
```bash
cd sdk
npm install
```

3. Install example dependencies:
```bash
cd ../examples/e2e-demo
npm install
```

## SDK Development

### Building the SDK

```bash
cd sdk
npm run build
```

Output goes to `sdk/dist/`:
- `dist/index.js` - Compiled JavaScript
- `dist/index.d.ts` - Type declarations
- `dist/**/*.js` - All module files
- `dist/**/*.d.ts` - All type declarations

### Running Tests

```bash
cd sdk
npm run test
```

Tests are in `src/tests/client.test.ts` using Vitest.

### Watch Mode

During development, use watch mode:
```bash
cd sdk
npm run dev
```

This automatically recompiles on file changes.

## Code Organization

### types.ts
Contains all TypeScript type definitions:
- DIDString, DIDDocument
- Credential, Credential interface
- Delegation, DelegationScope
- ReputationScore, ReputationEdge
- ScoreProof, TrustProfile
- RiskFlag, Schema
- AgentIdentityConfig

Keep types:
- Immutable with readonly where appropriate
- Strictly typed (no `any`)
- Documented with JSDoc
- Using branded types for string types

### abis.ts
Smart contract ABIs as viem format:
- DIDRegistryABI (10 functions + 2 events)
- SchemaRegistryABI (4 functions + 1 event)
- AttestationRegistryABI (5 functions + 1 event)
- DelegationRegistryABI (5 functions + 1 event)
- RevocationRegistryABI (3 functions + 1 event)

Each ABI includes:
- Function definitions with inputs/outputs
- Event definitions with indexed parameters
- Proper stateMutability annotations

### client.ts
Main AgentIdentityClient class (~470 lines):

**Public Methods:**
- Identity: createIdentity, getIdentity, rotateKey
- Credentials: issueCredential, revokeCredential, verifyCredential
- Delegation: delegateToAgent, revokeDelegation, isAgentAuthorized
- Reputation: verifyReputation, fetchTrustProfile, getReputationScore, verifyScoreProof
- Schemas: registerSchema, getSchema
- Utilities: toDID, fromDID

**Private Members:**
- config: AgentIdentityConfig
- publicClient: PublicClient
- walletClient: WalletClient (optional)

**Key Implementation Details:**
- DID format: `did:agent:${chainId}:${addressWithoutPrefix}`
- Uses viem for blockchain interaction
- Uses axios for HTTP resolver calls
- Uses keccak256 for hashing
- Error handling with try/catch
- Returns proper type structures

### index.ts
Re-exports and factory:
- `export { AgentIdentityClient }`
- `export * from "./types.js"`
- `export * from "./abis.js"`
- `export function createClient()` - Factory function

### client.test.ts
Comprehensive test suite (~320 lines):

**Test Suites:**
1. DID conversion
   - Address to DID
   - DID to address
   - Case handling

2. DelegationScope bitmask operations
   - Correct scope values
   - Bitwise OR combination
   - Bitwise AND checking
   - All scopes combined

3. ScoreProof verification
   - Valid proof structure
   - Failure handling
   - Format validation

4. TrustProfile tier computation
   - Tier categorization
   - Score breakdown
   - Edge cases

5. Type safety checks
   - DID format validation
   - Address format validation
   - UID format validation

Use `vitest` for test runner. Run with:
```bash
npm run test
```

## Example Development

### demo.ts Structure (~365 lines)

The demo executes 9 steps:

1. **Configuration**: Load env vars, create clients
2. **Create Human Identity**: Alice's DID
3. **Create Agent Identity**: Agent's DID
4. **Delegate Control**: ATTEST + WRITE scope, 7 days
5. **Register Schema**: Task completion schema
6. **Issue Credential**: Agent attests Alice
7. **Verify Credential**: Check credential validity
8. **Fetch Reputation**: Get score and tier
9. **Fetch Trust Profile**: Full profile with proof

**Key Implementation:**
- Color-coded terminal output
- Section/subsection formatting
- Formatted addresses (0xabcd...1234)
- JSON output for all data structures
- Error handling with exit codes
- Helper functions for logging

**Helper Functions:**
- `log()` - Print with color
- `section()` - Large section headers
- `subsection()` - Subsection headers
- `success()` - Green checkmark message
- `info()` - Blue arrow message
- `warn()` - Yellow warning
- `error()` - Red error message
- `formatAddress()` - Shorten addresses
- `keccak256()` - Hash utility
- `stringToBytes()` - Encoding utility

## Testing Strategy

### Unit Tests (SDK)

Test in `src/tests/client.test.ts`:
- Core client functionality
- Type conversions
- Bitmask operations
- Proof verification logic
- Tier computation
- Type safety

Run with:
```bash
npm run test
```

### Integration Tests (Example)

The demo script serves as integration test:
```bash
npm run demo
```

Tests against:
- Live blockchain (Anvil)
- Real contract addresses
- Complete workflow

## Extending the SDK

### Adding a New Method

1. Add type to `types.ts` if needed
2. Add ABI to `abis.ts` if calling new contract
3. Implement in `client.ts`:
   ```typescript
   async newMethod(param: Type): Promise<ReturnType> {
     try {
       // Implementation
       return result;
     } catch (error) {
       // Handle error
       throw new Error(`Failed to call newMethod: ${error}`);
     }
   }
   ```
4. Export from `index.ts` if public
5. Add tests to `client.test.ts`
6. Update READMEs

### Adding a New Type

1. Define in `types.ts`:
   ```typescript
   export interface NewType {
     field: Type;
   }
   ```
2. Use in client methods
3. Export from `index.ts`
4. Document in README.md

### Adding a New Smart Contract

1. Add ABI to `abis.ts`:
   ```typescript
   export const NewContractABI: Abi = [ ... ];
   ```
2. Update AgentIdentityConfig in types.ts
3. Add address to config in client.ts
4. Implement methods in client.ts
5. Add tests

## Build Process

### SDK Build

```bash
cd sdk
npm run build
```

TypeScript compiler outputs:
- JavaScript ES2020 modules
- Full type declarations (.d.ts)
- Source maps
- Declaration maps

### Example Build

The example uses `tsx` for runtime TypeScript:
```bash
cd examples/e2e-demo
npm run demo
```

No separate build needed - tsx handles compilation.

## Dependencies

### SDK

- **viem**: Ethereum interaction (publicClient, walletClient, types)
- **axios**: HTTP requests to resolver
- **zod**: Type validation (optional)

### Example

- **@agent-identity/sdk**: Local SDK package
- **viem**: Blockchain interaction
- **dotenv**: Environment variables
- **tsx**: Runtime TypeScript execution

## Type Safety

All code uses TypeScript strict mode:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitThis": true,
  "alwaysStrict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

Use:
- Branded types: `type DIDString = ...`
- Const assertions: `as const`
- Never type: for impossible branches
- Proper generics: `<T extends Type>`

## Performance Considerations

1. **Caching**: Implement caching for reputation scores
2. **Batching**: Use batch operations when possible
3. **Lazy Loading**: Load delegation chains on demand
4. **Async/Await**: Use proper async patterns
5. **Error Recovery**: Graceful degradation on failures

## Security Considerations

1. **Private Keys**: Never log or expose
2. **Secrets**: Use .env for configuration
3. **Input Validation**: Validate all inputs
4. **Type Safety**: Strict TypeScript prevents bugs
5. **Contract Interaction**: Use viem's safe abstractions

## Documentation

### Code Comments

Every public method has JSDoc:
```typescript
/**
 * Method description
 * @param param - Parameter description
 * @returns Return value description
 * @throws Error condition
 */
```

### README Files

- `/README.md` - Complete overview and API
- `/sdk/README.md` - SDK-specific guide
- `/examples/e2e-demo/README.md` - Demo walkthrough
- `/DEVELOPMENT.md` - This file

### Inline Comments

Explain "why", not "what":
```typescript
// Derive DID from address using chain ID
const did = this.toDID(address);
```

## Git Workflow

1. Create feature branch: `git checkout -b feature/name`
2. Make changes with tests
3. Run tests: `npm run test`
4. Build: `npm run build`
5. Commit: `git commit -m "feat: description"`
6. Push: `git push origin feature/name`
7. Create PR with test results

## Versioning

SDK follows semantic versioning:
- MAJOR: Breaking API changes
- MINOR: New features, backward compatible
- PATCH: Bug fixes

Update in `sdk/package.json` before release.

## Common Tasks

### Add a new feature
```bash
# Update types
# Update client.ts
# Add tests
npm run build
npm run test
# Update README.md
```

### Fix a bug
```bash
# Write failing test
# Fix implementation
npm run test
npm run build
```

### Deploy new version
```bash
# Update version in package.json
npm run build
npm publish
```

### Run complete workflow
```bash
# SDK
cd sdk && npm install && npm run build && npm run test

# Example
cd ../examples/e2e-demo && npm install && npm run demo
```

## Troubleshooting

### TypeScript errors
```bash
npm run build  # Check compilation
npm run test   # Check tests
```

### Runtime errors
```bash
npm run dev    # Watch mode to catch issues
npm run demo   # Run full workflow
```

### Dependency issues
```bash
rm package-lock.json
npm install
npm run build
```

## Resources

- [viem documentation](https://viem.sh)
- [TypeScript handbook](https://www.typescriptlang.org/docs/)
- [Vitest docs](https://vitest.dev)
- [Ethereum JSON-RPC](https://ethereum.org/en/developers/docs/apis/json-rpc/)

## Support

For questions or issues:
1. Check existing documentation
2. Review test examples
3. Check demo implementation
4. Open an issue with details

## Contributing

1. Fork the repository
2. Create feature branch
3. Follow code style (see existing code)
4. Add tests for new features
5. Update documentation
6. Submit PR with description

All contributions must:
- Pass tests: `npm run test`
- Build successfully: `npm run build`
- Follow type safety
- Include updated docs
