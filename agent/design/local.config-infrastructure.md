# Config & Infrastructure

**Concept**: Environment configuration, Firebase/Algolia/Email initialization, secret handling, and dependency injection wiring
**Created**: 2026-02-28
**Status**: Design Specification

---

## Overview

goodneighbor-core needs validated configuration for Firebase Admin SDK, Algolia, and email (Mandrill) at startup. This document specifies the Zod schemas, environment variable mapping, secret handling, Firebase/Algolia client initialization, and ServiceContainer wiring — following the core-sdk config-schema, config-environment, and config-secrets patterns.

---

## Problem Statement

The goodneighbor Next.js app reads environment variables ad-hoc throughout the codebase (`process.env.ALGOLIA_APPLICATION_ID` in algolia.ts, `process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY` in firebase-admin.ts, etc.). There is no centralized validation — misconfiguration is only discovered at runtime when a function happens to read a missing variable. goodneighbor-core must validate all config at startup and expose it as a typed, validated object.

---

## Solution

A single `GoodNeighborConfig` validated by Zod at startup, with `Secret<T>` wrappers for sensitive values, and a `ServiceContainer` that initializes all services with their required config slices.

---

## Implementation

### Environment Variables

| Variable | Required | Schema | Used By |
|----------|----------|--------|---------|
| `NODE_ENV` | No (default: development) | `enum: development, staging, production` | AppConfig |
| `APP_NAME` | No (default: goodneighbor) | `string` | AppConfig |
| `APP_URL` | Yes | `string.url` | AppConfig |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY` | Yes | `string (JSON)` | FirebaseConfig (Secret) |
| `ALGOLIA_APPLICATION_ID` | Yes | `string` | AlgoliaConfig |
| `ALGOLIA_ADMIN_API_KEY` | Yes | `string` | AlgoliaConfig (Secret) |
| `ALGOLIA_SEARCH_API_KEY` | Yes | `string` | AlgoliaConfig |
| `ALGOLIA_INDEX_NAME` | No (default: goodneighbor_search) | `string` | AlgoliaConfig |
| `MANDRILL_API_KEY` | No | `string` | EmailConfig (Secret) |
| `SUPPORT_EMAIL` | No (default: support@goodneighbor.com) | `string.email` | EmailConfig |
| `EMAIL_FROM_NAME` | No (default: Good Neighbor) | `string` | EmailConfig |
| `SESSION_DURATION_DAYS` | No (default: 14) | `number` | AuthConfig |

### Zod Schemas

```typescript
import { z } from "zod";

export const AppConfigSchema = z.object({
  env: z.enum(["development", "staging", "production"]).default("development"),
  appName: z.string().default("goodneighbor"),
  appUrl: z.string().url(),
});

export const FirebaseConfigSchema = z.object({
  serviceAccountKey: z.string().min(1, "FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY required"),
});

export const AlgoliaConfigSchema = z.object({
  appId: z.string().min(1, "ALGOLIA_APPLICATION_ID required"),
  adminApiKey: z.string().min(1, "ALGOLIA_ADMIN_API_KEY required"),
  searchApiKey: z.string().min(1, "ALGOLIA_SEARCH_API_KEY required"),
  indexName: z.string().default("goodneighbor_search"),
});

export const EmailConfigSchema = z.object({
  mandrillApiKey: z.string().optional(),
  supportEmail: z.string().email().default("support@goodneighbor.com"),
  fromName: z.string().default("Good Neighbor"),
});

export const AuthConfigSchema = z.object({
  sessionDurationDays: z.number().int().min(1).max(30).default(14),
});

export const GoodNeighborConfigSchema = z.object({
  app: AppConfigSchema,
  firebase: FirebaseConfigSchema,
  algolia: AlgoliaConfigSchema,
  email: EmailConfigSchema,
  auth: AuthConfigSchema,
});

export type GoodNeighborConfig = z.infer<typeof GoodNeighborConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type FirebaseConfig = z.infer<typeof FirebaseConfigSchema>;
export type AlgoliaConfig = z.infer<typeof AlgoliaConfigSchema>;
export type EmailConfig = z.infer<typeof EmailConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
```

### Config Loader

```typescript
export function loadConfig(envOverrides?: Partial<Record<string, string>>): GoodNeighborConfig {
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
```

### Secret Handling

Following the core-sdk config-secrets pattern, sensitive values are wrapped in `Secret<T>`:

```typescript
export class Secret<T extends string = string> {
  constructor(private value: T) {}
  reveal(): T { return this.value; }
  toString(): string { return "[REDACTED]"; }
  toJSON(): string { return "[REDACTED]"; }
}
```

Usage in service initialization:

```typescript
const config = loadConfig();
const firebaseSecret = new Secret(config.firebase.serviceAccountKey);
const algoliaAdminSecret = new Secret(config.algolia.adminApiKey);

// Safe to log
logger.info("Config loaded", {
  appName: config.app.appName,
  algoliaAppId: config.algolia.appId,
  firebaseKey: firebaseSecret.toString(), // "[REDACTED]"
});

// Reveal only when needed
const serviceAccount = JSON.parse(firebaseSecret.reveal());
```

### Firebase Admin Initialization

Port the singleton pattern from `lib/firebase-admin.ts`:

```typescript
import * as admin from "firebase-admin";

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(config: FirebaseConfig): admin.app.App {
  if (firebaseApp) return firebaseApp;

  const serviceAccount = JSON.parse(config.serviceAccountKey);

  if (admin.apps.length === 0) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    firebaseApp = admin.app();
  }

  return firebaseApp;
}

