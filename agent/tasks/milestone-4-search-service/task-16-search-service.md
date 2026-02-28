# Task 16: SearchService Implementation

**Milestone**: [M4 - Search Service](../../milestones/milestone-4-search-service.md)
**Estimated Time**: 4 hours
**Dependencies**: Task 5 (error types -- ExternalServiceError), Task 9 (Algolia client initialization), Task 15 (AlgoliaFilters builder)
**Status**: Not Started

---

## Objective

Implement the `SearchService` with an `ISearchService` interface that wraps the Algolia client. The service provides:

- `search(params, userId?)` -- executes a search query with automatic user permission filter injection and default attribute merging
- `indexDocument(document, objectID)` / `indexDocuments(documents)` -- non-blocking document indexing (errors logged, not thrown)
- `updateDocument(objectID, updates)` -- partial document update
- `deleteDocument(objectID)` / `deleteDocuments(objectIDs)` -- document deletion
- `initializeIndex()` -- configures the Algolia index with settings (detailed in Task 17)

All methods return `Result<T, ExternalServiceError>` for consistent error handling.

---

## Context

SearchService is the central search abstraction in goodneighbor-core. It encapsulates all Algolia interactions behind a typed interface, ensuring:

1. **Permission safety**: Every search call automatically injects user visibility filters via `addUserPermissions(userId)`. There is no code path that bypasses this.
2. **Non-blocking indexing**: Document indexing failures are caught and logged, never propagated to the caller. This ensures API responses are not delayed by Algolia latency or failures.
3. **Default attributes**: Every search call merges a standard set of attributes to retrieve, ensuring consistent result shape.
4. **Result types**: All methods return `Result<T, ExternalServiceError>` instead of throwing, following the goodneighbor-core error handling pattern.

The service depends on an Algolia client (admin mode for indexing, search mode for queries) initialized in M2 (config/infrastructure). It also uses `AlgoliaFilters` from Task 15 to construct permission filters.

---

## Steps

### 1. Define the ISearchService interface

Create `src/services/search.service.ts`:

```typescript
// src/services/search.service.ts

import { Result } from '../types/result.types';
import { ExternalServiceError } from '../errors/app-errors';
import {
  AlgoliaSearchParams,
  SearchResponse,
} from '../types/search.types';

/**
 * Interface for the search service.
 * All methods return Result types for consistent error handling.
 */
export interface ISearchService {
  /** Execute a search query with automatic permission filtering. */
  search(
    params: AlgoliaSearchParams,
    userId?: string,
  ): Promise<Result<SearchResponse, ExternalServiceError>>;

  /** Index a single document. Non-blocking: errors are logged, not thrown. */
  indexDocument(
    document: Record<string, any>,
    objectID: string,
  ): Promise<Result<void, ExternalServiceError>>;

  /** Index multiple documents in a batch. Non-blocking. */
  indexDocuments(
    documents: Array<Record<string, any> & { objectID: string }>,
  ): Promise<Result<void, ExternalServiceError>>;

  /** Partially update a document by objectID. */
  updateDocument(
    objectID: string,
    updates: Record<string, any>,
  ): Promise<Result<void, ExternalServiceError>>;

  /** Delete a single document by objectID. */
  deleteDocument(
    objectID: string,
  ): Promise<Result<void, ExternalServiceError>>;

  /** Delete multiple documents by objectIDs. */
  deleteDocuments(
    objectIDs: string[],
  ): Promise<Result<void, ExternalServiceError>>;

  /** Initialize or update the Algolia index configuration. */
  initializeIndex(): Promise<Result<void, ExternalServiceError>>;
}
```

### 2. Define default attributes

```typescript
/**
 * Default attributes always retrieved in search results.
 * Merged with any caller-specified attributesToRetrieve.
 */
const DEFAULT_ATTRIBUTES_TO_RETRIEVE = [
  "id", "name", "objectID", "type", "subtype", "title",
  "search", "refs", "tags", "authorId", "author",
  "timestamps.createdAt", "timestamps.updatedAt",
  "stats.likers", "stats.comments", "stats.sharers",
  "stats.views", "stats.followers",
  "properties.displayName", "properties.mainContent",
  "properties.tags", "properties.mentions",
];
```

