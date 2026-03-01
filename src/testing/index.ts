// src/testing/index.ts
// Barrel export for test utilities.
// NOTE: This module is intended for use in test files only.

export {
  clearCollection,
  clearCollections,
  clearAllCollections,
  TEST_COLLECTIONS,
} from './helpers';

export {
  createTestPost,
  createTestPublicProfile,
  createTestFeed,
  createTestComment,
} from './fixtures';
