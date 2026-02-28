# Task 28: Integration Tests

**Milestone**: [M7 - ServiceContainer, Build & Publish](../../milestones/milestone-7-servicecontainer-build-publish.md)
**Estimated Time**: 4 hours
**Dependencies**: Task 26 (ServiceContainer), Task 27 (Package Build & Exports)
**Status**: Not Started

---

## Objective

Write integration tests that verify end-to-end flows against the Firebase emulator suite. Test Firestore read/write for posts, profiles, feeds, and comments. Test Auth session verification. Test Algolia indexing via a mock or dedicated test index. Create test data factories in `testing/fixtures.ts` and emulator connection setup in `testing/helpers.ts`. Configure a separate Jest configuration for integration tests.

---

## Context

Unit tests (written in M2-M6) verify each service in isolation with mocked dependencies. Integration tests verify that services work correctly against real Firebase infrastructure (via emulators) and that the ServiceContainer wires everything together properly. These tests catch issues that unit tests miss: Firestore field type mismatches, collection path errors, Auth token format issues, and Algolia indexing/query round-trip problems.

The Firebase emulator suite provides local emulators for Firestore and Auth. Algolia does not have a local emulator, so search integration tests either use a dedicated test index or mock the Algolia client at the HTTP level.

Integration tests run separately from unit tests (different Jest config) because they require the Firebase emulator to be running and take longer to execute. They should not run in the default `npm test` command.

The key Firestore collections used in integration tests:
- `goodneighbor.search` -- unified content collection (posts, feeds)
- `goodneighbor/collections/public-profiles` -- public profile documents
- `goodneighbor/collections/post-comments` -- comments on posts
- `goodneighbor/collections/feed-followers` -- feed follower relationships

---

## Steps

### 1. Create Jest Integration Test Configuration

Create `jest.integration.config.ts` at the project root:

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.integration.spec.ts'],
  setupFilesAfterSetup: ['<rootDir>/tests/integration/setup.ts'],
  // Longer timeout for emulator interactions
  testTimeout: 30000,
  // Do not run in parallel -- emulator state is shared
  maxWorkers: 1,
};

export default config;
```

Add a script to `package.json`:

```json
{
  "scripts": {
    "test:integration": "jest --config jest.integration.config.ts"
  }
}
```

### 2. Create Integration Test Setup File

Create `tests/integration/setup.ts` with emulator connection and cleanup:

```typescript
import * as admin from 'firebase-admin';

/**
 * Integration test setup.
 * Connects to Firebase emulators and provides cleanup between tests.
 */

// Ensure emulator environment variables are set
const FIRESTORE_EMULATOR = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const AUTH_EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

// Set emulator env vars before Firebase initialization
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR;
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR;

let app: admin.app.App;

beforeAll(async () => {
  // Initialize Firebase with a test project
  if (admin.apps.length === 0) {
    app = admin.initializeApp({
      projectId: 'goodneighbor-test',
    });
  } else {
    app = admin.app();
  }
});

afterAll(async () => {
  // Clean up Firebase app
  if (app) {
    await app.delete();
  }
});
```

### 3. Update testing/helpers.ts with Emulator Utilities

Update `src/testing/helpers.ts` with utilities for integration tests:

```typescript
import * as admin from 'firebase-admin';

/**
 * Get a Firestore instance connected to the emulator.
 * Requires FIRESTORE_EMULATOR_HOST to be set.
 */
export function getTestFirestore(): admin.firestore.Firestore {
  return admin.firestore();
}

/**
 * Get an Auth instance connected to the emulator.
 * Requires FIREBASE_AUTH_EMULATOR_HOST to be set.
 */
export function getTestAuth(): admin.auth.Auth {
  return admin.auth();
}

/**
 * Clear all documents in a Firestore collection.
 * Useful for cleanup between integration tests.
 */
