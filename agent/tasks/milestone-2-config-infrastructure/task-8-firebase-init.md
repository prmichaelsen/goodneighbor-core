# Task 8: Firebase Admin Initialization

**Milestone**: [M2 - Config & Infrastructure](../../milestones/milestone-2-config-infrastructure.md)
**Estimated Time**: 2 hours
**Dependencies**: Task 7 (Config loader provides FirebaseConfig)
**Status**: Not Started

---

## Objective

Port the Firebase Admin SDK singleton initialization from the goodneighbor Next.js app. Implement `initializeFirebase(config)` with the singleton pattern (checks `admin.apps.length`), plus convenience functions `getAuth(config)`, `getFirestore(config)`, and `getStorage(config)`. The serviceAccountKey is parsed from JSON string at initialization time.

---

## Context

The goodneighbor Next.js app initializes Firebase Admin SDK in `lib/firebase-admin.ts` using a singleton pattern: it checks if an app already exists before calling `admin.initializeApp()`. This prevents multiple initialization errors in serverless environments where module scope persists across invocations.

goodneighbor-core ports this pattern into `src/config/firebase.ts`, accepting a `FirebaseConfig` object (from the Zod schema) instead of reading directly from `process.env`. The service account key is stored as a JSON string in the config and must be parsed at initialization time.

The convenience functions (`getAuth`, `getFirestore`, `getStorage`) provide a clean API for services that need specific Firebase sub-clients without managing the app instance directly.

---

## Steps

### 1. Create config/firebase.ts

Create `src/config/firebase.ts`:

```typescript
import * as admin from 'firebase-admin';
import { FirebaseConfig } from './schema';

/**
 * Cached Firebase app instance (singleton).
 * Prevents multiple initialization in serverless/module-caching environments.
 */
let firebaseApp: admin.app.App | null = null;

/**
 * Initializes Firebase Admin SDK as a singleton.
 * Parses the service account key from JSON string.
 *
 * Safe to call multiple times -- returns the existing app on subsequent calls.
 *
 * @param config - Firebase configuration with serviceAccountKey JSON string
 * @returns Firebase Admin app instance
 * @throws Error if serviceAccountKey is not valid JSON
 */
export function initializeFirebase(config: FirebaseConfig): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (admin.apps.length > 0) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  const serviceAccount = JSON.parse(config.serviceAccountKey);

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return firebaseApp;
}

/**
 * Returns a Firebase Auth instance.
 * Initializes Firebase if not already initialized.
 */
export function getAuth(config: FirebaseConfig): admin.auth.Auth {
  return initializeFirebase(config).auth();
}

/**
 * Returns a Firestore instance.
 * Initializes Firebase if not already initialized.
 */
export function getFirestore(config: FirebaseConfig): admin.firestore.Firestore {
  return initializeFirebase(config).firestore();
}

/**
 * Returns a Firebase Storage instance.
 * Initializes Firebase if not already initialized.
 */
export function getStorage(config: FirebaseConfig): admin.storage.Storage {
  return initializeFirebase(config).storage();
}

/**
 * Resets the cached Firebase app instance.
 * Only for use in tests to ensure clean state between test runs.
 *
 * WARNING: Do not call in production code.
 */
export function resetFirebaseForTesting(): void {
  firebaseApp = null;
}
```

### 2. Update config/index.ts Barrel Export

Add the firebase module to `src/config/index.ts`:

```typescript
export * from './schema';
export * from './loader';
export * from './secrets';
export * from './firebase';
```

### 3. Write Unit Tests with Mocked firebase-admin

Create `src/config/__tests__/firebase.spec.ts`:

```typescript
import {
  initializeFirebase,
  getAuth,
  getFirestore,
  getStorage,
  resetFirebaseForTesting,
} from '../firebase';
import { FirebaseConfig } from '../schema';

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const mockAuth = { verifySessionCookie: jest.fn() };
  const mockFirestore = { collection: jest.fn() };
  const mockStorage = { bucket: jest.fn() };

  const mockApp = {
    auth: jest.fn(() => mockAuth),
    firestore: jest.fn(() => mockFirestore),
    storage: jest.fn(() => mockStorage),
  };

  return {
    apps: [] as any[],
    app: jest.fn(() => mockApp),
    initializeApp: jest.fn(() => {
      // Simulate adding to apps array
      const mod = require('firebase-admin');
      mod.apps.push(mockApp);
      return mockApp;
    }),
    credential: {
      cert: jest.fn((serviceAccount: any) => serviceAccount),
    },
  };
});

describe('Firebase Admin Initialization', () => {
  const testConfig: FirebaseConfig = {
    serviceAccountKey: '{"type":"service_account","project_id":"test"}',
  };

  beforeEach(() => {
    resetFirebaseForTesting();
    // Reset the mocked apps array
    const admin = require('firebase-admin');
    admin.apps.length = 0;
    jest.clearAllMocks();
  });

  describe('initializeFirebase', () => {
    it('should initialize Firebase app on first call', () => {
      const admin = require('firebase-admin');
      const app = initializeFirebase(testConfig);
      expect(admin.initializeApp).toHaveBeenCalledTimes(1);
      expect(admin.credential.cert).toHaveBeenCalledWith({
        type: 'service_account',
        project_id: 'test',
      });
      expect(app).toBeDefined();
    });

    it('should return same app on subsequent calls (singleton)', () => {
      const app1 = initializeFirebase(testConfig);
      const admin = require('firebase-admin');
      admin.initializeApp.mockClear();

      const app2 = initializeFirebase(testConfig);
      expect(admin.initializeApp).not.toHaveBeenCalled();
      expect(app2).toBe(app1);
    });

    it('should throw on invalid JSON serviceAccountKey', () => {
      expect(() => initializeFirebase({
        serviceAccountKey: 'not-json',
      })).toThrow();
    });
  });

  describe('getAuth', () => {
    it('should return Firebase Auth instance', () => {
      const auth = getAuth(testConfig);
      expect(auth).toBeDefined();
      expect(auth.verifySessionCookie).toBeDefined();
    });
  });

  describe('getFirestore', () => {
    it('should return Firestore instance', () => {
      const firestore = getFirestore(testConfig);
      expect(firestore).toBeDefined();
      expect(firestore.collection).toBeDefined();
    });
  });

  describe('getStorage', () => {
    it('should return Storage instance', () => {
      const storage = getStorage(testConfig);
      expect(storage).toBeDefined();
      expect(storage.bucket).toBeDefined();
    });
  });
});
```

