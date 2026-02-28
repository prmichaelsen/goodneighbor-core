# Task 7: Config Loader & Secret Class

**Milestone**: [M2 - Config & Infrastructure](../../milestones/milestone-2-config-infrastructure.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 6 (Zod config schemas)
**Status**: Not Started

---

## Objective

Implement the `loadConfig()` function that maps 12 environment variables to the GoodNeighborConfigSchema, the `Secret<T>` class for redacting sensitive values in string contexts, and the `loadTestConfig()` factory for deterministic test configuration without environment variables. Update the existing `src/config/loader.ts` scaffold and create `src/config/secrets.ts`.

---

## Context

The config loader is the bridge between raw environment variables and the typed, validated GoodNeighborConfig object. It reads from `process.env`, maps variable names to the config shape, performs type coercion (e.g., SESSION_DURATION_DAYS string to integer), and delegates validation to the Zod schemas from Task 6.

The Secret<T> class follows the core-sdk config-secrets pattern. It wraps sensitive string values and overrides `toString()` and `toJSON()` to return "[REDACTED]", preventing accidental exposure in logs, error messages, or JSON serialization. The actual value is only accessible via the `reveal()` method.

The `loadTestConfig()` function provides a valid GoodNeighborConfig with hardcoded test values, requiring no environment variables. This enables any test file to get a valid config without setup.

---

## Steps

### 1. Create config/secrets.ts

Create `src/config/secrets.ts`:

```typescript
/**
 * Wraps a sensitive string value to prevent accidental exposure.
 * toString() and toJSON() return "[REDACTED]" instead of the actual value.
 * Use reveal() to access the underlying value when needed (e.g., for API calls).
 *
 * Usage:
 *   const apiKey = new Secret("my-secret-key");
 *   console.log(apiKey);         // "[REDACTED]"
 *   console.log(`Key: ${apiKey}`); // "Key: [REDACTED]"
 *   JSON.stringify({ key: apiKey }); // '{"key":"[REDACTED]"}'
 *   apiKey.reveal();             // "my-secret-key"
 */
export class Secret<T extends string = string> {
  private readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  /**
   * Returns the actual secret value.
   * Only call this when you need to pass the value to an external service.
   */
  reveal(): T {
    return this.value;
  }

  /**
   * Returns "[REDACTED]" to prevent accidental logging.
   */
  toString(): string {
    return '[REDACTED]';
  }

  /**
   * Returns "[REDACTED]" to prevent accidental JSON serialization.
   */
  toJSON(): string {
    return '[REDACTED]';
  }

  /**
   * Custom inspect for Node.js util.inspect (used by console.log).
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return '[REDACTED]';
  }
}
```

### 2. Update config/loader.ts with loadConfig()

Update `src/config/loader.ts`:

```typescript
import { GoodNeighborConfigSchema, GoodNeighborConfig } from './schema';

/**
 * Loads and validates application configuration from environment variables.
 *
 * Maps the following environment variables to the GoodNeighborConfig shape:
 *   NODE_ENV -> app.env
 *   APP_NAME -> app.appName
 *   APP_URL -> app.appUrl
 *   FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY -> firebase.serviceAccountKey
 *   ALGOLIA_APPLICATION_ID -> algolia.appId
 *   ALGOLIA_ADMIN_API_KEY -> algolia.adminApiKey
 *   ALGOLIA_SEARCH_API_KEY -> algolia.searchApiKey
 *   ALGOLIA_INDEX_NAME -> algolia.indexName
 *   MANDRILL_API_KEY -> email.mandrillApiKey
 *   SUPPORT_EMAIL -> email.supportEmail
 *   EMAIL_FROM_NAME -> email.fromName
 *   SESSION_DURATION_DAYS -> auth.sessionDurationDays (parsed as integer)
 *
 * @param envOverrides - Optional overrides for environment variables (useful for testing)
 * @returns Validated GoodNeighborConfig
 * @throws ZodError if required variables are missing or validation fails
 */
export function loadConfig(
  envOverrides?: Partial<Record<string, string>>,
): GoodNeighborConfig {
  const env = { ...process.env, ...envOverrides };

  const raw = {
    app: {
      env: env.NODE_ENV,
      appName: env.APP_NAME,
      appUrl: env.APP_URL,
    },
    firebase: {
      serviceAccountKey: env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY,
    },
    algolia: {
      appId: env.ALGOLIA_APPLICATION_ID,
      adminApiKey: env.ALGOLIA_ADMIN_API_KEY,
      searchApiKey: env.ALGOLIA_SEARCH_API_KEY,
      indexName: env.ALGOLIA_INDEX_NAME,
    },
    email: {
      mandrillApiKey: env.MANDRILL_API_KEY,
      supportEmail: env.SUPPORT_EMAIL,
      fromName: env.EMAIL_FROM_NAME,
    },
    auth: {
      sessionDurationDays: env.SESSION_DURATION_DAYS
        ? parseInt(env.SESSION_DURATION_DAYS, 10)
        : undefined,
    },
  };

  return GoodNeighborConfigSchema.parse(raw);
}

/**
 * Returns a valid GoodNeighborConfig with hardcoded test values.
 * Requires no environment variables.
 *
 * Suitable for unit tests that need a config object but do not depend on
 * specific config values. For tests that need specific config values,
 * use loadConfig() with envOverrides.
 */
export function loadTestConfig(): GoodNeighborConfig {
  return GoodNeighborConfigSchema.parse({
    app: {
      env: 'development',
      appName: 'goodneighbor-test',
      appUrl: 'http://localhost:3000',
    },
    firebase: {
      serviceAccountKey: '{"type":"service_account","project_id":"test-project"}',
    },
    algolia: {
      appId: 'test-app-id',
      adminApiKey: 'test-admin-key',
      searchApiKey: 'test-search-key',
      indexName: 'goodneighbor_test',
    },
    email: {
      supportEmail: 'test@example.com',
    },
    auth: {
      sessionDurationDays: 1,
    },
  });
}
```

### 3. Update config/index.ts Barrel Export

Update `src/config/index.ts`:

```typescript
export * from './schema';
export * from './loader';
export * from './secrets';
```

### 4. Write Unit Tests for Secret

Create `src/config/__tests__/secrets.spec.ts`:

```typescript
import { Secret } from '../secrets';

describe('Secret', () => {
  const secretValue = 'my-super-secret-api-key';
  let secret: Secret;

  beforeEach(() => {
    secret = new Secret(secretValue);
  });

  it('should return the original value via reveal()', () => {
    expect(secret.reveal()).toBe(secretValue);
  });

  it('should return [REDACTED] via toString()', () => {
    expect(secret.toString()).toBe('[REDACTED]');
  });

  it('should return [REDACTED] via toJSON()', () => {
    expect(secret.toJSON()).toBe('[REDACTED]');
  });

  it('should return [REDACTED] in template literal interpolation', () => {
    expect(`Key: ${secret}`).toBe('Key: [REDACTED]');
  });

  it('should return [REDACTED] when JSON.stringify is used', () => {
    const obj = { apiKey: secret };
    const json = JSON.stringify(obj);
    expect(json).toBe('{"apiKey":"[REDACTED]"}');
  });

  it('should never expose the secret value in string concatenation', () => {
    const result = 'prefix-' + secret;
    expect(result).toBe('prefix-[REDACTED]');
    expect(result).not.toContain(secretValue);
  });
});
```

### 5. Write Unit Tests for loadConfig and loadTestConfig

Create `src/config/__tests__/loader.spec.ts`:

```typescript
import { loadConfig, loadTestConfig } from '../loader';

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
```

---

## Verification

- [ ] `src/config/secrets.ts` exports Secret<T> class
- [ ] Secret.reveal() returns the original value
- [ ] Secret.toString() returns "[REDACTED]"
- [ ] Secret.toJSON() returns "[REDACTED]"
- [ ] Template literal interpolation with Secret returns "[REDACTED]"
- [ ] JSON.stringify with Secret property returns "[REDACTED]"
- [ ] `src/config/loader.ts` exports loadConfig() and loadTestConfig()
- [ ] loadConfig() maps all 12 environment variables to the correct config fields
- [ ] loadConfig() applies defaults for optional fields
- [ ] loadConfig() throws ZodError for missing required fields (APP_URL, FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY, ALGOLIA_APPLICATION_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_SEARCH_API_KEY)
- [ ] loadConfig() parses SESSION_DURATION_DAYS as integer
- [ ] loadConfig() accepts envOverrides parameter for testing
- [ ] loadTestConfig() returns valid config without any environment variables
- [ ] `src/config/index.ts` barrel exports schema, loader, and secrets modules
- [ ] All unit tests pass
- [ ] TypeScript compiles without errors

---

## Expected Output

**File Structure**:
```
src/config/
├── __tests__/
│   ├── schema.spec.ts     # From Task 6
│   ├── secrets.spec.ts    # NEW: Secret class tests
│   └── loader.spec.ts     # NEW: Config loader tests
├── index.ts                # UPDATED: Barrel export with secrets
├── schema.ts               # From Task 6
├── loader.ts               # UPDATED: loadConfig() and loadTestConfig()
└── secrets.ts              # NEW: Secret<T> class
```

**Key Files Created/Updated**:
- `src/config/secrets.ts`: Secret<T> class with toString/toJSON redaction
- `src/config/loader.ts`: loadConfig() with env var mapping and loadTestConfig()
- `src/config/index.ts`: Updated barrel export

---

## Common Issues and Solutions

### Issue 1: loadConfig reads from actual process.env in tests
**Symptom**: Tests pass locally but fail in CI because different env vars are set
**Solution**: Always use the `envOverrides` parameter in tests instead of relying on process.env. For tests that verify default behavior, pass an explicit minimal env override that only includes required fields.

### Issue 2: parseInt returns NaN for invalid SESSION_DURATION_DAYS
**Symptom**: Zod validation fails with an unexpected error about sessionDurationDays being NaN
**Solution**: The loader passes `undefined` when SESSION_DURATION_DAYS is not set, which triggers the Zod default. When the env var is set but not a valid number, parseInt returns NaN, which Zod's `.int()` check rejects with a clear error. This is the desired behavior.

### Issue 3: Secret class not handling undefined/null values
**Symptom**: `new Secret(undefined)` crashes or behaves unexpectedly
**Solution**: Secret<T> is constrained to `T extends string`. Do not construct a Secret with undefined or null. The config loader should only wrap values that are known to exist after validation.

---

## Resources

- Design doc: `agent/design/local.config-infrastructure.md` -- Config loader specification and Secret class design
- Core-SDK pattern: `agent/patterns/core-sdk.config-environment.md` -- Environment variable mapping pattern
- Core-SDK pattern: `agent/patterns/core-sdk.config-secrets.md` -- Secret handling pattern

---

## Notes

- The loadConfig() function reads from `process.env` merged with optional overrides. The overrides parameter is primarily for testing but can also be used for programmatic configuration.
- loadTestConfig() uses `GoodNeighborConfigSchema.parse()` internally, which validates the test config against the same schemas used in production. If the schema changes, test config must be updated to match.
- The Secret class does not encrypt the value. It only prevents accidental exposure through string conversion. For at-rest encryption, use the deployment platform's secret management.
- The `[Symbol.for('nodejs.util.inspect.custom')]` override ensures `console.log(secret)` shows "[REDACTED]" in Node.js environments.

---

**Next Task**: [Task 8: Firebase Admin Initialization](./task-8-firebase-init.md)
**Related Design Docs**: `agent/design/local.config-infrastructure.md`
**Estimated Completion Date**: TBD
