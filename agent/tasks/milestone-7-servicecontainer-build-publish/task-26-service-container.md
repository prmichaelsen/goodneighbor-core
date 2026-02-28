# Task 26: ServiceContainer Wiring

**Milestone**: [M7 - ServiceContainer, Build & Publish](../../milestones/milestone-7-servicecontainer-build-publish.md)
**Estimated Time**: 4 hours
**Dependencies**: Tasks 18-25 (all 8 services must be implemented)
**Status**: Not Started

---

## Objective

Implement the `ServiceContainer` class and `createServiceContainer(config: GoodNeighborConfig)` factory function. The container registers all 8 services (AuthService, ContentService, SearchService, ProfileService, FeedService, CommentService, NotificationService, I18nService) as lazy singletons. The factory initializes Firebase Admin (Firestore, Auth) and Algolia clients (admin, search) from the validated config, then wires each service with its required dependencies.

---

## Context

The ServiceContainer is the top-level entry point for consumers of goodneighbor-core. Rather than requiring consumers to manually instantiate Firebase clients, Algolia clients, and 8 service classes with correct dependency injection, they call `createServiceContainer(loadConfig())` and resolve the services they need. This follows the core-sdk service-container pattern.

Key design decisions:
- **Lazy singletons**: Services are created on first `resolve()` call, not at registration time. This avoids initializing services that a consumer never uses (e.g., a search-only consumer does not need NotificationService).
- **Eager infrastructure**: Firebase Admin and Algolia clients are initialized immediately in the factory, because multiple services share them and they represent external connections.
- **Acyclic dependency graph**: The service dependency graph has no cycles. AuthService and I18nService have no service dependencies. SearchService depends only on Algolia clients. ContentService, FeedService, and CommentService depend on Firestore and SearchService. NotificationService depends on Firestore and email config. ProfileService depends only on Firestore.

The config infrastructure (`loadConfig()`, `GoodNeighborConfig`, `initializeFirebase()`, `createAlgoliaAdminClient()`, etc.) was implemented in M2 (Config & Infrastructure).

---

## Steps

### 1. Create services/container.ts with ServiceContainer Class

Create `src/services/container.ts` with the generic ServiceContainer:

```typescript
/**
 * Generic dependency injection container with lazy singleton support.
 * Services are registered as factory functions and instantiated on first resolve.
 */
export class ServiceContainer {
  private factories = new Map<string, () => unknown>();
  private instances = new Map<string, unknown>();

  /**
   * Register a service factory. The factory will be called lazily on first resolve().
   * Subsequent resolve() calls return the cached singleton instance.
   */
  registerSingleton<T>(name: string, factory: () => T): void {
    if (this.factories.has(name)) {
      throw new Error(`Service "${name}" is already registered`);
    }
    this.factories.set(name, factory);
  }

  /**
   * Resolve a registered service by name.
   * On first call, invokes the factory and caches the result.
   * On subsequent calls, returns the cached instance.
   *
   * @throws Error if the service name is not registered
   */
  resolve<T>(name: string): T {
    // Return cached instance if already created
    if (this.instances.has(name)) {
      return this.instances.get(name) as T;
    }

    // Look up factory
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(
        `Service "${name}" is not registered. Available services: ${[...this.factories.keys()].join(', ')}`
      );
    }

    // Create instance, cache, and return
    const instance = factory() as T;
    this.instances.set(name, instance);
    return instance;
  }

  /**
   * Check whether a service is registered (but not necessarily instantiated).
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * Returns the list of all registered service names.
   */
  getRegisteredNames(): string[] {
    return [...this.factories.keys()];
  }
}
```

### 2. Add Service Name Constants

Add typed constants for service names to prevent typos and enable autocomplete:

```typescript
/**
 * Service name constants for use with container.resolve().
 * Using constants instead of raw strings prevents typos and enables
 * find-all-references for refactoring.
 */
export const SERVICE_NAMES = {
  AUTH: 'authService',
  CONTENT: 'contentService',
  SEARCH: 'searchService',
  PROFILE: 'profileService',
  FEED: 'feedService',
  COMMENT: 'commentService',
  NOTIFICATION: 'notificationService',
  I18N: 'i18nService',
} as const;

export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];
```

### 3. Implement createServiceContainer Factory

Add the factory function that initializes infrastructure and registers all 8 services:

```typescript
import { GoodNeighborConfig } from '../config';
import { initializeFirebase, getFirestore, getAuth } from '../config/firebase';
import { createAlgoliaAdminClient, createAlgoliaSearchClient } from '../lib/algolia';
import { AuthService } from './auth.service';
import { ContentService } from './content.service';
import { SearchService } from './search.service';
import { ProfileService } from './profile.service';
import { FeedService } from './feed.service';
import { CommentService } from './comment.service';
import { NotificationService } from './notification.service';
import { I18nService } from '../i18n';

/**
 * Create a fully-wired ServiceContainer from validated configuration.
 *
 * Infrastructure (Firebase, Algolia) is initialized eagerly.
 * Services are registered as lazy singletons -- instantiated on first resolve().
 *
 * Usage:
 * ```typescript
 * const config = loadConfig();
 * const container = createServiceContainer(config);
 * const searchService = container.resolve<SearchService>(SERVICE_NAMES.SEARCH);
 * ```
 */
export function createServiceContainer(config: GoodNeighborConfig): ServiceContainer {
  const container = new ServiceContainer();

  // --- Eager infrastructure initialization ---
  // Firebase Admin SDK
  initializeFirebase(config.firebase);
  const firestore = getFirestore(config.firebase);
  const auth = getAuth(config.firebase);

  // Algolia clients
  const algoliaAdmin = createAlgoliaAdminClient(config.algolia);
  const algoliaSearch = createAlgoliaSearchClient(config.algolia);

  // --- Lazy service registration ---
  // Services with no service dependencies
  container.registerSingleton(SERVICE_NAMES.AUTH, () =>
    new AuthService(auth, config.auth)
  );

  container.registerSingleton(SERVICE_NAMES.I18N, () =>
    new I18nService()
  );

  // SearchService depends only on Algolia clients (infrastructure)
  container.registerSingleton(SERVICE_NAMES.SEARCH, () =>
    new SearchService(algoliaAdmin, algoliaSearch, config.algolia)
  );

  // ProfileService depends only on Firestore (infrastructure)
  container.registerSingleton(SERVICE_NAMES.PROFILE, () =>
    new ProfileService(firestore)
  );

  // Services that depend on SearchService
  container.registerSingleton(SERVICE_NAMES.CONTENT, () =>
    new ContentService(firestore, container.resolve<SearchService>(SERVICE_NAMES.SEARCH))
  );

  container.registerSingleton(SERVICE_NAMES.FEED, () =>
    new FeedService(firestore, container.resolve<SearchService>(SERVICE_NAMES.SEARCH))
  );

  container.registerSingleton(SERVICE_NAMES.COMMENT, () =>
    new CommentService(firestore, container.resolve<SearchService>(SERVICE_NAMES.SEARCH))
  );

  // NotificationService depends on Firestore and email config
  container.registerSingleton(SERVICE_NAMES.NOTIFICATION, () =>
    new NotificationService(firestore, config.email)
  );

  return container;
}
```

### 4. Add Typed Resolve Helper (Optional Convenience)

Add a typed helper that narrows the return type based on service name:

```typescript
/**
 * Type-safe service resolution map.
 * Maps service name constants to their concrete types for typed resolve().
 */
export interface ServiceMap {
  [SERVICE_NAMES.AUTH]: AuthService;
  [SERVICE_NAMES.CONTENT]: ContentService;
  [SERVICE_NAMES.SEARCH]: SearchService;
  [SERVICE_NAMES.PROFILE]: ProfileService;
  [SERVICE_NAMES.FEED]: FeedService;
  [SERVICE_NAMES.COMMENT]: CommentService;
  [SERVICE_NAMES.NOTIFICATION]: NotificationService;
  [SERVICE_NAMES.I18N]: I18nService;
}

/**
 * Type-safe resolve: returns the correct service type based on the name constant.
 *
 * Usage:
 * ```typescript
 * const search = resolveService(container, SERVICE_NAMES.SEARCH);
 * // search is typed as SearchService
 * ```
 */
export function resolveService<K extends keyof ServiceMap>(
  container: ServiceContainer,
  name: K,
): ServiceMap[K] {
  return container.resolve<ServiceMap[K]>(name);
}
```

### 5. Update services/index.ts Barrel Export

Ensure the services barrel export includes the container:

```typescript
// ... existing service exports ...
export { ServiceContainer, createServiceContainer, SERVICE_NAMES, resolveService } from './container';
export type { ServiceName, ServiceMap } from './container';
```

### 6. Write Unit Tests

Create `src/services/__tests__/container.spec.ts`:

```typescript
import { ServiceContainer, SERVICE_NAMES } from '../container';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('registerSingleton', () => {
    it('should register a factory without calling it', () => {
      const factory = jest.fn(() => ({ name: 'test' }));
      container.registerSingleton('testService', factory);

      expect(factory).not.toHaveBeenCalled();
      expect(container.has('testService')).toBe(true);
    });

    it('should throw if registering a duplicate name', () => {
      container.registerSingleton('testService', () => ({}));

      expect(() => {
        container.registerSingleton('testService', () => ({}));
      }).toThrow('Service "testService" is already registered');
    });
  });

  describe('resolve', () => {
    it('should call factory on first resolve and return instance', () => {
      const instance = { name: 'test-service' };
      const factory = jest.fn(() => instance);
      container.registerSingleton('testService', factory);

      const resolved = container.resolve('testService');

      expect(factory).toHaveBeenCalledTimes(1);
      expect(resolved).toBe(instance);
    });

    it('should return cached instance on subsequent resolves (singleton)', () => {
      const factory = jest.fn(() => ({ name: 'test' }));
      container.registerSingleton('testService', factory);

      const first = container.resolve('testService');
      const second = container.resolve('testService');

      expect(factory).toHaveBeenCalledTimes(1);
      expect(first).toBe(second); // Same reference
    });

    it('should throw for unregistered service names', () => {
      expect(() => {
        container.resolve('nonExistent');
      }).toThrow('Service "nonExistent" is not registered');
    });
  });

  describe('has', () => {
    it('should return false for unregistered services', () => {
      expect(container.has('unknown')).toBe(false);
    });

    it('should return true for registered services', () => {
      container.registerSingleton('myService', () => ({}));
      expect(container.has('myService')).toBe(true);
    });
  });

  describe('getRegisteredNames', () => {
    it('should return empty array when no services registered', () => {
      expect(container.getRegisteredNames()).toEqual([]);
    });

    it('should return all registered service names', () => {
      container.registerSingleton('a', () => ({}));
      container.registerSingleton('b', () => ({}));
      container.registerSingleton('c', () => ({}));

      expect(container.getRegisteredNames()).toEqual(['a', 'b', 'c']);
    });
  });
});

describe('SERVICE_NAMES', () => {
  it('should define all 8 service name constants', () => {
    expect(Object.keys(SERVICE_NAMES)).toHaveLength(8);
    expect(SERVICE_NAMES.AUTH).toBe('authService');
    expect(SERVICE_NAMES.CONTENT).toBe('contentService');
    expect(SERVICE_NAMES.SEARCH).toBe('searchService');
    expect(SERVICE_NAMES.PROFILE).toBe('profileService');
    expect(SERVICE_NAMES.FEED).toBe('feedService');
    expect(SERVICE_NAMES.COMMENT).toBe('commentService');
    expect(SERVICE_NAMES.NOTIFICATION).toBe('notificationService');
    expect(SERVICE_NAMES.I18N).toBe('i18nService');
  });
});
```