export async function clearCollection(
  firestore: admin.firestore.Firestore,
  collectionPath: string,
): Promise<void> {
  const snapshot = await firestore.collection(collectionPath).get();
  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

/**
 * Clear multiple collections in parallel.
 */
export async function clearCollections(
  firestore: admin.firestore.Firestore,
  collectionPaths: string[],
): Promise<void> {
  await Promise.all(
    collectionPaths.map((path) => clearCollection(firestore, path)),
  );
}

/**
 * Create a test user in the Firebase Auth emulator.
 * Returns the created user record.
 */
export async function createTestUser(
  auth: admin.auth.Auth,
  overrides?: Partial<admin.auth.CreateRequest>,
): Promise<admin.auth.UserRecord> {
  const defaults: admin.auth.CreateRequest = {
    email: `test-${Date.now()}@example.com`,
    password: 'test-password-123',
    displayName: 'Test User',
  };
  return auth.createUser({ ...defaults, ...overrides });
}

/**
 * Delete a test user from the Firebase Auth emulator.
 */
export async function deleteTestUser(
  auth: admin.auth.Auth,
  uid: string,
): Promise<void> {
  try {
    await auth.deleteUser(uid);
  } catch {
    // Ignore -- user may not exist
  }
}
```

### 4. Update testing/fixtures.ts with Test Data Factories

Update `src/testing/fixtures.ts` with factory functions for all entity types:

```typescript
import { COLLECTIONS } from '../constants/collections';

/**
 * Test data factories for integration tests.
 * Each factory returns a minimal valid entity with sensible defaults.
 * Override specific fields as needed for each test case.
 */

/** Create a test post document for Firestore */
export function createTestPost(overrides?: Record<string, unknown>) {
  const now = new Date().toISOString();
  return {
    id: `test-post-${Date.now()}`,
    type: 'post',
    title: 'Test Post Title',
    body: 'This is a test post body with enough content to be valid.',
    category: 'general',
    status: 'published',
    createdAt: now,
    updatedAt: now,
    refs: {
      hasViewer: ['@public'],
      hasOwner: ['@uid:test-user-1'],
      hasAuthor: ['@uid:test-user-1'],
      hasCreator: ['@uid:test-user-1'],
      hasFollower: [],
      hasSharer: [],
      hasLiker: [],
      hasTag: [],
      hasMention: [],
      hasCollaborator: [],
      hasEditPermissions: ['@uid:test-user-1'],
      hasArchivePermissions: ['@uid:test-user-1'],
      hasUpdateViewersPermissions: ['@uid:test-user-1'],
      hasConfigurePropertiesPermissions: ['@uid:test-user-1'],
    },
    stats: {
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
    },
    ...overrides,
  };
}

/** Create a test public profile document for Firestore */
export function createTestPublicProfile(overrides?: Record<string, unknown>) {
  const now = new Date().toISOString();
  return {
    uid: `test-user-${Date.now()}`,
    displayName: 'Test User',
    username: `testuser-${Date.now()}`,
    bio: 'A test user profile',
    avatarUrl: '',
    location: '',
    website: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Create a test feed document for Firestore */
export function createTestFeed(overrides?: Record<string, unknown>) {
  const now = new Date().toISOString();
  return {
    id: `test-feed-${Date.now()}`,
    type: 'feed',
    title: 'Test Feed',
    description: 'A test feed for integration testing.',
    feedType: 'user',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    refs: {
      hasViewer: ['@public'],
      hasOwner: ['@uid:test-user-1'],
      hasAuthor: ['@uid:test-user-1'],
      hasCreator: ['@uid:test-user-1'],
      hasFollower: [],
      hasSharer: [],
      hasLiker: [],
      hasTag: [],
      hasMention: [],
      hasCollaborator: [],
      hasEditPermissions: ['@uid:test-user-1'],
      hasArchivePermissions: ['@uid:test-user-1'],
      hasUpdateViewersPermissions: ['@uid:test-user-1'],
      hasConfigurePropertiesPermissions: ['@uid:test-user-1'],
    },
    stats: {
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      followerCount: 0,
      submissionCount: 0,
    },
    ...overrides,
  };
}

/** Create a test comment document for Firestore */
export function createTestComment(overrides?: Record<string, unknown>) {
  const now = new Date().toISOString();
  return {
    id: `test-comment-${Date.now()}`,
    postId: 'test-post-1',
    authorUid: 'test-user-1',
    authorDisplayName: 'Test User',
    body: 'This is a test comment.',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Collection path constants for test cleanup.
 * Lists the collections used in integration tests.
 */
export const TEST_COLLECTIONS = [
  COLLECTIONS.SEARCH,
  COLLECTIONS.PUBLIC_PROFILES,
  COLLECTIONS.POST_COMMENTS,
  COLLECTIONS.FEED_FOLLOWERS,
  COLLECTIONS.FEED_SUBMISSIONS,
  COLLECTIONS.DEBUG_EMAILS,
];
```

### 5. Write Firestore Integration Tests

Create `tests/integration/firestore.integration.spec.ts`:

```typescript
import * as admin from 'firebase-admin';
import {
  getTestFirestore,
  clearCollections,
} from '../../src/testing/helpers';
import {
  createTestPost,
  createTestPublicProfile,
  createTestFeed,
  createTestComment,
  TEST_COLLECTIONS,
} from '../../src/testing/fixtures';
import { COLLECTIONS } from '../../src/constants/collections';

describe('Firestore Integration', () => {
  let firestore: admin.firestore.Firestore;

  beforeAll(() => {
    firestore = getTestFirestore();
  });

  afterEach(async () => {
    await clearCollections(firestore, TEST_COLLECTIONS);
  });

  describe('Post CRUD', () => {
    it('should create and read a post document', async () => {
      const post = createTestPost({ title: 'Integration Test Post' });
      const docRef = firestore.collection(COLLECTIONS.SEARCH).doc(post.id);

      await docRef.set(post);
      const snapshot = await docRef.get();

      expect(snapshot.exists).toBe(true);
      expect(snapshot.data()?.title).toBe('Integration Test Post');
      expect(snapshot.data()?.type).toBe('post');
      expect(snapshot.data()?.refs.hasViewer).toContain('@public');
    });

    it('should update a post document', async () => {
      const post = createTestPost();
      const docRef = firestore.collection(COLLECTIONS.SEARCH).doc(post.id);
      await docRef.set(post);

      await docRef.update({ title: 'Updated Title' });
      const snapshot = await docRef.get();

      expect(snapshot.data()?.title).toBe('Updated Title');
    });

    it('should delete a post document', async () => {
      const post = createTestPost();
      const docRef = firestore.collection(COLLECTIONS.SEARCH).doc(post.id);
      await docRef.set(post);

      await docRef.delete();
      const snapshot = await docRef.get();

      expect(snapshot.exists).toBe(false);
    });
  });

  describe('Profile CRUD', () => {
    it('should create and read a public profile', async () => {
      const profile = createTestPublicProfile({ displayName: 'Jane Doe' });
      const docRef = firestore
        .collection(COLLECTIONS.PUBLIC_PROFILES)
        .doc(profile.uid);

      await docRef.set(profile);
      const snapshot = await docRef.get();

      expect(snapshot.exists).toBe(true);
      expect(snapshot.data()?.displayName).toBe('Jane Doe');
    });
  });

  describe('Feed CRUD', () => {
    it('should create a feed and verify follower refs', async () => {
      const feed = createTestFeed();
      const docRef = firestore.collection(COLLECTIONS.SEARCH).doc(feed.id);
      await docRef.set(feed);

      // Simulate follow by adding to hasFollower refs
      await docRef.update({
        'refs.hasFollower': admin.firestore.FieldValue.arrayUnion('@uid:follower-1'),
      });

      const snapshot = await docRef.get();
      expect(snapshot.data()?.refs.hasFollower).toContain('@uid:follower-1');
    });
  });

  describe('Comment CRUD', () => {
    it('should create a comment and read it back', async () => {
      const comment = createTestComment({ body: 'Great post!' });
      const docRef = firestore
        .collection(COLLECTIONS.POST_COMMENTS)
        .doc(comment.id);

      await docRef.set(comment);
      const snapshot = await docRef.get();

      expect(snapshot.exists).toBe(true);
      expect(snapshot.data()?.body).toBe('Great post!');
      expect(snapshot.data()?.postId).toBe('test-post-1');
    });
  });
});
```

### 6. Write Auth Integration Tests

Create `tests/integration/auth.integration.spec.ts`:

```typescript
import * as admin from 'firebase-admin';
import {
  getTestAuth,
  createTestUser,
  deleteTestUser,
} from '../../src/testing/helpers';

describe('Auth Integration', () => {
  let auth: admin.auth.Auth;
  let testUserUid: string;

  beforeAll(() => {
    auth = getTestAuth();
  });

  afterEach(async () => {
    if (testUserUid) {
      await deleteTestUser(auth, testUserUid);
      testUserUid = '';
    }
  });

  describe('User management', () => {
    it('should create a user and retrieve by UID', async () => {
      const user = await createTestUser(auth, {
        displayName: 'Auth Test User',
        email: 'auth-test@example.com',
      });
      testUserUid = user.uid;

      const retrieved = await auth.getUser(user.uid);
      expect(retrieved.displayName).toBe('Auth Test User');
      expect(retrieved.email).toBe('auth-test@example.com');
    });

    it('should set and retrieve custom claims', async () => {
      const user = await createTestUser(auth);
      testUserUid = user.uid;

      await auth.setCustomUserClaims(user.uid, {
        isOwnerOf: { goodneighbor: true },
        isOverseerOf: {},
      });

      const retrieved = await auth.getUser(user.uid);
      expect(retrieved.customClaims?.isOwnerOf?.goodneighbor).toBe(true);
    });
  });

  describe('Session verification', () => {
    it('should create a custom token for a test user', async () => {
      const user = await createTestUser(auth);
      testUserUid = user.uid;

      // Create a custom token (can be used to simulate session creation)
      const customToken = await auth.createCustomToken(user.uid);
      expect(typeof customToken).toBe('string');
      expect(customToken.length).toBeGreaterThan(0);
    });
  });
});
```

### 7. Write Search Integration Tests

Create `tests/integration/search.integration.spec.ts`:

```typescript
import * as admin from 'firebase-admin';
import {
  getTestFirestore,
  clearCollections,
} from '../../src/testing/helpers';
import {
  createTestPost,
  TEST_COLLECTIONS,
} from '../../src/testing/fixtures';
import { COLLECTIONS } from '../../src/constants/collections';

/**
 * Search integration tests.
 *
 * Since Algolia does not have a local emulator, these tests verify:
 * 1. That documents written to Firestore have the correct structure for Algolia indexing
 * 2. That permission refs are correctly structured for Algolia facet-based filtering
 *
 * Full Algolia round-trip tests require a dedicated test index and are marked
 * with a conditional skip if ALGOLIA_TEST_INDEX is not set.
 */
describe('Search Integration', () => {
  let firestore: admin.firestore.Firestore;

  beforeAll(() => {
    firestore = getTestFirestore();
  });

  afterEach(async () => {
    await clearCollections(firestore, TEST_COLLECTIONS);
  });

  describe('Document structure for Algolia indexing', () => {
    it('should create a post with all required Algolia-indexable fields', async () => {
      const post = createTestPost({
        title: 'Searchable Post',
        body: 'Content about neighborhood safety tips',
        category: 'safety',
      });

      const docRef = firestore.collection(COLLECTIONS.SEARCH).doc(post.id);
      await docRef.set(post);

      const snapshot = await docRef.get();
      const data = snapshot.data();

      // Verify fields that Algolia needs for search
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('body');
      expect(data).toHaveProperty('category');
      expect(data).toHaveProperty('type', 'post');
      expect(data).toHaveProperty('createdAt');

      // Verify refs structure for Algolia facet filtering
      expect(data?.refs).toHaveProperty('hasViewer');
      expect(data?.refs).toHaveProperty('hasOwner');
      expect(data?.refs).toHaveProperty('hasTag');
      expect(Array.isArray(data?.refs.hasViewer)).toBe(true);
    });

    it('should correctly structure permission refs for visibility filtering', async () => {
      // Public post -- visible to everyone
      const publicPost = createTestPost({
        id: 'public-post',
        refs: {
          hasViewer: ['@public'],
          hasOwner: ['@uid:user-1'],
          hasAuthor: ['@uid:user-1'],
          hasCreator: ['@uid:user-1'],
          hasFollower: [],
          hasSharer: [],
          hasLiker: [],
          hasTag: ['safety'],
          hasMention: [],
          hasCollaborator: [],
          hasEditPermissions: ['@uid:user-1'],
          hasArchivePermissions: ['@uid:user-1'],
          hasUpdateViewersPermissions: ['@uid:user-1'],
          hasConfigurePropertiesPermissions: ['@uid:user-1'],
        },
      });

      // Private post -- visible only to specific user
      const privatePost = createTestPost({
        id: 'private-post',
        refs: {
          hasViewer: ['@uid:user-1'],
          hasOwner: ['@uid:user-1'],
          hasAuthor: ['@uid:user-1'],
          hasCreator: ['@uid:user-1'],
          hasFollower: [],
          hasSharer: [],
          hasLiker: [],
          hasTag: [],
          hasMention: [],
          hasCollaborator: [],
          hasEditPermissions: ['@uid:user-1'],
          hasArchivePermissions: ['@uid:user-1'],
          hasUpdateViewersPermissions: ['@uid:user-1'],
          hasConfigurePropertiesPermissions: ['@uid:user-1'],
        },
      });

      await Promise.all([
        firestore.collection(COLLECTIONS.SEARCH).doc('public-post').set(publicPost),
        firestore.collection(COLLECTIONS.SEARCH).doc('private-post').set(privatePost),
      ]);

      // Query for public posts (simulating Algolia hasViewer facet filter)
      const publicQuery = await firestore
        .collection(COLLECTIONS.SEARCH)
        .where('refs.hasViewer', 'array-contains', '@public')
        .get();

      expect(publicQuery.size).toBe(1);
      expect(publicQuery.docs[0].id).toBe('public-post');

      // Query for user-1's visible posts
      const userQuery = await firestore
        .collection(COLLECTIONS.SEARCH)
        .where('refs.hasViewer', 'array-contains', '@uid:user-1')
        .get();

      expect(userQuery.size).toBe(1);
      expect(userQuery.docs[0].id).toBe('private-post');
    });
  });

  describe('End-to-end: create post and verify indexable', () => {
    it('should create a post with hashtags in refs.hasTag', async () => {
      const post = createTestPost({
        body: 'Check out this #safety tip for your #neighborhood',
        refs: {
          hasViewer: ['@public'],
          hasOwner: ['@uid:author-1'],
          hasAuthor: ['@uid:author-1'],
          hasCreator: ['@uid:author-1'],
          hasFollower: [],
          hasSharer: [],
          hasLiker: [],
          hasTag: ['safety', 'neighborhood'],
          hasMention: [],
          hasCollaborator: [],
          hasEditPermissions: ['@uid:author-1'],
          hasArchivePermissions: ['@uid:author-1'],
          hasUpdateViewersPermissions: ['@uid:author-1'],
          hasConfigurePropertiesPermissions: ['@uid:author-1'],
        },
      });

      const docRef = firestore.collection(COLLECTIONS.SEARCH).doc(post.id);
      await docRef.set(post);

      const snapshot = await docRef.get();
      expect(snapshot.data()?.refs.hasTag).toEqual(['safety', 'neighborhood']);
    });
  });
});
```

---

## Verification

- [ ] `jest.integration.config.ts` exists at project root with correct test paths and timeout settings
- [ ] `npm run test:integration` script defined in package.json
- [ ] `tests/integration/setup.ts` connects to Firebase emulators
- [ ] `src/testing/helpers.ts` exports getTestFirestore, getTestAuth, clearCollection, clearCollections, createTestUser, deleteTestUser
- [ ] `src/testing/fixtures.ts` exports createTestPost, createTestPublicProfile, createTestFeed, createTestComment, TEST_COLLECTIONS
- [ ] All factory functions produce valid documents that can be written to Firestore without errors
- [ ] Firestore integration tests: create, read, update, delete operations work for posts, profiles, feeds, comments
- [ ] Auth integration tests: user creation, custom claims, custom token generation work against emulator
- [ ] Search integration tests: document structure correct for Algolia indexing, permission refs enable correct visibility filtering
- [ ] Cleanup runs between tests (clearCollections in afterEach) so tests are independent
- [ ] Integration tests pass when Firebase emulator is running (`npm run test:integration`)
- [ ] Integration tests fail gracefully with a clear message if the emulator is not running

---

## Expected Output

**File Structure**:
```
src/testing/
├── index.ts                            # Barrel export
├── fixtures.ts                         # Updated test data factories
└── helpers.ts                          # Updated emulator utilities

tests/integration/
├── setup.ts                            # Emulator connection setup
├── firestore.integration.spec.ts       # Firestore CRUD integration tests
├── auth.integration.spec.ts            # Auth emulator integration tests
└── search.integration.spec.ts          # Search structure and permission tests

jest.integration.config.ts              # Integration test Jest config
```

**Key Files Created/Updated**:
- `src/testing/helpers.ts`: Emulator connection utilities, collection cleanup, test user management
- `src/testing/fixtures.ts`: Test data factories for posts, profiles, feeds, comments
- `tests/integration/setup.ts`: Firebase emulator initialization and teardown
- `tests/integration/firestore.integration.spec.ts`: Firestore CRUD integration tests
- `tests/integration/auth.integration.spec.ts`: Auth emulator integration tests
- `tests/integration/search.integration.spec.ts`: Search document structure and permission tests
- `jest.integration.config.ts`: Separate Jest config for integration test suite

---

## Common Issues and Solutions

### Issue 1: Firebase emulator not running
**Symptom**: Tests fail with connection refused errors
**Solution**: Start the Firebase emulator suite before running integration tests: `firebase emulators:start --only firestore,auth`. Consider adding a script to package.json: `"emulators:start": "firebase emulators:start --only firestore,auth"`.

### Issue 2: Test data persists between tests
**Symptom**: Tests pass individually but fail when run together due to stale data
**Solution**: Ensure `clearCollections()` is called in `afterEach()` for every test suite. The `TEST_COLLECTIONS` constant lists all collections used in tests. Add any new collections to this list.

### Issue 3: Firestore composite index required
**Symptom**: Firestore query fails with "requires an index" error
**Solution**: The Firestore emulator does not enforce composite index requirements by default. If this occurs, either simplify the query or create a `firestore.indexes.json` file with the required indexes.

### Issue 4: Auth emulator custom claims not persisting
**Symptom**: `getUser()` returns null custom claims after `setCustomUserClaims()`
**Solution**: The Auth emulator may require a small delay after setting claims. Add a brief await if needed, or re-fetch the user record.

---

## Resources

- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite): Setup and usage guide for local Firebase emulators
- [firebase-admin Node.js SDK](https://firebase.google.com/docs/reference/admin/node): Admin SDK API reference for Firestore and Auth
- Design doc: `agent/design/local.config-infrastructure.md` -- Test config and emulator setup patterns
- Design doc: `agent/design/local.goodneighbor-core.md` -- Collection paths and entity structures

---

## Notes

- Integration tests use `maxWorkers: 1` in the Jest config because the Firebase emulator maintains shared state. Running tests in parallel would cause race conditions and flaky test results.
- The test timeout is set to 30 seconds (vs the default 5 seconds) to account for emulator latency, especially on cold start.
- Algolia round-trip tests (index -> search -> verify results) are not included in this task because Algolia does not have a local emulator. If a dedicated Algolia test index is available (e.g., `goodneighbor_test`), these tests can be added conditionally using `process.env.ALGOLIA_TEST_INDEX`.
- The search integration tests focus on verifying that document structure is correct for Algolia indexing and that Firestore's `array-contains` queries work with the permission refs model. This validates the data contract between Firestore and Algolia.
- Test data factories intentionally use minimal valid data. Individual tests should override specific fields for their test case rather than creating maximally complex test data.

---

**Next Task**: [Task 29: npm Publish Preparation](./task-29-npm-publish-prep.md)
**Related Design Docs**: `agent/design/local.config-infrastructure.md`, `agent/design/local.goodneighbor-core.md`
**Estimated Completion Date**: TBD
