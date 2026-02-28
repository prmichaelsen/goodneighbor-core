import { createAlgoliaAdminClient, createAlgoliaSearchClient } from './algolia';
import type { AlgoliaConfig } from './schema';

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