### 3. Implement SearchService class

```typescript
import { ok, err } from '../types/result.types';
import { AlgoliaFilters } from '../lib/algolia-filters';

export interface SearchServiceDependencies {
  /** Algolia search client (read-only queries) */
  searchClient: any; // Type from algoliasearch
  /** Algolia admin client (index management, write operations) */
  adminClient: any;  // Type from algoliasearch
  /** Algolia index name */
  indexName: string;
  /** Logger for non-blocking error reporting */
  logger?: {
    error(message: string, context?: Record<string, any>): void;
    warn(message: string, context?: Record<string, any>): void;
  };
}

export class SearchService implements ISearchService {
  private searchClient: any;
  private adminClient: any;
  private indexName: string;
  private logger: SearchServiceDependencies['logger'];

  constructor(deps: SearchServiceDependencies) {
    this.searchClient = deps.searchClient;
    this.adminClient = deps.adminClient;
    this.indexName = deps.indexName;
    this.logger = deps.logger;
  }

  // ... methods below
}
```

### 4. Implement search() with permission injection

```typescript
/**
 * Execute a search query with automatic permission filtering.
 *
 * Flow:
 * 1. Merge default attributes with caller-specified attributes
 * 2. Build permission filter using AlgoliaFilters
 * 3. Merge permission filter with any existing filters
 * 4. Execute Algolia search
 * 5. Return Result<SearchResponse, ExternalServiceError>
 *
 * @param params - Search parameters from the caller
 * @param userId - Firebase UID of the searching user (optional for public-only search)
 */
async search(
  params: AlgoliaSearchParams,
  userId?: string,
): Promise<Result<SearchResponse, ExternalServiceError>> {
  try {
    // Merge default attributes
    const attributesToRetrieve = [
      ...DEFAULT_ATTRIBUTES_TO_RETRIEVE,
      ...(params.attributesToRetrieve || []),
    ];
    // Deduplicate
    const uniqueAttributes = [...new Set(attributesToRetrieve)];

    // Build permission filter
    let filterBuilder: AlgoliaFilters;
    if (params.filters) {
      filterBuilder = AlgoliaFilters.fromString(params.filters);
    } else {
      filterBuilder = AlgoliaFilters.create();
    }

    // Inject user permissions (always)
    if (userId) {
      filterBuilder.addUserPermissions(userId);
    } else {
      // Unauthenticated: only show public content
      filterBuilder.addAnd('refs.hasViewer:"@public"');
    }

    const filters = filterBuilder.getFilter();

    // Build search params for Algolia
    const searchParams = {
      ...params,
      filters,
      attributesToRetrieve: uniqueAttributes,
    };

    const index = this.searchClient.initIndex(this.indexName);
    const response = await index.search(params.query, searchParams);

    return ok({
      hits: response.hits,
      nbHits: response.nbHits,
      page: response.page,
      nbPages: response.nbPages,
      hitsPerPage: response.hitsPerPage,
      processingTimeMS: response.processingTimeMS,
      facets: response.facets,
      query: response.query,
      params: response.params,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown search error';
    return err(new ExternalServiceError(`Algolia search failed: ${message}`));
  }
}
```

### 5. Implement indexDocument (non-blocking)

```typescript
/**
 * Index a single document in Algolia.
 *
 * Non-blocking: errors are caught, logged, and returned as Result.err.
 * The caller should NOT await this in the critical path.
 *
 * @param document - The document to index
 * @param objectID - Algolia objectID (typically the Firestore document ID)
 */
async indexDocument(
  document: Record<string, any>,
  objectID: string,
): Promise<Result<void, ExternalServiceError>> {
  try {
    const index = this.adminClient.initIndex(this.indexName);
    await index.saveObject({
      ...document,
      objectID,
    });
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown indexing error';
    this.logger?.error('Failed to index document', { objectID, error: message });
    return err(new ExternalServiceError(`Algolia indexDocument failed: ${message}`));
  }
}
```