Create `src/services/__tests__/createServiceContainer.spec.ts` to test the factory wiring (with mocked dependencies):

```typescript
import { createServiceContainer, SERVICE_NAMES } from '../container';
import { loadTestConfig } from '../../config';

// Mock Firebase and Algolia initialization
jest.mock('../../config/firebase', () => ({
  initializeFirebase: jest.fn(),
  getFirestore: jest.fn(() => ({})),
  getAuth: jest.fn(() => ({})),
}));

jest.mock('../../lib/algolia', () => ({
  createAlgoliaAdminClient: jest.fn(() => ({})),
  createAlgoliaSearchClient: jest.fn(() => ({})),
}));

// Mock all service constructors
jest.mock('../auth.service');
jest.mock('../content.service');
jest.mock('../search.service');
jest.mock('../profile.service');
jest.mock('../feed.service');
jest.mock('../comment.service');
jest.mock('../notification.service');
jest.mock('../../i18n');

describe('createServiceContainer', () => {
  it('should register all 8 services', () => {
    const config = loadTestConfig();
    const container = createServiceContainer(config);

    const names = container.getRegisteredNames();
    expect(names).toHaveLength(8);
    expect(names).toContain(SERVICE_NAMES.AUTH);
    expect(names).toContain(SERVICE_NAMES.CONTENT);
    expect(names).toContain(SERVICE_NAMES.SEARCH);
    expect(names).toContain(SERVICE_NAMES.PROFILE);
    expect(names).toContain(SERVICE_NAMES.FEED);
    expect(names).toContain(SERVICE_NAMES.COMMENT);
    expect(names).toContain(SERVICE_NAMES.NOTIFICATION);
    expect(names).toContain(SERVICE_NAMES.I18N);
  });

  it('should lazily resolve services (factory not called until resolve)', () => {
    const config = loadTestConfig();
    const container = createServiceContainer(config);

    // Services not yet instantiated
    const { AuthService } = require('../auth.service');
    expect(AuthService).not.toHaveBeenCalled();

    // Resolve triggers instantiation
    container.resolve(SERVICE_NAMES.AUTH);
    expect(AuthService).toHaveBeenCalledTimes(1);
  });

  it('should resolve all 8 services without errors', () => {
    const config = loadTestConfig();
    const container = createServiceContainer(config);

    expect(() => container.resolve(SERVICE_NAMES.AUTH)).not.toThrow();
    expect(() => container.resolve(SERVICE_NAMES.CONTENT)).not.toThrow();
    expect(() => container.resolve(SERVICE_NAMES.SEARCH)).not.toThrow();
    expect(() => container.resolve(SERVICE_NAMES.PROFILE)).not.toThrow();
    expect(() => container.resolve(SERVICE_NAMES.FEED)).not.toThrow();
    expect(() => container.resolve(SERVICE_NAMES.COMMENT)).not.toThrow();
    expect(() => container.resolve(SERVICE_NAMES.NOTIFICATION)).not.toThrow();
    expect(() => container.resolve(SERVICE_NAMES.I18N)).not.toThrow();
  });
});
```

---

## Verification

