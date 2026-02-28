import { loadConfig, loadTestConfig } from './loader';

describe('loadConfig', () => {
  const validEnv = {
    NODE_ENV: 'production',
    APP_NAME: 'my-app',
    APP_URL: 'https://example.com',
    FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY: '{"type":"service_account"}',
    ALGOLIA_APPLICATION_ID: 'app-id',
    ALGOLIA_ADMIN_API_KEY: 'admin-key',
    ALGOLIA_SEARCH_API_KEY: 'search-key',
    ALGOLIA_INDEX_NAME: 'my_index',
    MANDRILL_API_KEY: 'mandrill-key',
    SUPPORT_EMAIL: 'help@example.com',
    EMAIL_FROM_NAME: 'My App',
    SESSION_DURATION_DAYS: '7',
  };

  it('should load valid config from env overrides', () => {
    const config = loadConfig(validEnv);
    expect(config.app.env).toBe('production');
    expect(config.app.appName).toBe('my-app');
    expect(config.app.appUrl).toBe('https://example.com');
    expect(config.firebase.serviceAccountKey).toBe('{"type":"service_account"}');
    expect(config.algolia.appId).toBe('app-id');
    expect(config.algolia.indexName).toBe('my_index');
    expect(config.email.mandrillApiKey).toBe('mandrill-key');
    expect(config.email.supportEmail).toBe('help@example.com');
    expect(config.auth.sessionDurationDays).toBe(7);
  });

  it('should apply defaults for optional fields', () => {
    const minimalEnv = {
      APP_URL: 'https://example.com',
      FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY: '{"type":"service_account"}',
      ALGOLIA_APPLICATION_ID: 'app-id',
      ALGOLIA_ADMIN_API_KEY: 'admin-key',
      ALGOLIA_SEARCH_API_KEY: 'search-key',
    };
    const config = loadConfig(minimalEnv);
    expect(config.app.env).toBe('development');
    expect(config.app.appName).toBe('goodneighbor');
    expect(config.algolia.indexName).toBe('goodneighbor_search');
    expect(config.email.supportEmail).toBe('support@goodneighbor.com');
    expect(config.email.fromName).toBe('Good Neighbor');
    expect(config.auth.sessionDurationDays).toBe(14);
  });

  it('should throw ZodError for missing required fields', () => {
    expect(() => loadConfig({})).toThrow();
  });

  it('should parse SESSION_DURATION_DAYS as integer', () => {
    const config = loadConfig({ ...validEnv, SESSION_DURATION_DAYS: '21' });
    expect(config.auth.sessionDurationDays).toBe(21);
    expect(typeof config.auth.sessionDurationDays).toBe('number');
  });
});

describe('loadTestConfig', () => {
  it('should return valid config without any environment variables', () => {
    const config = loadTestConfig();
    expect(config.app.appName).toBe('goodneighbor-test');
    expect(config.app.appUrl).toBe('http://localhost:3000');
    expect(config.firebase.serviceAccountKey).toContain('test-project');
    expect(config.algolia.appId).toBe('test-app-id');
    expect(config.algolia.indexName).toBe('goodneighbor_test');
    expect(config.auth.sessionDurationDays).toBe(1);
  });

  it('should return consistent results on multiple calls', () => {
    const config1 = loadTestConfig();
    const config2 = loadTestConfig();
    expect(config1).toEqual(config2);
  });
});