### 6. Implement remaining CRUD methods

```typescript
async indexDocuments(
  documents: Array<Record<string, any> & { objectID: string }>,
): Promise<Result<void, ExternalServiceError>> {
  try {
    const index = this.adminClient.initIndex(this.indexName);
    await index.saveObjects(documents);
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown batch indexing error';
    this.logger?.error('Failed to batch index documents', {
      count: documents.length,
      error: message,
    });
    return err(new ExternalServiceError(`Algolia indexDocuments failed: ${message}`));
  }
}

async updateDocument(
  objectID: string,
  updates: Record<string, any>,
): Promise<Result<void, ExternalServiceError>> {
  try {
    const index = this.adminClient.initIndex(this.indexName);
    await index.partialUpdateObject({
      objectID,
      ...updates,
    });
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown update error';
    this.logger?.error('Failed to update document', { objectID, error: message });
    return err(new ExternalServiceError(`Algolia updateDocument failed: ${message}`));
  }
}

async deleteDocument(
  objectID: string,
): Promise<Result<void, ExternalServiceError>> {
  try {
    const index = this.adminClient.initIndex(this.indexName);
    await index.deleteObject(objectID);
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown deletion error';
    this.logger?.error('Failed to delete document', { objectID, error: message });
    return err(new ExternalServiceError(`Algolia deleteDocument failed: ${message}`));
  }
}

async deleteDocuments(
  objectIDs: string[],
): Promise<Result<void, ExternalServiceError>> {
  try {
    const index = this.adminClient.initIndex(this.indexName);
    await index.deleteObjects(objectIDs);
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown batch deletion error';
    this.logger?.error('Failed to batch delete documents', {
      count: objectIDs.length,
      error: message,
    });
    return err(new ExternalServiceError(`Algolia deleteDocuments failed: ${message}`));
  }
}
```

### 7. Implement initializeIndex (stub for Task 17)

```typescript
/**
 * Initialize the Algolia index with configured settings.
 * Full implementation in Task 17.
 */
async initializeIndex(): Promise<Result<void, ExternalServiceError>> {
  try {
    const index = this.adminClient.initIndex(this.indexName);
    // Settings defined in Task 17
    await index.setSettings({}); // TODO: Add indexSettings from Task 17
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown configuration error';
    return err(new ExternalServiceError(`Algolia initializeIndex failed: ${message}`));
  }
}
```

### 8. Write tests with mocked Algolia client

Create `src/services/search.service.spec.ts`:

