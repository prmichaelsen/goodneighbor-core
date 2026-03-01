// src/testing/helpers.ts
// Test utilities for integration testing with Firebase emulator.

import {
  deleteDocument,
  queryDocuments,
} from '@prmichaelsen/firebase-admin-sdk-v8';
import { COLLECTIONS } from '../constants/collections';

/**
 * Clear all documents in a Firestore collection.
 * Only for use in tests with Firebase emulator.
 */
export async function clearCollection(collectionPath: string): Promise<void> {
  const docs = await queryDocuments(collectionPath, { limit: 500 });
  await Promise.all(
    docs.map((doc) => deleteDocument(collectionPath, doc.id)),
  );
}

/**
 * Clear multiple collections.
 */
export async function clearCollections(paths: string[]): Promise<void> {
  await Promise.all(paths.map(clearCollection));
}

/**
 * Clear all goodneighbor collections.
 */
export async function clearAllCollections(): Promise<void> {
  const allPaths = Object.values(COLLECTIONS);
  await clearCollections(allPaths);
}

/**
 * Test constants for commonly used collection paths.
 */
export const TEST_COLLECTIONS = {
  SEARCH: COLLECTIONS.SEARCH,
  PUBLIC_PROFILES: COLLECTIONS.PUBLIC_PROFILES,
  PRIVATE_PROFILES: COLLECTIONS.PRIVATE_PROFILES,
  PROFILE_BOARDS: COLLECTIONS.PROFILE_BOARDS,
  POST_COMMENTS: COLLECTIONS.POST_COMMENTS,
  COMMENT_REPLIES: COLLECTIONS.COMMENT_REPLIES,
  FEED_SUBMISSIONS: COLLECTIONS.FEED_SUBMISSIONS,
  DEBUG_EMAILS: COLLECTIONS.DEBUG_EMAILS,
} as const;
