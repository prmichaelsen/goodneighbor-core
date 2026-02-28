import {
  AppConfigSchema,
  FirebaseConfigSchema,
  AlgoliaConfigSchema,
  EmailConfigSchema,
  AuthConfigSchema,
  GoodNeighborConfigSchema,
} from './schema';

describe('AppConfigSchema', () => {
  it('should accept valid config', () => {
    const result = AppConfigSchema.parse({
      env: 'production',
      appName: 'my-app',
      appUrl: 'https://example.com',
    });
    expect(result.env).toBe('production');
    expect(result.appName).toBe('my-app');
    expect(result.appUrl).toBe('https://example.com');
  });

  it('should apply defaults for optional fields', () => {
    const result = AppConfigSchema.parse({
      appUrl: 'https://example.com',
    });
    expect(result.env).toBe('development');
    expect(result.appName).toBe('goodneighbor');
  });

  it('should reject missing appUrl', () => {
    expect(() => AppConfigSchema.parse({})).toThrow();
  });

  it('should reject invalid URL', () => {
    expect(() => AppConfigSchema.parse({
      appUrl: 'not-a-url',
    })).toThrow();
  });

  it('should reject invalid env value', () => {
    expect(() => AppConfigSchema.parse({
      env: 'invalid',
      appUrl: 'https://example.com',
    })).toThrow();
  });
});

describe('FirebaseConfigSchema', () => {
  it('should accept valid service account key', () => {
    const result = FirebaseConfigSchema.parse({
      serviceAccountKey: '{"type":"service_account"}',
    });
    expect(result.serviceAccountKey).toBe('{"type":"service_account"}');
  });

  it('should reject empty service account key', () => {
    expect(() => FirebaseConfigSchema.parse({
      serviceAccountKey: '',
    })).toThrow();
  });

  it('should reject missing service account key', () => {
    expect(() => FirebaseConfigSchema.parse({})).toThrow();
  });
});

describe('AlgoliaConfigSchema', () => {
  it('should accept valid config with default indexName', () => {
    const result = AlgoliaConfigSchema.parse({
      appId: 'app-id',
      adminApiKey: 'admin-key',
      searchApiKey: 'search-key',
    });
    expect(result.indexName).toBe('goodneighbor_search');
  });

  it('should accept custom indexName', () => {
    const result = AlgoliaConfigSchema.parse({
      appId: 'app-id',
      adminApiKey: 'admin-key',
      searchApiKey: 'search-key',
      indexName: 'custom_index',
    });
    expect(result.indexName).toBe('custom_index');
  });

  it('should reject missing required fields', () => {
    expect(() => AlgoliaConfigSchema.parse({})).toThrow();
  });
});

describe('EmailConfigSchema', () => {
  it('should apply all defaults', () => {
    const result = EmailConfigSchema.parse({});
    expect(result.supportEmail).toBe('support@goodneighbor.com');
    expect(result.fromName).toBe('Good Neighbor');
    expect(result.mandrillApiKey).toBeUndefined();
  });

  it('should accept optional mandrillApiKey', () => {
    const result = EmailConfigSchema.parse({
      mandrillApiKey: 'mandrill-key',
    });
    expect(result.mandrillApiKey).toBe('mandrill-key');
  });

  it('should reject invalid email', () => {
    expect(() => EmailConfigSchema.parse({
      supportEmail: 'not-an-email',
    })).toThrow();
  });
});

describe('AuthConfigSchema', () => {
  it('should default sessionDurationDays to 14', () => {
    const result = AuthConfigSchema.parse({});
    expect(result.sessionDurationDays).toBe(14);
  });

  it('should accept valid session duration', () => {
    const result = AuthConfigSchema.parse({ sessionDurationDays: 7 });
    expect(result.sessionDurationDays).toBe(7);
  });

  it('should reject value over 30', () => {
    expect(() => AuthConfigSchema.parse({
      sessionDurationDays: 31,
    })).toThrow();
  });

  it('should reject non-integer', () => {
    expect(() => AuthConfigSchema.parse({
      sessionDurationDays: 14.5,
    })).toThrow();
  });

  it('should reject value below 1', () => {
    expect(() => AuthConfigSchema.parse({
      sessionDurationDays: 0,
    })).toThrow();
  });
});

describe('GoodNeighborConfigSchema', () => {
  it('should validate complete config with defaults', () => {
    const result = GoodNeighborConfigSchema.parse({
      app: { appUrl: 'https://example.com' },
      firebase: { serviceAccountKey: '{"type":"service_account"}' },
      algolia: { appId: 'id', adminApiKey: 'key', searchApiKey: 'key' },
      email: {},
      auth: {},
    });
    expect(result.app.env).toBe('development');
    expect(result.app.appName).toBe('goodneighbor');
    expect(result.auth.sessionDurationDays).toBe(14);
    expect(result.algolia.indexName).toBe('goodneighbor_search');
  });

  it('should reject missing required sections', () => {
    expect(() => GoodNeighborConfigSchema.parse({})).toThrow();
  });
});