```typescript
import { SearchService } from './search.service';

// Mock Algolia client
function createMockAlgoliaIndex() {
  return {
    search: jest.fn().mockResolvedValue({
      hits: [],
      nbHits: 0,
      page: 0,
      nbPages: 0,
      hitsPerPage: 20,
      processingTimeMS: 1,
      query: '',
      params: '',
    }),
    saveObject: jest.fn().mockResolvedValue({}),
    saveObjects: jest.fn().mockResolvedValue({}),
    partialUpdateObject: jest.fn().mockResolvedValue({}),
    deleteObject: jest.fn().mockResolvedValue({}),
    deleteObjects: jest.fn().mockResolvedValue({}),
    setSettings: jest.fn().mockResolvedValue({}),
  };
}

function createMockClient(mockIndex: any) {
  return {
    initIndex: jest.fn().mockReturnValue(mockIndex),
  };
}

describe('SearchService', () => {
  let mockIndex: any;
  let mockSearchClient: any;
  let mockAdminClient: any;
  let mockLogger: any;
  let service: SearchService;

  beforeEach(() => {
    mockIndex = createMockAlgoliaIndex();
    mockSearchClient = createMockClient(mockIndex);
    mockAdminClient = createMockClient(mockIndex);
    mockLogger = { error: jest.fn(), warn: jest.fn() };
    service = new SearchService({
      searchClient: mockSearchClient,
      adminClient: mockAdminClient,
      indexName: 'test_index',
      logger: mockLogger,
    });
  });

  describe('search', () => {
    it('should inject user permission filter', async () => {
      await service.search({ query: 'test' }, 'user123');

      const searchCall = mockIndex.search.mock.calls[0];
      const params = searchCall[1];
      expect(params.filters).toContain('refs.hasViewer:"@public"');
      expect(params.filters).toContain('refs.hasViewer:"@uid:user123"');
    });

    it('should restrict to public content when no userId', async () => {
      await service.search({ query: 'test' });

      const searchCall = mockIndex.search.mock.calls[0];
      const params = searchCall[1];
      expect(params.filters).toContain('refs.hasViewer:"@public"');
      expect(params.filters).not.toContain('@uid:');
    });

    it('should merge default attributes', async () => {
      await service.search({ query: 'test' }, 'user1');

      const searchCall = mockIndex.search.mock.calls[0];
      const params = searchCall[1];
      expect(params.attributesToRetrieve).toContain('id');
      expect(params.attributesToRetrieve).toContain('type');
      expect(params.attributesToRetrieve).toContain('properties.displayName');
    });

    it('should merge caller attributes with defaults', async () => {
      await service.search({
        query: 'test',
        attributesToRetrieve: ['custom.field'],
      }, 'user1');

      const searchCall = mockIndex.search.mock.calls[0];
      const params = searchCall[1];
      expect(params.attributesToRetrieve).toContain('custom.field');
      expect(params.attributesToRetrieve).toContain('id');
    });

    it('should preserve existing filters', async () => {
      await service.search({
        query: 'test',
        filters: 'type:post',
      }, 'user1');

      const searchCall = mockIndex.search.mock.calls[0];
      const params = searchCall[1];
      expect(params.filters).toContain('type:post');
      expect(params.filters).toContain('refs.hasViewer');
    });

    it('should return ok result on success', async () => {
      const result = await service.search({ query: 'test' }, 'user1');
      expect(result.ok).toBe(true);
    });

    it('should return err result on Algolia failure', async () => {
      mockIndex.search.mockRejectedValue(new Error('Network error'));
      const result = await service.search({ query: 'test' }, 'user1');
      expect(result.ok).toBe(false);
    });
  });

  describe('indexDocument', () => {
    it('should call saveObject with objectID', async () => {
      await service.indexDocument({ title: 'Test' }, 'doc-1');

      expect(mockIndex.saveObject).toHaveBeenCalledWith({
        title: 'Test',
        objectID: 'doc-1',
      });
    });

    it('should return ok on success', async () => {
      const result = await service.indexDocument({ title: 'Test' }, 'doc-1');
      expect(result.ok).toBe(true);
    });

    it('should catch errors and log them', async () => {
      mockIndex.saveObject.mockRejectedValue(new Error('Index error'));
      const result = await service.indexDocument({ title: 'Test' }, 'doc-1');

      expect(result.ok).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      mockIndex.saveObject.mockRejectedValue(new Error('Index error'));
      // Should not throw -- returns Result.err instead
      await expect(
        service.indexDocument({ title: 'Test' }, 'doc-1')
      ).resolves.toBeDefined();
    });
  });

  describe('deleteDocument', () => {
    it('should call deleteObject with objectID', async () => {
      await service.deleteDocument('doc-1');
      expect(mockIndex.deleteObject).toHaveBeenCalledWith('doc-1');
    });

    it('should return ok on success', async () => {
      const result = await service.deleteDocument('doc-1');
      expect(result.ok).toBe(true);
    });
  });

  describe('deleteDocuments', () => {
    it('should call deleteObjects with objectIDs', async () => {
      await service.deleteDocuments(['doc-1', 'doc-2']);
      expect(mockIndex.deleteObjects).toHaveBeenCalledWith(['doc-1', 'doc-2']);
    });
  });
});
```

