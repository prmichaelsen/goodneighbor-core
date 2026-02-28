# Milestone 4: Search Service

**Goal**: Port Algolia search integration including the AlgoliaFilters builder, SearchService, and index configuration
**Duration**: 3-4 days
**Dependencies**: M1 (search types, Result type, error classes), M2 (Algolia client initialization via config)
**Status**: Not Started

---

## Overview

This milestone ports the Algolia search layer from goodneighbor into goodneighbor-core. The search system is the primary query interface for all content in the application -- posts, feeds, comments, and submissions are all indexed into a single Algolia index (`goodneighbor_search`) and queried with permission-filtered searches.

The implementation has three distinct components:

1. **AlgoliaFilters builder** -- a fluent builder class that constructs valid Algolia filter strings while enforcing Algolia's structural constraint: only `(OR group) AND (OR group) AND condition` patterns are allowed (never AND-within-OR). This class also provides convenience methods for common permission patterns like `addUserPermissions(userId)`.

2. **SearchService** -- the full search service wrapping the Algolia client with methods for querying (with automatic permission filter injection), indexing (non-blocking, errors logged but not thrown), updating, deleting, and batch operations. All methods return `Result<T, ExternalServiceError>`.

3. **Index configuration** -- the exact Algolia index settings (searchable attributes, facets, ranking, typo tolerance, pagination) that must be applied via `initializeIndex()` to match the production configuration.

Key design constraints:
- Every search call must automatically inject user permission filters via `refs.hasViewer`.
- Indexing operations must be non-blocking -- Algolia failures must not fail API requests.
- The `@uid:{firebaseUid}` semantic ID format is used in all permission filters.
- `@public` is the visibility token for public content in `refs.hasViewer`.

---

## Deliverables

### 1. AlgoliaFilters Builder
- `AlgoliaFilters` class with fluent API for constructing filter strings
- Core methods: `addOrGroup()`, `addOr()`, `newOrGroup()`, `addAnd()`, `addAnds()`, `getFilter()`, `isEmpty()`, `reset()`, `clone()`
- Convenience methods: `addUserPermissions(userId)`, `addType(type)`, `addOrType(type)`, `addFeeds(feedIds)`, `addTags(tags)`
- Static factories: `AlgoliaFilters.create()`, `AlgoliaFilters.fromString(filterString)`
- Pre-built convenience filters: `createFilter()`, `createPostFilter()`, `createUserPostFilter(userId)`

### 2. SearchService
- `ISearchService` interface defining the full search API contract
- `SearchService` implementation with:
  - `search(params, userId?)` -- auto-injects user permission filter, merges default attributes, calls Algolia
  - `indexDocument(document, objectID)` -- non-blocking indexing with error logging
  - `indexDocuments(documents)` -- batch indexing
  - `updateDocument(objectID, updates)` -- partial update
  - `deleteDocument(objectID)` -- single deletion
  - `deleteDocuments(objectIDs)` -- batch deletion
  - `initializeIndex()` -- configure index settings

### 3. Index Configuration
- `indexSettings` constant matching the exact Algolia configuration from the search-architecture design doc
- Searchable attributes: `search`, `properties.mainContent`, `properties.displayName`
- All `refs.*` facets for permission filtering
- Custom ranking, highlighting, snippets, pagination, and typo tolerance settings

---

## Success Criteria

- [ ] `AlgoliaFilters.create().addType("post").addUserPermissions(uid).getFilter()` produces a valid Algolia filter string with correct syntax
- [ ] `addUserPermissions(userId)` produces `refs.hasViewer:"@public" OR refs.hasViewer:"@uid:{userId}"` as an OR group
- [ ] Complex filter combinations (multiple OR groups joined by AND) produce syntactically correct output
- [ ] `AlgoliaFilters.create().isEmpty()` returns `true`; populated filters return `false`
- [ ] `clone()` produces an independent copy that can be modified without affecting the original
- [ ] `SearchService.search()` always includes a permission filter even when no explicit filter is provided
- [ ] `SearchService.search()` merges default attributes into the search parameters
- [ ] `SearchService.indexDocument()` catches errors and logs them rather than throwing
- [ ] All `SearchService` methods return `Result<T, ExternalServiceError>` types
- [ ] `initializeIndex()` configures all Algolia settings matching the search-architecture design doc exactly
- [ ] All files compile without TypeScript errors (`npm run typecheck` passes)
- [ ] All unit tests pass with mocked Algolia client

