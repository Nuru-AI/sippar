# Testing Tools

This directory contains development tools and utilities for testing Sippar.

## Structure

```
testing/
├── README.md              # This file
├── jest.config.js         # Jest configuration override
├── playwright.config.ts   # Playwright E2E configuration  
├── test-runner.js         # Custom test runner utilities
├── mock-data/            # Test data generators
├── fixtures/             # Static test fixtures
└── scripts/              # Testing automation scripts
```

## Usage

### Test Data Generation
```bash
node tools/testing/mock-data/generate-test-accounts.js
```

### Custom Test Runner
```bash
node tools/testing/test-runner.js --component=frontend --coverage
```

### Fixture Management
```bash
# Generate new fixtures
node tools/testing/fixtures/generate.js

# Clean old fixtures  
node tools/testing/fixtures/clean.js
```