---

## Verification

- [ ] `search()` always includes a permission filter in the Algolia query
- [ ] `search()` with `userId` produces `refs.hasViewer:"@public" OR refs.hasViewer:"@uid:{userId}"`
- [ ] `search()` without `userId` produces `refs.hasViewer:"@public"` only
- [ ] `search()` merges default attributes into `attributesToRetrieve`
- [ ] `search()` preserves existing filters from the caller (composes, not replaces)
- [ ] `search()` returns `Result.ok` with `SearchResponse` on success
- [ ] `search()` returns `Result.err` with `ExternalServiceError` on Algolia failure
- [ ] `indexDocument()` calls Algolia `saveObject` with the document and objectID
- [ ] `indexDocument()` catches errors and logs them via the logger
- [ ] `indexDocument()` never throws -- always returns a Result
- [ ] `indexDocuments()` calls Algolia `saveObjects` with the batch
- [ ] `updateDocument()` calls Algolia `partialUpdateObject`
- [ ] `deleteDocument()` calls Algolia `deleteObject`
- [ ] `deleteDocuments()` calls Algolia `deleteObjects`
- [ ] All methods return `Result<T, ExternalServiceError>`
- [ ] All tests pass with mocked Algolia client (`npm test`)
- [ ] File compiles without TypeScript errors (`npm run typecheck`)

---

## Expected Output

**File Structure**:
```
src/services/
├── search.service.ts        # ISearchService interface, SearchService implementation
└── search.service.spec.ts   # Tests with mocked Algolia client
```

**Key Exports**:
- `ISearchService` interface
- `SearchService` class
- `SearchServiceDependencies` interface
- `DEFAULT_ATTRIBUTES_TO_RETRIEVE` constant

---

## Common Issues and Solutions

### Issue 1: Algolia client type mismatch
**Symptom**: TypeScript errors on Algolia client methods
**Solution**: The Algolia client types depend on the version of `algoliasearch` installed. Use `any` for the client type in the dependency interface and cast internally if needed. The mock tests verify behavior regardless of the specific client type.

### Issue 2: Permission filter overwriting caller filters
**Symptom**: Caller-provided filters are lost when permission filters are added
**Solution**: Use `AlgoliaFilters.fromString(params.filters)` to start from the caller's filter, then `.addUserPermissions(userId)` to compose the permission filter on top.

### Issue 3: Non-blocking indexing pattern
**Symptom**: API routes wait for indexing to complete, adding latency
**Solution**: The caller of `indexDocument` should use fire-and-forget: `service.indexDocument(doc, id)` without `await` in the critical path. The service catches all errors internally, so an unhandled promise rejection is not possible.

### Issue 4: Result type import
**Symptom**: Cannot resolve ok/err constructors
**Solution**: Import `ok` and `err` from `../types/result.types`. These should be defined in Task 1 as factory functions for the Result discriminated union.

---

## Resources

- `agent/design/local.search-architecture.md`: SearchService interface, search execution flow, document indexing flow
- `agent/design/local.goodneighbor-core.md`: SearchService method signatures
- [Algolia JavaScript Client Documentation](https://www.algolia.com/doc/api-client/javascript/): API reference for search, saveObject, deleteObject, setSettings

---

## Notes

- The `initializeIndex()` method is implemented as a stub here and completed in Task 17 with the full index settings.
- The logger dependency is optional. If not provided, errors are still caught and returned as Result.err, but not logged.
- The search client and admin client are separate because Algolia provides different API keys for read-only search and admin operations. In production, the search API key is safe to expose to the client; the admin API key is server-only.
- The `DEFAULT_ATTRIBUTES_TO_RETRIEVE` constant should be exported so that callers can reference or extend it.

---

**Next Task**: [Task 17: Algolia Index Configuration](./task-17-index-configuration.md)
**Related Design Docs**: [Search Architecture](../../design/local.search-architecture.md)
**Estimated Completion Date**: TBD