export function getAuth(config: FirebaseConfig): admin.auth.Auth {
  return initializeFirebase(config).auth();
}

export function getFirestore(config: FirebaseConfig): admin.firestore.Firestore {
  return initializeFirebase(config).firestore();
}

export function getStorage(config: FirebaseConfig): admin.storage.Storage {
  return initializeFirebase(config).storage();
}
```

### Algolia Client Initialization

Port from `lib/algolia.ts`:

```typescript
import { algoliasearch } from "algoliasearch";

export function createAlgoliaAdminClient(config: AlgoliaConfig) {
  return algoliasearch(config.appId, config.adminApiKey);
}

export function createAlgoliaSearchClient(config: AlgoliaConfig) {
  return algoliasearch(config.appId, config.searchApiKey);
}
```

### ServiceContainer Wiring

```typescript
export function createServiceContainer(config: GoodNeighborConfig): ServiceContainer {
  const container = new ServiceContainer();

  // Infrastructure
  const firestore = getFirestore(config.firebase);
  const auth = getAuth(config.firebase);
  const algoliaAdmin = createAlgoliaAdminClient(config.algolia);
  const algoliaSearch = createAlgoliaSearchClient(config.algolia);

  // Services
  container.registerSingleton("authService", () =>
    new AuthService(auth, config.auth)
  );

  container.registerSingleton("searchService", () =>
    new SearchService(algoliaAdmin, algoliaSearch, config.algolia)
  );

  container.registerSingleton("contentService", () =>
    new ContentService(firestore, container.resolve("searchService"))
  );

  container.registerSingleton("profileService", () =>
    new ProfileService(firestore)
  );

  container.registerSingleton("feedService", () =>
    new FeedService(firestore, container.resolve("searchService"))
  );

  container.registerSingleton("commentService", () =>
    new CommentService(firestore, container.resolve("searchService"))
  );

  container.registerSingleton("notificationService", () =>
    new NotificationService(firestore, config.email)
  );

  container.registerSingleton("i18nService", () =>
    new I18nService()
  );

  return container;
}
```

### Test Config

```typescript
export function loadTestConfig(): GoodNeighborConfig {
  return GoodNeighborConfigSchema.parse({
    app: {
      env: "development",
      appName: "goodneighbor-test",
      appUrl: "http://localhost:3000",
    },
    firebase: {
      serviceAccountKey: '{"type":"service_account","project_id":"test"}',
    },
    algolia: {
      appId: "test-app-id",
      adminApiKey: "test-admin-key",
      searchApiKey: "test-search-key",
      indexName: "goodneighbor_test",
    },
    email: {
      supportEmail: "test@example.com",
    },
    auth: {
      sessionDurationDays: 1,
    },
  });
}
```

---

## Benefits

- **Fail-fast**: Zod validation at startup catches all missing/invalid env vars immediately
- **Type-safe**: All config access is fully typed after validation
- **Secret-safe**: Sensitive values never appear in logs or error messages
- **Testable**: `loadTestConfig()` provides deterministic config for tests without env vars
- **Documented**: The schema itself documents every config option with defaults

---

## Trade-offs

- **No hot-reload**: Config is loaded once at startup. Service restart required for config changes. (Acceptable for server-side library.)
- **JSON service account key**: Firebase service account key stored as JSON string in env var, not as a file path. This matches the existing goodneighbor pattern.

---

## Dependencies

- `zod` (already installed) — Schema validation
- `firebase-admin` (already installed) — Firebase initialization
- `algoliasearch` (to be installed) — Algolia client

---

## Testing Strategy

- **Unit tests**: `loadConfig()` with valid env → returns typed config
- **Unit tests**: `loadConfig()` with missing required vars → throws ZodError with field names
- **Unit tests**: `loadConfig()` with defaults → fills in default values
- **Unit tests**: `Secret.toString()` returns `[REDACTED]`, `.reveal()` returns value
- **Unit tests**: `loadTestConfig()` always succeeds with no env vars

---

## Migration Path

1. Create Zod schemas and `loadConfig()` function
2. Create `Secret<T>` class
3. Port Firebase initialization (singleton pattern)
4. Port Algolia client initialization
5. Create `ServiceContainer` and `createServiceContainer()` factory
6. Create `loadTestConfig()` for tests

---

**Status**: Design Specification
**Recommendation**: Implement immediately after types — this unblocks all service implementations
**Related Documents**:
- `agent/design/local.goodneighbor-core.md` — Overall architecture
- `agent/patterns/core-sdk.config-schema.md` — Config schema pattern
- `agent/patterns/core-sdk.config-environment.md` — Environment variable mapping pattern
- `agent/patterns/core-sdk.config-secrets.md` — Secret handling pattern
- `agent/patterns/core-sdk.service-container.md` — DI container pattern