---

## Key Files to Create

```
src/
├── lib/
│   ├── algolia-filters.ts       # AlgoliaFilters builder class and convenience factories
│   └── algolia-filters.spec.ts
└── services/
    ├── search.service.ts        # ISearchService interface and SearchService implementation
    └── search.service.spec.ts
```

---

## Tasks

1. [Task 15: AlgoliaFilters Builder Class](../tasks/milestone-4-search-service/task-15-algolia-filters.md) - Implement the filter builder with fluent API, convenience methods, and static factories
2. [Task 16: SearchService Implementation](../tasks/milestone-4-search-service/task-16-search-service.md) - Implement the full search service with permission injection and non-blocking indexing
3. [Task 17: Algolia Index Configuration](../tasks/milestone-4-search-service/task-17-index-configuration.md) - Implement initializeIndex() with exact settings from the design doc

---

## Environment Variables

```env
# Algolia Configuration (provided via M2 config infrastructure)
ALGOLIA_APP_ID=your_app_id
ALGOLIA_ADMIN_API_KEY=your_admin_key
ALGOLIA_SEARCH_API_KEY=your_search_key
ALGOLIA_INDEX_NAME=goodneighbor_search
```

These variables are loaded and validated by the config infrastructure from M2. SearchService receives them via dependency injection, not by reading env vars directly.

---

## Testing Requirements

- [ ] Unit tests for AlgoliaFilters: empty filter, single type filter, user permissions filter, combined filters, complex multi-group filters
- [ ] Unit tests for AlgoliaFilters convenience methods: addUserPermissions produces correct OR group, addType produces correct AND, addFeeds produces correct OR group
- [ ] Unit tests for AlgoliaFilters static factories: create() returns empty instance, fromString() parses existing filter
- [ ] Unit tests for AlgoliaFilters immutability: clone() produces independent copy, reset() clears state
- [ ] Unit tests for pre-built convenience filters: createFilter, createPostFilter, createUserPostFilter
- [ ] Unit tests for SearchService.search(): merges default attributes, injects permission filter, calls Algolia client
- [ ] Unit tests for SearchService.indexDocument(): calls Algolia saveObject, catches and logs errors
- [ ] Unit tests for SearchService.indexDocuments(): calls Algolia saveObjects with batch
- [ ] Unit tests for SearchService.deleteDocument/deleteDocuments: calls Algolia deleteObject/deleteObjects
- [ ] Unit tests for SearchService.initializeIndex(): calls Algolia setSettings with exact configuration
- [ ] All tests use mocked Algolia client (no real API calls)

---

## Documentation Requirements

- [ ] JSDoc comments on AlgoliaFilters class and all public methods
- [ ] JSDoc comments on ISearchService interface documenting each method's contract
- [ ] JSDoc comments on convenience filter factories documenting the produced filter pattern
- [ ] Inline comments in indexSettings explaining each configuration section
- [ ] Inline comments in search() explaining the permission injection flow

---

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Algolia filter syntax errors at runtime | High | Medium | Comprehensive unit tests for all filter combinations; validate getFilter() output against Algolia's documented syntax rules |
| Permission filter bypass (missing addUserPermissions) | High | Low | SearchService.search() always injects permissions; no code path skips this step |
| Non-blocking indexing silently losing data | Medium | Low | Log all indexing errors with sufficient context (objectID, operation) for debugging |
| Index settings drift from production | Medium | Medium | Define settings as a frozen constant; test that initializeIndex() sends exactly this constant to Algolia |
| Algolia client API changes between versions | Low | Low | Pin algoliasearch dependency version; use typed wrappers for all Algolia calls |

---

**Next Milestone**: [Milestone 5: Core Services](./milestone-5-core-services.md)
**Blockers**: None (M1 and M2 are prerequisites but not blockers to writing the milestone)
**Notes**:
- The AlgoliaFilters builder is pure logic with no external dependencies. It should be implemented and tested first as it is the foundation for all search operations.
- SearchService depends on the Algolia client initialization from M2. If M2 is not yet complete, SearchService can be implemented against a client interface and tested with mocks.
- The `fromString()` static factory on AlgoliaFilters is a convenience for wrapping existing filter strings in the builder API. It does not need to parse arbitrary Algolia filter syntax -- it wraps the string as a single AND condition.
- User search (by username/displayName prefix) is Firestore-based and belongs in ProfileService, not SearchService. It is not part of this milestone.
