# Milestone 7: ServiceContainer, Build & Publish

**Goal**: Wire all services via ServiceContainer dependency injection, verify package build and exports, run integration tests, and prepare for npm publishing
**Duration**: 3-4 days
**Dependencies**: M1 (Types, Constants & Errors), M2 (Config & Infrastructure), M3 (Content Processing), M4 (Search Service), M5 (Core Services), M6 (Notification & I18n) -- all services and types must be complete
**Status**: Not Started

---

## Overview

This milestone is the final integration and release preparation phase of goodneighbor-core. With all 8 services (AuthService, ContentService, SearchService, ProfileService, FeedService, CommentService, NotificationService, I18nService) implemented in M2-M6, this milestone wires them together through a ServiceContainer using dependency injection, verifies the package build system and barrel exports, runs integration tests against Firebase emulators, and prepares the package for npm publication.

The ServiceContainer follows the core-sdk service-container pattern: a `createServiceContainer(config)` factory function initializes Firebase Admin and Algolia clients from validated config, then registers all 8 services as lazy singletons with correct dependency injection. Services are only instantiated on first `resolve()` call, avoiding unnecessary initialization cost for consumers that only use a subset of services.

This milestone also validates that the full build pipeline (esbuild ESM + CJS output, TypeScript declarations) produces correct artifacts, that all barrel export paths resolve for consumers, and that `npm pack` generates a clean tarball ready for publication.

---

## Deliverables

### 1. ServiceContainer
- `ServiceContainer` class with `registerSingleton(name, factory)` and `resolve(name)` methods
- `createServiceContainer(config: GoodNeighborConfig)` factory function
- Firebase Admin (Firestore, Auth) and Algolia (admin, search) client initialization from config
- Lazy singleton registration of all 8 services with correct dependency wiring
- Unit tests verifying lazy initialization, correct wiring, and resolve behavior

### 2. Package Exports
- Root barrel export (`src/index.ts`) re-exporting from all submodules
- Complete `index.ts` barrels for each submodule: types, constants, errors, services, config, i18n, client, testing
- `package.json` "exports" field with conditional exports for ESM and CJS
- esbuild configuration producing ESM output in `dist/esm/` and CJS output in `dist/cjs/`
- TypeScript declaration files (`.d.ts`) generated alongside build output

### 3. Integration Tests
- Firebase emulator connection setup in `testing/helpers.ts`
- Test data factories in `testing/fixtures.ts` for all entity types (posts, profiles, feeds, comments)
- Integration test suite: Firestore read/write for posts, profiles, feeds, comments
- Integration test suite: Auth session verification
- Integration test suite: search with permission filtering (Algolia mock or emulator)
- Separate Jest configuration for integration tests (`jest.integration.config.ts`)

### 4. npm Publish Preparation
- `package.json` metadata: name `@prmichaelsen/goodneighbor-core`, version `0.1.0`, description, keywords, repository, author, license
- `.npmignore` excluding agent/, src/, tests/, .claude/ from published package
- Clean `npm pack` tarball containing only dist/, package.json, README.md, LICENSE
- Version strategy documentation

---

## Success Criteria

- [ ] `createServiceContainer(loadConfig())` initializes and returns a container with all 8 services registered
- [ ] Container resolves services lazily (service instances created on first `resolve()` call, not at registration time)
- [ ] All 8 services are resolvable: authService, contentService, searchService, profileService, feedService, commentService, notificationService, i18nService
- [ ] No circular dependencies between services
- [ ] Package builds with esbuild (`npm run build` succeeds, produces `dist/esm/` and `dist/cjs/` outputs)
- [ ] TypeScript declarations generated (`dist/**/*.d.ts` files present)
- [ ] All barrel export paths resolve correctly from a consumer perspective: root, /types, /constants, /errors, /services, /config, /i18n, /client, /testing
- [ ] Integration tests pass against Firebase emulator (Firestore read/write, Auth session verification)
- [ ] Search integration tests verify permission-filtered results
- [ ] `npm pack` produces a valid tarball with no source/test/agent files included
- [ ] Package metadata complete in package.json (name, version, description, keywords, repository, author, license, main, module, types)
- [ ] Package version is 0.1.0

---

## Key Files to Create

```
src/
├── services/
│   └── container.ts                 # ServiceContainer class, createServiceContainer() factory
├── index.ts                         # Root barrel export (update)
├── testing/
│   ├── index.ts                     # Testing barrel export
│   ├── fixtures.ts                  # Test data factories for all entity types
│   └── helpers.ts                   # Emulator connection setup, test utilities

# Build configuration
esbuild.build.js                     # Updated for ESM + CJS dual output (update)
package.json                         # Updated exports field, metadata (update)
.npmignore                           # Exclude agent/, src/, tests/, .claude/

# Build outputs
dist/
├── esm/                             # ESM output (.js + .d.ts)
│   ├── index.js
│   ├── index.d.ts
│   ├── types/
│   ├── constants/
│   ├── errors/
│   ├── services/
│   ├── config/
│   ├── i18n/
│   ├── client/
│   └── testing/
└── cjs/                             # CJS output (.cjs + .d.ts)
    └── ...

# Test configuration
jest.integration.config.ts           # Separate Jest config for integration tests

# Integration tests
tests/
└── integration/
    ├── firestore.integration.spec.ts
    ├── auth.integration.spec.ts
    └── search.integration.spec.ts
```

