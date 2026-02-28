# Search Architecture

**Concept**: Algolia integration for full-text search with refs-based permission filtering and faceted queries
**Created**: 2026-02-28
**Status**: Design Specification

---

## Overview

goodneighbor uses Algolia as its search engine. All content entities from the unified `goodneighbor.search` Firestore collection are indexed into a single Algolia index. Search queries are permission-filtered at query time using the refs-based permission model — users only see content where their semantic ID appears in `refs.hasViewer`. This document specifies the exact Algolia configuration, filter builder, indexing flow, and search API to port into goodneighbor-core.

---

## Problem Statement

Search must:
1. Support full-text queries across posts, feeds, comments, and submissions
2. Enforce per-user visibility using the refs permission model
3. Support faceted filtering by entity type, tags, mentions, and ownership
4. Support geographic search (aroundLatLng)
5. Be non-blocking — Algolia indexing failures must not fail API requests

The current implementation is spread across `lib/algolia.ts`, `lib/search.ts`, `lib/algolia-filters.ts`, and individual API route handlers. goodneighbor-core must consolidate this into a single SearchService.

---

## Solution

A `SearchService` that wraps Algolia with:
- Two client modes: admin (index/update/delete) and search (read-only queries)
- An `AlgoliaFilters` builder class for constructing permission-safe filter strings
- Non-blocking indexing with error logging
- Exact replication of the current Algolia index settings

---

## Implementation

### Algolia Index Configuration

Index name: `goodneighbor_search` (configurable via `ALGOLIA_INDEX_NAME`)

```typescript
const indexSettings = {
  // Searchable attributes (ordered by importance)
  searchableAttributes: [
    "search",                    // Primary: AI-generated keyword text
    "properties.mainContent",    // Secondary: body content
    "properties.displayName",    // Tertiary: title/name
  ],

  // Facetable attributes for filtering
  attributesForFaceting: [
    "type",                      // post, feed, comment, feed_submission
    "name",
    "subtype",
    "parentId",                  // Comment threading
    "threadRootId",              // Comment threading
    "refs.hasViewer",            // PERMISSION FILTERING
    "refs.hasOwner",
    "refs.hasSubject",
    "refs.hasFollower",
    "refs.hasModerator",
    "refs.hasTag",
    "refs.hasMention",
    "refs.hasLiker",
    "isPublic",
  ],

  // Ranking
  customRanking: [
    "desc(createdAt)",
    "desc(metrics.views)",
    "desc(followerCount)",
  ],

  // Default attributes returned in results
  attributesToRetrieve: [
    "id", "name", "type", "subtype",
    "properties.content", "properties.displayName",
    "createdAt", "updatedAt",
    "stats", "isPublic", "_geoloc",
  ],

  // Highlighting
  attributesToHighlight: [
    "search", "name",
    "properties.mainContent",
    "properties.displayName",
  ],

  // Snippets
  attributesToSnippet: ["content:50", "search:30"],

  // Pagination
  hitsPerPage: 20,
  maxValuesPerFacet: 100,

  // Typo tolerance
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8,

  enableRules: true,
};
```

### AlgoliaFilters Builder

The filter builder enforces Algolia's constraint: only `(OR group) AND (OR group) AND condition` — never `(AND group) OR condition`.

```typescript
export class AlgoliaFilters {
  private orGroups: string[][] = [];
  private andConditions: string[] = [];

  // Core methods
  addOrGroup(conditions: string[]): this;
  addOr(condition: string): this;
  newOrGroup(): this;
  addAnd(condition: string): this;
  addAnds(conditions: string[]): this;
  getFilter(): string;
  isEmpty(): boolean;
  reset(): this;
  clone(): AlgoliaFilters;

  // Convenience methods
  addUserPermissions(userId: string): this;
  // Adds: refs.hasViewer:"@public" OR refs.hasViewer:"@uid:{userId}"

  addType(type: string): this;
  // Adds AND: type:{type}

  addOrType(type: string): this;
  // Adds OR: type:{type}

  addFeeds(feedIds: string[]): this;
  addTags(tags: string[]): this;

  // Static factories
  static create(): AlgoliaFilters;
  static fromString(filterString: string): AlgoliaFilters;
}

// Pre-built convenience filters
export const createFilter = () => AlgoliaFilters.create();
export const createPostFilter = () => AlgoliaFilters.create().addType("post");
export const createUserPostFilter = (userId: string) =>
  AlgoliaFilters.create().addType("post").addUserPermissions(userId);
// Produces: type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:{userId}")
```

### Search Execution Flow

```
SearchParams (from caller)
  → normalizeSemanticIds()        # Strip @/ prefixes from filters if present
  → merge default attributes      # Ensure standard fields always returned
  → addUserPermissions(userId)    # Inject refs.hasViewer filter
  → performSearch()               # Call Algolia API
  → SearchResponse                # Return hits, facets, metadata
```

