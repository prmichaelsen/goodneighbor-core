# Milestone 2: Config & Infrastructure

**Goal**: Implement validated configuration system with Zod schemas, secret handling, and Firebase/Algolia client initialization
**Duration**: 2-3 days
**Dependencies**: Milestone 1 (types and errors needed for config validation error handling)
**Status**: Not Started

---

## Overview

This milestone builds the configuration and infrastructure layer that all goodneighbor-core services depend on. The goodneighbor Next.js app currently reads environment variables ad-hoc throughout the codebase with no centralized validation -- misconfiguration is only discovered at runtime when a function happens to read a missing variable. goodneighbor-core validates all configuration at startup using Zod schemas and exposes a typed, validated `GoodNeighborConfig` object.

This milestone also implements the `Secret<T>` class for safe handling of sensitive values (Firebase service account key, Algolia admin key, Mandrill key), Firebase Admin singleton initialization, Algolia client factories, and a `loadTestConfig()` factory for deterministic test configuration without environment variables.

The implementation follows the core-sdk patterns: config-schema, config-environment, and config-secrets.

---

## Deliverables

### 1. Zod Configuration Schemas
- AppConfigSchema (env, appName, appUrl)
- FirebaseConfigSchema (serviceAccountKey)
- AlgoliaConfigSchema (appId, adminApiKey, searchApiKey, indexName)
- EmailConfigSchema (mandrillApiKey, supportEmail, fromName)
- AuthConfigSchema (sessionDurationDays)
- GoodNeighborConfigSchema (composite of all 5 sections)
- Inferred TypeScript types for each schema (GoodNeighborConfig, AppConfig, FirebaseConfig, AlgoliaConfig, EmailConfig, AuthConfig)

### 2. Config Loader
- `loadConfig(envOverrides?)` function mapping 12 environment variables to the validated config shape
- Environment variable to config field mapping with type coercion (SESSION_DURATION_DAYS parsed as integer)
- Fail-fast behavior: throws ZodError with field names for missing/invalid required vars
- Default values applied for optional fields

### 3. Secret Handling
- `Secret<T>` class with `reveal()`, `toString()` (returns "[REDACTED]"), and `toJSON()` (returns "[REDACTED]")
- Prevents accidental logging of sensitive values in any string context

### 4. Firebase Admin Initialization
- `initializeFirebase(config)` with singleton pattern (checks `admin.apps.length`)
- `getAuth(config)` convenience function
- `getFirestore(config)` convenience function
- `getStorage(config)` convenience function
- JSON.parse on serviceAccountKey for Firebase credential

### 5. Algolia Client Initialization
- `createAlgoliaAdminClient(config)` using admin API key
- `createAlgoliaSearchClient(config)` using search API key

### 6. Test Config
- `loadTestConfig()` factory returning valid GoodNeighborConfig with hardcoded test values
- Requires no environment variables
- Uses deterministic values suitable for unit tests

---

## Success Criteria

- [ ] `loadConfig()` with all required env vars returns a fully typed `GoodNeighborConfig` object
- [ ] `loadConfig()` with missing required vars (APP_URL, FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY, ALGOLIA_APPLICATION_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_SEARCH_API_KEY) throws ZodError with field-level error messages
- [ ] Default values applied correctly: NODE_ENV -> "development", APP_NAME -> "goodneighbor", ALGOLIA_INDEX_NAME -> "goodneighbor_search", SUPPORT_EMAIL -> "support@goodneighbor.com", EMAIL_FROM_NAME -> "Good Neighbor", SESSION_DURATION_DAYS -> 14
- [ ] `Secret.toString()` returns "[REDACTED]" and never exposes the underlying value
- [ ] `Secret.toJSON()` returns "[REDACTED]" for safe JSON.stringify behavior
- [ ] `Secret.reveal()` returns the original value
- [ ] Firebase initializes as singleton: second call to `initializeFirebase()` returns the same app instance
- [ ] `getAuth()`, `getFirestore()`, `getStorage()` return correct Firebase Admin types
- [ ] `createAlgoliaAdminClient()` and `createAlgoliaSearchClient()` return Algolia client instances
- [ ] `loadTestConfig()` succeeds with no environment variables set
- [ ] All unit tests pass

---

## Key Files to Create

