import { loadTestConfig } from './loader';
import { Secret } from './secrets';
import { initializeFirebase, resetFirebaseForTesting } from './firebase';
import { createAlgoliaAdminClient, createAlgoliaSearchClient } from './algolia';

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

    expect(config.app.appName).toBe('goodneighbor-test');

    const firebaseApp = initializeFirebase(config.firebase);
    expect(firebaseApp).toBeDefined();

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
