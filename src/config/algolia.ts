// src/config/algolia.ts
// Algolia client factory functions.

import { algoliasearch } from 'algoliasearch';
import type { AlgoliaConfig } from './schema';

/**
 * Creates an Algolia client with admin API key.
 * Use for write operations: indexing, updating, deleting documents, configuring index settings.
 */
export function createAlgoliaAdminClient(config: AlgoliaConfig) {
  return algoliasearch(config.appId, config.adminApiKey);
}

/**
 * Creates an Algolia client with search-only API key.
 * Use for read operations: searching, browsing.
 */
export function createAlgoliaSearchClient(config: AlgoliaConfig) {
  return algoliasearch(config.appId, config.searchApiKey);
}
