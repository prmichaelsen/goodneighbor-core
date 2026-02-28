# Task 9: Algolia Client Initialization & Test Config

**Milestone**: [M2 - Config & Infrastructure](../../milestones/milestone-2-config-infrastructure.md)
**Estimated Time**: 2 hours
**Dependencies**: Task 7 (Config loader provides AlgoliaConfig; loadTestConfig required for integration test)
**Status**: Not Started

---

## Objective

Create Algolia client factory functions (`createAlgoliaAdminClient` and `createAlgoliaSearchClient`) that create Algolia client instances from the validated AlgoliaConfig, finalize the config module barrel export, and write an integration test verifying that `loadTestConfig()` produces a config object that can be used end-to-end with the Firebase and Algolia initialization functions (with mocked external dependencies).

---

## Context

The goodneighbor app uses Algolia for full-text search with permission-filtered faceting. Two client modes are needed:

- **Admin client**: Uses the admin API key for write operations (indexing, deleting, configuring). Used by SearchService for document management.
- **Search client**: Uses the search-only API key for read operations. Used by SearchService for user-facing search queries.

Both clients are created from the same `algoliasearch` package but with different API keys. The factory functions accept an `AlgoliaConfig` object (from the Zod schema) and return configured client instances.

The `algoliasearch` package may need to be added to `package.json` if not already present.

---

## Steps

### 1. Verify algoliasearch Dependency

Check if `algoliasearch` is in `package.json`. If not, add it:

```bash
npm install algoliasearch
```

### 2. Create config/algolia.ts

Create `src/config/algolia.ts`:

```typescript
import { algoliasearch } from 'algoliasearch';
import type { AlgoliaConfig } from './schema';

/**
 * Creates an Algolia client with admin API key.
 * Use for write operations: indexing, updating, deleting documents, configuring index settings.
 *
 * @param config - Algolia configuration with appId and adminApiKey
 * @returns Algolia client configured for admin operations
 */
export function createAlgoliaAdminClient(config: AlgoliaConfig) {
  return algoliasearch(config.appId, config.adminApiKey);
}

/**
 * Creates an Algolia client with search-only API key.
 * Use for read operations: searching, browsing.
 * The search API key has restricted permissions -- it cannot modify the index.
 *
 * @param config - Algolia configuration with appId and searchApiKey
 * @returns Algolia client configured for search operations
 */
export function createAlgoliaSearchClient(config: AlgoliaConfig) {
  return algoliasearch(config.appId, config.searchApiKey);
}
```

### 3. Finalize config/index.ts Barrel Export

Ensure `src/config/index.ts` exports all config modules:

```typescript
export * from './schema';
export * from './loader';
export * from './secrets';
export * from './firebase';
export * from './algolia';
```

### 4. Write Unit Tests for Algolia Factories

Create `src/config/__tests__/algolia.spec.ts`:

```typescript
import { createAlgoliaAdminClient, createAlgoliaSearchClient } from '../algolia';
import { AlgoliaConfig } from '../schema';

// Mock algoliasearch
jest.mock('algoliasearch', () => ({
  algoliasearch: jest.fn((appId: string, apiKey: string) => ({
    appId,
    apiKey,
    search: jest.fn(),
    saveObject: jest.fn(),
    deleteObject: jest.fn(),
  })),
}));

describe('Algolia Client Initialization', () => {
  const testConfig: AlgoliaConfig = {
    appId: 'test-app-id',
    adminApiKey: 'test-admin-key',
    searchApiKey: 'test-search-key',
    indexName: 'goodneighbor_test',
  };

  describe('createAlgoliaAdminClient', () => {
    it('should create a client with admin API key', () => {
      const client = createAlgoliaAdminClient(testConfig);
      expect(client).toBeDefined();
      const { algoliasearch } = require('algoliasearch');
      expect(algoliasearch).toHaveBeenCalledWith('test-app-id', 'test-admin-key');
    });
  });

  describe('createAlgoliaSearchClient', () => {
    it('should create a client with search API key', () => {
      const client = createAlgoliaSearchClient(testConfig);
      expect(client).toBeDefined();
      const { algoliasearch } = require('algoliasearch');
      expect(algoliasearch).toHaveBeenCalledWith('test-app-id', 'test-search-key');
    });
  });

  it('admin and search clients should use different API keys', () => {
    const adminClient = createAlgoliaAdminClient(testConfig) as any;
    const searchClient = createAlgoliaSearchClient(testConfig) as any;
    expect(adminClient.apiKey).toBe('test-admin-key');
    expect(searchClient.apiKey).toBe('test-search-key');
  });
});
```

### 5. Write Integration Test for End-to-End Config Flow

Create `src/config/__tests__/config-integration.spec.ts`:

```typescript
import { loadTestConfig } from '../loader';
import { Secret } from '../secrets';
import { initializeFirebase, resetFirebaseForTesting } from '../firebase';
import { createAlgoliaAdminClient, createAlgoliaSearchClient } from '../algolia';

// Mock external dependencies
jest.mock('firebase-admin', () => {
  const mockApp = {
    auth: jest.fn(() => ({})),
    firestore: jest.fn(() => ({})),
    storage: jest.fn(() => ({})),
  };
  return {
    apps: [] as any[],
    app: jest.fn(() => mockApp),
    initializeApp: jest.fn(() => {
      const mod = require('firebase-admin');
      mod.apps.push(mockApp);
      return mockApp;
    }),
    credential: {
      cert: jest.fn((sa: any) => sa),
    },
  };
});

jest.mock('algoliasearch', () => ({
  algoliasearch: jest.fn((appId: string, apiKey: string) => ({
    appId,
    apiKey,
    search: jest.fn(),
  })),
}));

describe('Config Integration', () => {
  beforeEach(() => {
    resetFirebaseForTesting();
    const admin = require('firebase-admin');
    admin.apps.length = 0;
    jest.clearAllMocks();
  });

  it('should load test config and initialize all clients without errors', () => {
    const config = loadTestConfig();

    // Verify config loaded successfully
    expect(config.app.appName).toBe('goodneighbor-test');

    // Initialize Firebase
    const firebaseApp = initializeFirebase(config.firebase);
    expect(firebaseApp).toBeDefined();

    // Create Algolia clients
    const adminClient = createAlgoliaAdminClient(config.algolia);
    expect(adminClient).toBeDefined();

    const searchClient = createAlgoliaSearchClient(config.algolia);
    expect(searchClient).toBeDefined();
  });

  it('should wrap sensitive config values in Secret without leaking', () => {
    const config = loadTestConfig();

    const firebaseSecret = new Secret(config.firebase.serviceAccountKey);
    const algoliaAdminSecret = new Secret(config.algolia.adminApiKey);

    // Verify secrets are redacted in string context
    expect(`${firebaseSecret}`).toBe('[REDACTED]');
    expect(`${algoliaAdminSecret}`).toBe('[REDACTED]');

    // Verify values are accessible via reveal
    expect(firebaseSecret.reveal()).toContain('test-project');
    expect(algoliaAdminSecret.reveal()).toBe('test-admin-key');
  });
});
```

### 6. Verify Package Dependencies

Ensure `package.json` includes `algoliasearch` in dependencies:

```bash
# Check if algoliasearch is installed
npm ls algoliasearch
```

If not installed, add it.

---

## Verification

- [ ] `src/config/algolia.ts` exists and exports createAlgoliaAdminClient and createAlgoliaSearchClient
- [ ] createAlgoliaAdminClient() creates client with config.appId and config.adminApiKey
- [ ] createAlgoliaSearchClient() creates client with config.appId and config.searchApiKey
- [ ] Admin and search clients use different API keys
- [ ] `src/config/index.ts` barrel exports all 5 config modules: schema, loader, secrets, firebase, algolia
- [ ] Integration test: loadTestConfig() -> initializeFirebase() -> createAlgoliaAdminClient() -> createAlgoliaSearchClient() all succeed without errors
- [ ] Integration test: Secret wrapping of sensitive config values redacts correctly
- [ ] `algoliasearch` is listed in package.json dependencies
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] TypeScript compiles without errors

---

## Expected Output

**File Structure**:
```
src/config/
├── __tests__/
│   ├── schema.spec.ts              # From Task 6
│   ├── secrets.spec.ts             # From Task 7
│   ├── loader.spec.ts              # From Task 7
│   ├── firebase.spec.ts            # From Task 8
│   ├── algolia.spec.ts             # NEW: Algolia factory tests
│   └── config-integration.spec.ts  # NEW: End-to-end config test
├── index.ts                         # FINALIZED: All 5 module exports
├── schema.ts                        # From Task 6
├── loader.ts                        # From Task 7
├── secrets.ts                       # From Task 7
├── firebase.ts                      # From Task 8
└── algolia.ts                       # NEW: Algolia client factories
```

**Key Files Created/Updated**:
- `src/config/algolia.ts`: Algolia admin and search client factories
- `src/config/index.ts`: Finalized barrel export with all config modules
- `src/config/__tests__/config-integration.spec.ts`: End-to-end config integration test

---

## Common Issues and Solutions

### Issue 1: algoliasearch import fails
**Symptom**: `Cannot find module 'algoliasearch'` or import errors
**Solution**: Install the package: `npm install algoliasearch`. If using the newer v5 API, the import may be `import { algoliasearch } from 'algoliasearch'` (named export) rather than a default export. Check the installed version's documentation.

### Issue 2: algoliasearch API differs between v4 and v5
**Symptom**: `algoliasearch is not a function` or unexpected client API
**Solution**: The v5 API uses `import { algoliasearch } from 'algoliasearch'` and returns a client object directly. The v4 API uses `import algoliasearch from 'algoliasearch'` and requires `.initIndex()`. The design doc uses v5 syntax. Verify the installed version matches.

### Issue 3: Integration test fails due to jest mock order
**Symptom**: `jest.mock()` does not apply to modules imported at the top of the file
**Solution**: `jest.mock()` calls are hoisted by Jest. Ensure the mock is declared before any import that transitively loads the mocked module. If issues persist, use `jest.doMock()` with dynamic `require()` inside the test.

---

## Resources

- Design doc: `agent/design/local.config-infrastructure.md` -- Algolia client specification
- Source: `lib/algolia.ts` in the goodneighbor Next.js app
- [Algolia JavaScript API Client v5](https://www.algolia.com/doc/api-client/getting-started/install/javascript/)

---

## Notes

- The factory functions do not cache client instances. Unlike Firebase (which requires singleton initialization), Algolia clients are lightweight and can be created multiple times. However, in practice, the ServiceContainer (future milestone) will hold a single instance of each client.
- The indexName is part of AlgoliaConfig but is not used by the factory functions. It is used by SearchService when performing operations against a specific index.
- This task completes Milestone 2. After this, all infrastructure is in place: validated config, secrets, Firebase Admin, and Algolia clients. Services in subsequent milestones can depend on these foundations.
- The integration test uses mocked external dependencies (firebase-admin, algoliasearch). Real integration tests against Firebase emulator and Algolia test servers would be in a separate test suite.

---

**Next Task**: None (this is the last task in Milestone 2)
**Related Design Docs**: `agent/design/local.config-infrastructure.md`
**Estimated Completion Date**: TBD
