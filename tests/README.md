# Sippar Testing Suite

## Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── frontend/           # React component and utility tests
│   ├── backend/           # API and business logic tests
│   └── canister/          # ICP canister logic tests
├── integration/            # Integration tests between components
│   ├── frontend/           # Frontend integration tests
│   ├── backend/           # Backend service integration tests
│   └── canister/          # Cross-canister integration tests
├── e2e/                    # End-to-end user flow tests
│   ├── frontend/           # Browser automation tests
│   ├── backend/           # API workflow tests
│   └── canister/          # Full chain integration tests
├── fixtures/               # Test data and mock responses
├── mocks/                 # Mock implementations
└── utils/                 # Testing utilities and helpers
```

## Current Test Files

### Unit Tests
- `test-blake2b.js` - BLAKE2b hashing algorithm tests
- `test-exact-algorithm.js` - Algorand address derivation tests
- `test-fixed-address.js` - Address validation tests
- `test-js-nacl.js` - NaCl cryptography tests
- `test-mainnet-address.js` - Mainnet address generation tests
- `test-sha512-256.js` - SHA512-256 hashing tests

### Integration Tests
- `debug-address.js` - Address generation debugging
- `debug-canister-output.js` - Canister interaction debugging
- `understand-checksum.js` - Checksum algorithm verification
- `validate-final-address.js` - End-to-end address validation
- `verify-understanding.js` - Algorithm understanding verification

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests for specific components
npm run test:frontend
npm run test:backend
npm run test:canister
```