- [ ] `src/services/container.ts` exists and exports `ServiceContainer`, `createServiceContainer`, `SERVICE_NAMES`, `resolveService`
- [ ] `ServiceContainer.registerSingleton()` stores factory without calling it
- [ ] `ServiceContainer.resolve()` calls factory on first access and caches the instance
- [ ] `ServiceContainer.resolve()` returns the same instance on subsequent calls (singleton behavior)
- [ ] `ServiceContainer.resolve()` throws descriptive error for unregistered service names
- [ ] `createServiceContainer()` registers all 8 services: authService, contentService, searchService, profileService, feedService, commentService, notificationService, i18nService
- [ ] Services are created lazily (factory not invoked until `resolve()` is called)
- [ ] Dependency injection is correct: ContentService receives Firestore and SearchService, FeedService receives Firestore and SearchService, etc.
- [ ] `SERVICE_NAMES` constants match the 8 service registration names
- [ ] `services/index.ts` barrel exports the container, factory, and service name constants
- [ ] All unit tests pass (`npm test`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)

---

## Expected Output

**File Structure**:
```
src/services/
├── __tests__/
│   ├── container.spec.ts             # ServiceContainer unit tests
│   └── createServiceContainer.spec.ts # Factory wiring tests
├── container.ts                       # ServiceContainer, createServiceContainer, SERVICE_NAMES
└── index.ts                           # Updated barrel export
```

**Key Files Created/Updated**:
- `src/services/container.ts`: ServiceContainer class with lazy singleton pattern, createServiceContainer factory, SERVICE_NAMES constants, resolveService helper, ServiceMap type
- `src/services/index.ts`: Updated to export container module
- `src/services/__tests__/container.spec.ts`: Unit tests for ServiceContainer class
- `src/services/__tests__/createServiceContainer.spec.ts`: Integration-style tests for factory wiring with mocked dependencies

---

## Common Issues and Solutions

### Issue 1: Circular dependency at import time
**Symptom**: Module import error or undefined service class when container.ts imports all 8 services
**Solution**: The container imports services at the module level, but the factories are only called lazily. If a circular import occurs, refactor to use dynamic imports inside the factory functions: `container.registerSingleton('contentService', async () => { const { ContentService } = await import('./content.service'); ... })`. However, this should not be needed given the acyclic dependency design.

### Issue 2: Firebase already initialized error
**Symptom**: `Firebase app named '[DEFAULT]' already exists` when calling createServiceContainer twice
**Solution**: The `initializeFirebase()` function (from M2) already guards against double initialization by checking `admin.apps.length`. Ensure the M2 implementation includes this guard. In tests, mock `initializeFirebase` to avoid real Firebase initialization.

### Issue 3: Service resolve order matters for cross-dependencies
**Symptom**: Resolving ContentService before SearchService would trigger SearchService creation via the factory
**Solution**: This is expected behavior. When ContentService is resolved, its factory calls `container.resolve(SERVICE_NAMES.SEARCH)`, which triggers SearchService creation if not already instantiated. This is correct lazy cascade behavior, not an error.

---

## Resources

- Design doc: `agent/design/local.config-infrastructure.md` -- ServiceContainer wiring specification
- Design doc: `agent/design/local.goodneighbor-core.md` -- Service dependency graph
- Pattern: `agent/patterns/core-sdk.service-container.md` -- DI container pattern reference

---

## Notes

- The dependency graph between services is intentionally simple and acyclic:
  - No dependencies: AuthService, I18nService
  - Infrastructure only: SearchService (Algolia), ProfileService (Firestore)
  - Infrastructure + SearchService: ContentService, FeedService, CommentService
  - Infrastructure + config: NotificationService (Firestore + EmailConfig)
- The `resolveService()` typed helper is optional but recommended for consumers. It provides compile-time type safety for resolve calls, avoiding the need for manual generic type parameters.
- The `loadTestConfig()` function from M2 provides deterministic test config without requiring environment variables. Use it in all unit tests that need a GoodNeighborConfig.
- Do not create a second ServiceContainer instance in the same process -- Firebase Admin SDK maintains global state. Tests should mock Firebase initialization.

---

**Next Task**: [Task 27: Package Build & Export Verification](./task-27-package-build-exports.md)
**Related Design Docs**: `agent/design/local.config-infrastructure.md`, `agent/design/local.goodneighbor-core.md`
**Estimated Completion Date**: TBD