Default attributes always retrieved:
```typescript
const defaultAttributes = [
  "id", "name", "objectID", "type", "subtype", "title",
  "search", "refs", "tags", "authorId", "author",
  "timestamps.createdAt", "timestamps.updatedAt",
  "stats.likers", "stats.comments", "stats.sharers",
  "stats.views", "stats.followers",
  "properties.displayName", "properties.mainContent",
  "properties.tags", "properties.mentions",
];
```

### Document Indexing Flow

```
Entity created in Firestore
  → Build Algolia document (entity + enrichment fields)
  → indexDocument({ document, objectID })
  → Non-blocking: catch and log errors, don't fail the request
```

Algolia document enrichment (beyond base entity):
```typescript
const algoliaDocument = {
  ...dbPost,
  objectID: docRef.id,
  category: processed.category,
  hashtags: processed.hashtags,
  mentions: processed.mentions,
  urls: processed.urls,
  authorDisplayName,
  authorUsername,
  authorAvatarUrl,
  media: media?.length ? media : undefined,
  isPublic,
};
```

### SearchService Interface

```typescript
export interface ISearchService {
  // Query
  search(params: AlgoliaSearchParams, userId?: string): Promise<Result<SearchResponse, ExternalServiceError>>;

  // Index management
  indexDocument(document: any, objectID: string): Promise<Result<void, ExternalServiceError>>;
  indexDocuments(documents: any[]): Promise<Result<void, ExternalServiceError>>;
  updateDocument(objectID: string, updates: any): Promise<Result<void, ExternalServiceError>>;
  deleteDocument(objectID: string): Promise<Result<void, ExternalServiceError>>;
  deleteDocuments(objectIDs: string[]): Promise<Result<void, ExternalServiceError>>;

  // Configuration
  initializeIndex(): Promise<Result<void, ExternalServiceError>>;
}
```

### AlgoliaSearchParams

```typescript
export interface AlgoliaSearchParams {
  query: string;
  filters?: string;
  facetFilters?: string[];
  numericFilters?: string[];
  hitsPerPage?: number;
  page?: number;
  attributesToRetrieve?: string[];
  attributesToHighlight?: string[];
  attributesToSnippet?: string[];
  aroundLatLng?: string;       // "lat,lng"
  aroundRadius?: number;
  facets?: string[];
}
```

### SearchResponse

```typescript
export interface SearchResponse {
  hits: SearchResultItem[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  facets?: Record<string, Record<string, number>>;
  query: string;
  params: string;
}

export interface SearchResultItem {
  objectID: string;
  type: SearchEntityType;
  [key: string]: any;
  _highlightResult?: Record<string, any>;
  _snippetResult?: Record<string, any>;
  _geoloc?: { lat: number; lng: number };
}
```

### User Search (Firestore-based)

User profile search doesn't go through Algolia — it queries Firestore directly with prefix matching:

```typescript
// Search by username prefix
profilesRef
  .where("username", ">=", query)
  .where("username", "<=", query + "\uf8ff")
  .limit(20)

// Search by displayName prefix
profilesRef
  .where("displayName", ">=", query)
  .where("displayName", "<=", query + "\uf8ff")
  .limit(20)

// Deduplicate results by userId
```

This belongs in ProfileService, not SearchService.

---

## Benefits

- **Permission-safe by default**: Every search call automatically injects user visibility filters
- **Single index**: All entity types in one index simplifies management
- **Non-blocking indexing**: API performance unaffected by Algolia latency
- **Rich filtering**: Faceted search on refs, type, tags, geographic location

---

## Trade-offs

- **Algolia vendor lock-in**: Filter syntax, facet configuration, and client API are Algolia-specific. Switching to Elasticsearch/Typesense would require rewriting SearchService internals.
- **Filter syntax constraint**: Only `(OR) AND (OR) AND ...` — no nested AND-within-OR groups. The AlgoliaFilters builder enforces this.
- **Index size**: All entities in one index means larger index. May need to split if index grows beyond Algolia plan limits.

---

## Dependencies

- `algoliasearch` npm package — Client for both admin and search operations
- Algolia cloud service — Index hosting, query processing

---

## Testing Strategy

- **Unit tests**: AlgoliaFilters builder produces correct filter strings for all combinations
- **Unit tests**: `addUserPermissions()` correctly builds `refs.hasViewer` OR group
- **Unit tests**: SearchService merges default attributes correctly
- **Integration tests**: Index a document, search for it, verify it's returned with correct permissions
- **Integration tests**: Verify non-public content is not returned for unauthenticated queries

---

## Migration Path

1. Port AlgoliaFilters builder class and convenience factories
2. Port Algolia client initialization (admin + search modes)
3. Port indexing functions (index, update, delete, batch)
4. Port search execution with permission injection
5. Port initializeAlgoliaIndex configuration
6. Wire into SearchService with Result return types

---

**Status**: Design Specification
**Recommendation**: Port AlgoliaFilters first (pure logic, easy to test), then client/indexing, then search execution
**Related Documents**:
- `agent/design/local.content-entity-model.md` — Refs permission model that drives search filtering
- `agent/design/local.goodneighbor-core.md` — Overall architecture