---

## Verification

- [ ] `src/config/firebase.ts` exists and exports initializeFirebase, getAuth, getFirestore, getStorage, resetFirebaseForTesting
- [ ] initializeFirebase() uses singleton pattern: caches the app instance and returns it on subsequent calls
- [ ] initializeFirebase() checks `admin.apps.length` before calling `admin.initializeApp()`
- [ ] initializeFirebase() parses serviceAccountKey JSON and passes it to `admin.credential.cert()`
- [ ] initializeFirebase() throws on invalid JSON serviceAccountKey
- [ ] getAuth() returns `admin.auth.Auth` instance
- [ ] getFirestore() returns `admin.firestore.Firestore` instance
- [ ] getStorage() returns `admin.storage.Storage` instance
- [ ] resetFirebaseForTesting() clears the cached app instance
- [ ] `src/config/index.ts` barrel exports the firebase module
- [ ] All unit tests pass with mocked firebase-admin
- [ ] TypeScript compiles without errors

---

## Expected Output

**File Structure**:
```
src/config/
├── __tests__/
│   ├── schema.spec.ts     # From Task 6
│   ├── secrets.spec.ts    # From Task 7
│   ├── loader.spec.ts     # From Task 7
│   └── firebase.spec.ts   # NEW: Firebase init tests
├── index.ts                # UPDATED: Barrel with firebase export
├── schema.ts               # From Task 6
├── loader.ts               # From Task 7
├── secrets.ts              # From Task 7
└── firebase.ts             # NEW: Firebase singleton initialization
```

**Key Files Created/Updated**:
- `src/config/firebase.ts`: Firebase Admin SDK singleton initialization with convenience functions
- `src/config/index.ts`: Updated barrel export

---

## Common Issues and Solutions

### Issue 1: Firebase already initialized error in tests
**Symptom**: "The default Firebase app already exists" error during test runs
**Solution**: Call `resetFirebaseForTesting()` in `beforeEach()` and reset the mocked `admin.apps` array. The singleton pattern caches the app in module scope, which persists across tests. The reset function clears this cache.

### Issue 2: firebase-admin mock does not match actual API
**Symptom**: TypeScript errors on the mock, or tests pass but integration fails
**Solution**: The mock only needs to implement the methods actually called by the functions under test. Keep the mock minimal. For integration testing against a real Firebase, use a separate test suite with the Firebase emulator.

### Issue 3: JSON.parse fails on service account key
**Symptom**: `SyntaxError: Unexpected token` when initializing Firebase
**Solution**: The serviceAccountKey must be a valid JSON string. In environment variables, this often requires escaping. In loadTestConfig(), the test value is a simple JSON object. Ensure the config loader does not double-escape the value.

---

## Resources

- Design doc: `agent/design/local.config-infrastructure.md` -- Firebase initialization specification
- Source: `lib/firebase-admin.ts` in the goodneighbor Next.js app
- [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup)

---

## Notes

- The `resetFirebaseForTesting()` function is exported explicitly for test use. It should never be called in production code. Consider adding a JSDoc warning or environment check.
- The singleton pattern is necessary for serverless environments (Lambda, Cloud Functions) where module scope persists across invocations. Without it, Firebase throws "app already exists" on the second invocation.
- The `admin.apps.length > 0` check handles the case where Firebase was initialized by another module or framework. In that case, we use the existing default app instead of creating a new one.
- The convenience functions (getAuth, getFirestore, getStorage) accept the config parameter and delegate to initializeFirebase. This means the config must be available at every call site, but it avoids global state beyond the cached app instance.

---

**Next Task**: [Task 9: Algolia Client Initialization & Test Config](./task-9-algolia-init-test-config.md)
**Related Design Docs**: `agent/design/local.config-infrastructure.md`
**Estimated Completion Date**: TBD
