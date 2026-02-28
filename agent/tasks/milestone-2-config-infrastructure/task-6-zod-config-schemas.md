# Task 6: Zod Config Schemas

**Milestone**: [M2 - Config & Infrastructure](../../milestones/milestone-2-config-infrastructure.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 1 (types must compile; no direct type dependency but shared build)
**Status**: Not Started

---

## Objective

Create Zod validation schemas for all configuration sections: AppConfigSchema, FirebaseConfigSchema, AlgoliaConfigSchema, EmailConfigSchema, AuthConfigSchema, and the composite GoodNeighborConfigSchema. Export inferred TypeScript types for each schema. The schemas must enforce required fields, apply default values, and provide descriptive error messages for validation failures.

---

## Context

The goodneighbor Next.js app reads environment variables ad-hoc with no centralized validation. Misconfiguration is discovered only at runtime when a specific code path reads a missing variable. goodneighbor-core validates all configuration at startup using Zod schemas, providing fail-fast behavior with clear error messages.

The schema definitions follow the design specification in `local.config-infrastructure.md` and the core-sdk config-schema pattern. Each config section maps to a group of related environment variables. The composite GoodNeighborConfigSchema brings all sections together into a single validated object.

An existing scaffold exists at `src/config/schema.ts` that should be updated.

Default values:
- NODE_ENV: "development"
- APP_NAME: "goodneighbor"
- ALGOLIA_INDEX_NAME: "goodneighbor_search"
- SUPPORT_EMAIL: "support@goodneighbor.com"
- EMAIL_FROM_NAME: "Good Neighbor"
- SESSION_DURATION_DAYS: 14

---

## Steps

### 1. Read Existing Config Schema Scaffold

Examine `src/config/schema.ts` to understand the current state.

### 2. Update schema.ts with All Zod Schemas

Update `src/config/schema.ts`:

```typescript
import { z } from 'zod';

/**
 * Application-level configuration.
 * Controls environment mode, app identity, and base URL.
 */
export const AppConfigSchema = z.object({
  env: z.enum(['development', 'staging', 'production']).default('development'),
  appName: z.string().default('goodneighbor'),
  appUrl: z.string().url(),
});

/**
 * Firebase Admin SDK configuration.
 * The serviceAccountKey is a JSON string containing the Firebase service account credentials.
 */
export const FirebaseConfigSchema = z.object({
  serviceAccountKey: z.string().min(1, 'FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY is required'),
});

/**
 * Algolia search client configuration.
 * Supports both admin (write) and search (read-only) API keys.
 */
export const AlgoliaConfigSchema = z.object({
  appId: z.string().min(1, 'ALGOLIA_APPLICATION_ID is required'),
  adminApiKey: z.string().min(1, 'ALGOLIA_ADMIN_API_KEY is required'),
  searchApiKey: z.string().min(1, 'ALGOLIA_SEARCH_API_KEY is required'),
  indexName: z.string().default('goodneighbor_search'),
});

/**
 * Email (Mandrill) configuration.
 * The mandrillApiKey is optional -- when absent, email sending falls back to debug capture.
 */
export const EmailConfigSchema = z.object({
  mandrillApiKey: z.string().optional(),
  supportEmail: z.string().email().default('support@goodneighbor.com'),
  fromName: z.string().default('Good Neighbor'),
});

/**
 * Authentication configuration.
 * Controls session behavior for Firebase Auth.
 */
export const AuthConfigSchema = z.object({
  sessionDurationDays: z.number().int().min(1).max(30).default(14),
});

/**
 * Composite configuration schema combining all sections.
 * Validated at startup via loadConfig().
 */
export const GoodNeighborConfigSchema = z.object({
  app: AppConfigSchema,
  firebase: FirebaseConfigSchema,
  algolia: AlgoliaConfigSchema,
  email: EmailConfigSchema,
  auth: AuthConfigSchema,
});

// -- Inferred TypeScript Types --

/** Full application configuration */
export type GoodNeighborConfig = z.infer<typeof GoodNeighborConfigSchema>;

/** Application-level config section */
export type AppConfig = z.infer<typeof AppConfigSchema>;

/** Firebase config section */
export type FirebaseConfig = z.infer<typeof FirebaseConfigSchema>;

/** Algolia config section */
export type AlgoliaConfig = z.infer<typeof AlgoliaConfigSchema>;

/** Email config section */
export type EmailConfig = z.infer<typeof EmailConfigSchema>;

/** Auth config section */
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
```

### 3. Write Unit Tests

Create `src/config/__tests__/schema.spec.ts`:

```typescript
import {
  AppConfigSchema,
  FirebaseConfigSchema,
  AlgoliaConfigSchema,
  EmailConfigSchema,
  AuthConfigSchema,
  GoodNeighborConfigSchema,
} from '../schema';

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
  it('should accept valid config', () => {
    const result = AlgoliaConfigSchema.parse({
      appId: 'app-id',
      adminApiKey: 'admin-key',
      searchApiKey: 'search-key',
    });
    expect(result.indexName).toBe('goodneighbor_search');
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
});

describe('GoodNeighborConfigSchema', () => {
  it('should validate complete config', () => {
    const result = GoodNeighborConfigSchema.parse({
      app: { appUrl: 'https://example.com' },
      firebase: { serviceAccountKey: '{"type":"service_account"}' },
      algolia: { appId: 'id', adminApiKey: 'key', searchApiKey: 'key' },
      email: {},
      auth: {},
    });
    expect(result.app.env).toBe('development');
    expect(result.auth.sessionDurationDays).toBe(14);
  });

  it('should report field-level errors for missing required sections', () => {
    expect(() => GoodNeighborConfigSchema.parse({})).toThrow();
  });
});
```

---

## Verification

- [ ] `src/config/schema.ts` exports all 6 schemas: AppConfigSchema, FirebaseConfigSchema, AlgoliaConfigSchema, EmailConfigSchema, AuthConfigSchema, GoodNeighborConfigSchema
- [ ] `src/config/schema.ts` exports all 6 inferred types: GoodNeighborConfig, AppConfig, FirebaseConfig, AlgoliaConfig, EmailConfig, AuthConfig
- [ ] AppConfigSchema defaults: env="development", appName="goodneighbor"
- [ ] AppConfigSchema requires appUrl and validates it as a URL
- [ ] FirebaseConfigSchema requires serviceAccountKey (non-empty string)
- [ ] AlgoliaConfigSchema requires appId, adminApiKey, searchApiKey; defaults indexName to "goodneighbor_search"
- [ ] EmailConfigSchema makes mandrillApiKey optional; defaults supportEmail and fromName
- [ ] AuthConfigSchema defaults sessionDurationDays to 14, constrains to integer 1-30
- [ ] GoodNeighborConfigSchema composes all 5 section schemas
- [ ] All unit tests pass with valid, invalid, and default scenarios
- [ ] TypeScript compiles without errors

---

## Expected Output

**File Structure**:
```
src/config/
├── __tests__/
│   └── schema.spec.ts    # NEW: Schema validation tests
├── index.ts               # Existing barrel (to be updated in Task 7)
├── schema.ts              # UPDATED: Full Zod schemas and inferred types
└── loader.ts              # Existing scaffold (updated in Task 7)
```

**Key Files Updated**:
- `src/config/schema.ts`: Complete Zod schemas with defaults, validation rules, and inferred TypeScript types

---

## Common Issues and Solutions

### Issue 1: Zod version mismatch
**Symptom**: z.enum or z.string().url() behaves differently than expected
**Solution**: Verify the installed Zod version in package.json. The schemas are designed for Zod 3.x. If using Zod 4.x (as noted in requirements), check for API changes.

### Issue 2: Default values not applied when field is undefined
**Symptom**: Parsing `{ appUrl: "https://example.com" }` through AppConfigSchema does not set env to "development"
**Solution**: Zod's `.default()` only applies when the field is `undefined`. If the field is explicitly `null` or an empty string, the default does not apply. Ensure env var mapping in the loader (Task 7) passes `undefined` for unset variables, not empty strings.

### Issue 3: sessionDurationDays type coercion
**Symptom**: Passing `"14"` (string) to AuthConfigSchema fails validation
**Solution**: The schema expects a `number`, not a string. Type coercion (parseInt) happens in the loader (Task 7), not in the schema. The schema validates the already-coerced value.

---

## Resources

- Design doc: `agent/design/local.config-infrastructure.md` -- Complete schema specification with field-level details
- Core-SDK pattern: `agent/patterns/core-sdk.config-schema.md` -- Config schema pattern to follow
- [Zod Documentation](https://zod.dev/) -- Schema definition API reference

---

## Notes

- The schemas validate structure, not semantics. For example, FirebaseConfigSchema validates that serviceAccountKey is a non-empty string, but does not validate that it is valid JSON or a valid Firebase service account. JSON parsing validation happens at initialization time (Task 8).
- The GoodNeighborConfigSchema is the single entry point for config validation. All 5 section schemas are composed into it.
- Inferred types (GoodNeighborConfig, etc.) are the primary way consumers interact with config. They should not manually construct config objects -- always go through loadConfig() or loadTestConfig().
- Zod error messages from `.min(1, "descriptive message")` provide context for operators diagnosing deployment issues.

---

**Next Task**: [Task 7: Config Loader & Secret Class](./task-7-config-loader-secrets.md)
**Related Design Docs**: `agent/design/local.config-infrastructure.md`
**Estimated Completion Date**: TBD