```
src/config/
├── index.ts        # Barrel export for all config modules
├── schema.ts       # Zod schemas and inferred types (update existing scaffold)
├── loader.ts       # loadConfig(), loadTestConfig() (update existing scaffold)
├── secrets.ts      # Secret<T> class
├── firebase.ts     # initializeFirebase, getAuth, getFirestore, getStorage
└── algolia.ts      # createAlgoliaAdminClient, createAlgoliaSearchClient
```

---

## Tasks

1. [Task 6: Zod Config Schemas](../tasks/milestone-2-config-infrastructure/task-6-zod-config-schemas.md) - Define and test all Zod validation schemas with defaults and inferred types
2. [Task 7: Config Loader & Secret Class](../tasks/milestone-2-config-infrastructure/task-7-config-loader-secrets.md) - Implement loadConfig(), Secret<T>, and loadTestConfig()
3. [Task 8: Firebase Admin Initialization](../tasks/milestone-2-config-infrastructure/task-8-firebase-init.md) - Port singleton Firebase Admin initialization with getAuth/getFirestore/getStorage
4. [Task 9: Algolia Client Initialization & Test Config](../tasks/milestone-2-config-infrastructure/task-9-algolia-init-test-config.md) - Create Algolia client factories and verify end-to-end test config

---

## Environment Variables

```env
# App Configuration
NODE_ENV=development                         # Optional, default: "development"
APP_NAME=goodneighbor                        # Optional, default: "goodneighbor"
APP_URL=https://goodneighbor.com             # Required

# Firebase
FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY='{...}'   # Required, JSON string

# Algolia
ALGOLIA_APPLICATION_ID=ABC123                # Required
ALGOLIA_ADMIN_API_KEY=admin-key-here         # Required (Secret)
ALGOLIA_SEARCH_API_KEY=search-key-here       # Required
ALGOLIA_INDEX_NAME=goodneighbor_search       # Optional, default: "goodneighbor_search"

# Email (Mandrill)
MANDRILL_API_KEY=mandrill-key-here           # Optional (Secret)
SUPPORT_EMAIL=support@goodneighbor.com       # Optional, default: "support@goodneighbor.com"
EMAIL_FROM_NAME=Good Neighbor                # Optional, default: "Good Neighbor"

# Auth
SESSION_DURATION_DAYS=14                     # Optional, default: 14
```

---

## Testing Requirements

- [ ] Unit tests for each Zod schema: valid input passes, missing required fields fail with descriptive errors, default values applied
- [ ] Unit tests for loadConfig(): maps env vars correctly, applies defaults, throws on missing required vars
- [ ] Unit tests for Secret<T>: toString() returns "[REDACTED]", toJSON() returns "[REDACTED]", reveal() returns original value, template literal interpolation is safe
- [ ] Unit tests for loadTestConfig(): returns valid config with no env vars
- [ ] Unit tests for Firebase init: singleton pattern verified (mock firebase-admin), getAuth/getFirestore/getStorage return expected types
- [ ] Unit tests for Algolia init: client factories return client instances (mock algoliasearch)

---

## Documentation Requirements

- [ ] JSDoc comments on loadConfig() documenting all supported environment variables
- [ ] JSDoc comments on Secret<T> class with usage examples showing safe logging patterns
- [ ] JSDoc comments on Firebase init functions documenting singleton behavior
- [ ] JSDoc comments on Algolia factory functions documenting admin vs. search client differences
- [ ] Inline comments in schema.ts explaining validation constraints and default values

---

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Firebase service account key JSON parsing failures | High | Medium | Validate JSON structure in tests; provide clear error message on parse failure |
| Zod version incompatibility | Medium | Low | Pin Zod version in package.json; test schema behavior explicitly |
| Secret leaking through unexpected serialization path | High | Low | Test Secret in JSON.stringify, template literals, console.log, and Error messages |
| algoliasearch package API changes | Medium | Low | Pin version; wrap in factory functions that isolate the dependency |
| Singleton pattern breaks in test isolation | Medium | Medium | Provide resetFirebase() helper for tests; document singleton behavior |

---

**Next Milestone**: Milestone 3: Content Processing
**Blockers**: None (Milestone 1 types/errors are a soft dependency -- config schemas can be developed in parallel, but loader tests may need Result type)
**Notes**:
- The config/schema.ts and config/loader.ts files already exist as scaffolds and should be updated in place.
- The `algoliasearch` package needs to be added to package.json dependencies if not already present.
- Firebase Admin SDK is already in dependencies from the scaffold.
- The Secret class follows the core-sdk config-secrets pattern exactly.
- `loadTestConfig()` must be usable from any test file without setting up environment variables.
