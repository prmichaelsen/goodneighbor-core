import { loadTestConfig } from './loader';
import { Secret } from './secrets';
import { initializeFirebase, resetFirebaseForTesting } from './firebase';
import { createAlgoliaAdminClient, createAlgoliaSearchClient } from './algolia';

jest.mock('@prmichaelsen/firebase-admin-sdk-v8', () => ({
  initializeApp: jest.fn(),
  clearConfig: jest.fn(),
}));

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
    jest.clearAllMocks();
  });

  it('should load test config and initialize all clients without errors', () => {
    const config = loadTestConfig();

    expect(config.app.appName).toBe('goodneighbor-test');

    initializeFirebase(config.firebase);
    const sdk = require('@prmichaelsen/firebase-admin-sdk-v8');
    expect(sdk.initializeApp).toHaveBeenCalledTimes(1);

    const adminClient = createAlgoliaAdminClient(config.algolia);
    expect(adminClient).toBeDefined();

    const searchClient = createAlgoliaSearchClient(config.algolia);
    expect(searchClient).toBeDefined();
  });

  it('should wrap sensitive config values in Secret without leaking', () => {
    const config = loadTestConfig();

    const firebaseSecret = new Secret(config.firebase.serviceAccountKey);
    const algoliaAdminSecret = new Secret(config.algolia.adminApiKey);

    expect(`${firebaseSecret}`).toBe('[REDACTED]');
    expect(`${algoliaAdminSecret}`).toBe('[REDACTED]');

    expect(firebaseSecret.reveal()).toContain('test-project');
    expect(algoliaAdminSecret.reveal()).toBe('test-admin-key');
  });
});