---

## Tasks

1. [Task 26: ServiceContainer Wiring](../tasks/milestone-7-servicecontainer-build-publish/task-26-service-container.md) - Implement ServiceContainer class and createServiceContainer() factory with lazy singleton registration of all 8 services
2. [Task 27: Package Build & Export Verification](../tasks/milestone-7-servicecontainer-build-publish/task-27-package-build-exports.md) - Verify esbuild output, barrel exports, package.json exports field, and TypeScript declarations
3. [Task 28: Integration Tests](../tasks/milestone-7-servicecontainer-build-publish/task-28-integration-tests.md) - Write integration tests against Firebase emulator for Firestore, Auth, and search flows
4. [Task 29: npm Publish Preparation](../tasks/milestone-7-servicecontainer-build-publish/task-29-npm-publish-prep.md) - Finalize package.json metadata, .npmignore, npm pack verification, and version strategy

---

## Environment Variables

All environment variables are defined in M2 (Config & Infrastructure) and validated by the `GoodNeighborConfig` Zod schema. This milestone uses them via `loadConfig()` at container creation time:

```env
# App
NODE_ENV=development
APP_NAME=goodneighbor
APP_URL=http://localhost:3000

# Firebase
FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Algolia
ALGOLIA_APPLICATION_ID=your-app-id
ALGOLIA_ADMIN_API_KEY=your-admin-key
ALGOLIA_SEARCH_API_KEY=your-search-key
ALGOLIA_INDEX_NAME=goodneighbor_search

# Email (optional)
MANDRILL_API_KEY=your-mandrill-key
SUPPORT_EMAIL=support@goodneighbor.com
EMAIL_FROM_NAME=Good Neighbor

# Auth
SESSION_DURATION_DAYS=14
```

For integration tests, Firebase emulator environment variables are also needed:

```env
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

---

## Testing Requirements

- [ ] Unit tests for ServiceContainer: registerSingleton stores factory without calling it, resolve calls factory on first access, resolve returns same instance on subsequent calls
- [ ] Unit tests for createServiceContainer: all 8 services registered and resolvable, dependency injection wiring correct
- [ ] Integration tests for Firestore: create document, read document, update document, delete document
- [ ] Integration tests for Auth: verify session cookie, extract custom claims
- [ ] Integration tests for search: index document, search with permission filters, verify only visible results returned
- [ ] Integration tests for end-to-end flows: create post -> verify Firestore document -> verify Algolia index
- [ ] Build verification: npm run build succeeds, output files exist in dist/esm/ and dist/cjs/
- [ ] Export verification: all barrel export paths importable from consumer perspective
- [ ] Package verification: npm pack produces tarball, tarball contents inspected and correct

---

## Documentation Requirements

- [ ] JSDoc comments on ServiceContainer class and all public methods
- [ ] JSDoc comments on createServiceContainer() documenting config requirements and return type
- [ ] JSDoc comments on all test data factory functions in fixtures.ts
- [ ] Inline comments in container.ts explaining the dependency graph between services
- [ ] Package README.md with quick start, installation, and basic usage examples (Task 29)

---

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Circular dependency between services | High | Low | Services are designed with one-way dependencies; SearchService has no upward dependencies. ContentService, FeedService, CommentService depend on SearchService but not on each other. |
| Firebase emulator not available in CI | Medium | Medium | Integration tests can be run locally or in CI with emulator setup step. Provide clear instructions for emulator startup. |
| ESM/CJS dual output breaks imports | Medium | Medium | Test imports from both module systems. Use Node.js conditional exports in package.json. Verify with a test consumer project. |
| esbuild misses TypeScript declarations | Medium | Low | esbuild does not generate .d.ts files natively. Use tsc --emitDeclarationOnly alongside esbuild, or use a plugin. |
| npm pack includes unwanted files | Low | Medium | Verify tarball contents after every .npmignore change. Use `npm pack --dry-run` to preview. |
| Algolia emulator not available | Medium | Medium | Mock Algolia client in integration tests or use a dedicated test index. SearchService already wraps Algolia, making mocking straightforward. |

---

**Next Milestone**: None (this is the final milestone for the core library; future work includes adapters, client SDK, and goodneighbor app integration)
**Blockers**: M1-M6 must be complete before starting
**Notes**:
- The ServiceContainer design follows the core-sdk service-container pattern documented in `agent/patterns/core-sdk.service-container.md`.
- Firebase Admin and Algolia clients are initialized eagerly in `createServiceContainer()` (they are infrastructure, not services), while the 8 services are registered as lazy singletons.
- The dependency graph is acyclic: AuthService and I18nService have no service dependencies. SearchService depends only on Algolia clients. ContentService, FeedService, and CommentService depend on Firestore and SearchService. NotificationService depends on Firestore and email config. ProfileService depends only on Firestore.
- After this milestone, the goodneighbor Next.js app can begin importing from `@prmichaelsen/goodneighbor-core` to replace duplicated business logic.
