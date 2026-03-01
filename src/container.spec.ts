import { ServiceContainer, createServiceContainer, SERVICE_NAMES } from './container';

jest.mock('@prmichaelsen/firebase-admin-sdk-v8', () => ({
  initializeApp: jest.fn(),
  clearConfig: jest.fn(),
  verifySessionCookie: jest.fn(),
  setDocument: jest.fn(),
  getDocument: jest.fn(),
  updateDocument: jest.fn(),
  queryDocuments: jest.fn(),
  batchWrite: jest.fn(),
  FieldValue: {
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn(),
    increment: jest.fn(),
    serverTimestamp: jest.fn(),
  },
}));

jest.mock('algoliasearch', () => ({
  algoliasearch: jest.fn(() => ({
    searchSingleIndex: jest.fn(),
    saveObject: jest.fn(),
    saveObjects: jest.fn(),
    partialUpdateObject: jest.fn(),
    deleteObject: jest.fn(),
    deleteObjects: jest.fn(),
    setSettings: jest.fn(),
  })),
}));

function getTestConfig() {
  return {
    app: { env: 'development' as const, appName: 'test-app', appUrl: 'http://localhost:3000' },
    firebase: { serviceAccountKey: '{"type":"service_account","project_id":"test"}' },
    algolia: { appId: 'test', adminApiKey: 'key', searchApiKey: 'key', indexName: 'test_index' },
    email: { supportEmail: 'test@test.com', fromName: 'Test' },
    auth: { sessionDurationDays: 14 },
  };
}

describe('ServiceContainer', () => {
  describe('basic container', () => {
    it('should register and resolve a singleton', () => {
      const container = new ServiceContainer();
      let callCount = 0;
      container.registerSingleton('test', () => {
        callCount++;
        return { value: 'hello' };
      });

      const first = container.resolve('test');
      const second = container.resolve('test');

      expect(first).toBe(second); // Same reference
      expect(callCount).toBe(1); // Factory called only once
      expect((first as any).value).toBe('hello');
    });

    it('should throw for unregistered services', () => {
      const container = new ServiceContainer();
      expect(() => container.resolve('missing')).toThrow('Service not registered: missing');
    });

    it('should support lazy instantiation', () => {
      const container = new ServiceContainer();
      let instantiated = false;
      container.registerSingleton('lazy', () => {
        instantiated = true;
        return {};
      });

      expect(instantiated).toBe(false);
      container.resolve('lazy');
      expect(instantiated).toBe(true);
    });

    it('should report registered services via has()', () => {
      const container = new ServiceContainer();
      container.registerSingleton('exists', () => ({}));
      expect(container.has('exists')).toBe(true);
      expect(container.has('missing')).toBe(false);
    });
  });

  describe('createServiceContainer', () => {
    it('should register all 8 services', () => {
      const container = createServiceContainer(getTestConfig());

      for (const name of Object.values(SERVICE_NAMES)) {
        expect(container.has(name)).toBe(true);
      }
    });

    it('should resolve authService', () => {
      const container = createServiceContainer(getTestConfig());
      const auth = container.resolve(SERVICE_NAMES.AUTH);
      expect(auth).toBeDefined();
      expect(typeof auth.verifySession).toBe('function');
    });

    it('should resolve searchService', () => {
      const container = createServiceContainer(getTestConfig());
      const search = container.resolve(SERVICE_NAMES.SEARCH);
      expect(search).toBeDefined();
      expect(typeof search.search).toBe('function');
    });

    it('should resolve contentService', () => {
      const container = createServiceContainer(getTestConfig());
      const content = container.resolve(SERVICE_NAMES.CONTENT);
      expect(content).toBeDefined();
      expect(typeof content.createPost).toBe('function');
    });

    it('should resolve profileService', () => {
      const container = createServiceContainer(getTestConfig());
      const profile = container.resolve(SERVICE_NAMES.PROFILE);
      expect(profile).toBeDefined();
      expect(typeof profile.getPublicProfile).toBe('function');
    });

    it('should resolve feedService', () => {
      const container = createServiceContainer(getTestConfig());
      const feed = container.resolve(SERVICE_NAMES.FEED);
      expect(feed).toBeDefined();
      expect(typeof feed.createFeed).toBe('function');
    });

    it('should resolve commentService', () => {
      const container = createServiceContainer(getTestConfig());
      const comment = container.resolve(SERVICE_NAMES.COMMENT);
      expect(comment).toBeDefined();
      expect(typeof comment.createComment).toBe('function');
    });

    it('should resolve notificationService', () => {
      const container = createServiceContainer(getTestConfig());
      const notification = container.resolve(SERVICE_NAMES.NOTIFICATION);
      expect(notification).toBeDefined();
      expect(typeof notification.sendEmail).toBe('function');
    });

    it('should resolve i18nService', () => {
      const container = createServiceContainer(getTestConfig());
      const i18n = container.resolve(SERVICE_NAMES.I18N);
      expect(i18n).toBeDefined();
      expect(typeof i18n.translate).toBe('function');
      expect(typeof i18n.formatDate).toBe('function');
      expect(typeof i18n.hasKey).toBe('function');
      expect(typeof i18n.getKeys).toBe('function');
    });

    it('should return same instance on repeated resolve', () => {
      const container = createServiceContainer(getTestConfig());
      const first = container.resolve(SERVICE_NAMES.AUTH);
      const second = container.resolve(SERVICE_NAMES.AUTH);
      expect(first).toBe(second);
    });

    it('should initialize Firebase eagerly', () => {
      const sdk = require('@prmichaelsen/firebase-admin-sdk-v8');
      createServiceContainer(getTestConfig());
      expect(sdk.initializeApp).toHaveBeenCalled();
    });

    it('should share SearchService dependency between ContentService and FeedService', () => {
      const container = createServiceContainer(getTestConfig());
      // Resolve content and feed — both depend on search
      container.resolve(SERVICE_NAMES.CONTENT);
      container.resolve(SERVICE_NAMES.FEED);
      // SearchService should only be instantiated once (singleton)
      const search1 = container.resolve(SERVICE_NAMES.SEARCH);
      const search2 = container.resolve(SERVICE_NAMES.SEARCH);
      expect(search1).toBe(search2);
    });
  });
});
