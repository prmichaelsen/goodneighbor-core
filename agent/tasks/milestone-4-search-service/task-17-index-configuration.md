# Task 17: Algolia Index Configuration

**Milestone**: [M4 - Search Service](../../milestones/milestone-4-search-service.md)
**Estimated Time**: 2 hours
**Dependencies**: Task 16 (SearchService -- initializeIndex method to complete)
**Status**: Not Started

---

## Objective

Implement the `initializeIndex()` method on `SearchService` that configures the Algolia index with the exact settings specified in the search-architecture design doc. This includes searchable attributes, attributes for faceting (including all `refs.*` fields for permission filtering), custom ranking, attributes to retrieve and highlight, snippet configuration, pagination defaults, and typo tolerance settings.

---

## Context

The Algolia index settings define how content is searched, ranked, and filtered. These settings must match the production configuration exactly, because:

1. **Searchable attributes** determine which fields are full-text indexed and their priority order.
2. **Attributes for faceting** determine which fields can be used in filter expressions. All `refs.*` fields must be facetable for the permission model to work.
3. **Custom ranking** determines how results are sorted beyond Algolia's default relevance ranking.
4. **Typo tolerance** and other settings affect search quality.

If these settings are incorrect, search results will be wrong (missing results, wrong ordering) or permission filtering will silently fail (refs fields not facetable means permission filters are ignored).

The settings are defined as a constant and applied via Algolia's `setSettings()` API. The `initializeIndex()` method is idempotent -- it can be called multiple times safely.

---

## Steps

### 1. Define the index settings constant

Add to `src/services/search.service.ts` (or create a separate `src/lib/algolia-index-settings.ts` if preferred for testability):

```typescript
/**
 * Algolia index configuration for the goodneighbor_search index.
 *
 * These settings MUST match the production configuration exactly.
 * Changes to these settings affect search results, ranking, and
 * permission filtering for all users.
 *
 * See: agent/design/local.search-architecture.md for the specification.
 */
export const ALGOLIA_INDEX_SETTINGS = {
  // Searchable attributes (ordered by importance for ranking)
  // 1. "search" is the primary field: AI-generated keyword text
  // 2. "properties.mainContent" is the body content
  // 3. "properties.displayName" is the title/name
  searchableAttributes: [
    "search",
    "properties.mainContent",
    "properties.displayName",
  ],

  // Facetable attributes for filtering
  // All refs.* fields must be facetable for the permission model to work.
  // type, subtype, and isPublic enable entity-type and visibility filtering.
  // parentId and threadRootId enable comment threading queries.
  attributesForFaceting: [
    "type",
    "name",
    "subtype",
    "parentId",
    "threadRootId",
    "refs.hasViewer",
    "refs.hasOwner",
    "refs.hasSubject",
    "refs.hasFollower",
    "refs.hasModerator",
    "refs.hasTag",
    "refs.hasMention",
    "refs.hasLiker",
    "isPublic",
  ],

  // Custom ranking (applied after Algolia's default relevance ranking)
  // Newest content first, then by views, then by followers
  customRanking: [
    "desc(createdAt)",
    "desc(metrics.views)",
    "desc(followerCount)",
  ],

  // Default attributes returned in search results
  attributesToRetrieve: [
    "id", "name", "type", "subtype",
    "properties.content", "properties.displayName",
    "createdAt", "updatedAt",
    "stats", "isPublic", "_geoloc",
  ],

  // Attributes to highlight in results (match highlighting)
  attributesToHighlight: [
    "search", "name",
    "properties.mainContent",
    "properties.displayName",
  ],

  // Attributes to snippet (truncated match context)
  attributesToSnippet: [
    "content:50",
    "search:30",
  ],

  // Pagination defaults
  hitsPerPage: 20,
  maxValuesPerFacet: 100,

  // Typo tolerance configuration
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8,

  // Enable Algolia Rules (query-time rules engine)
  enableRules: true,
} as const;
```

### 2. Complete the initializeIndex method

Update the `initializeIndex()` method in `SearchService`:

```typescript
/**
 * Initialize the Algolia index with configured settings.
 *
 * This method is idempotent -- calling it multiple times applies the
 * same settings without side effects.
 *
 * Settings include:
 * - Searchable attributes (search, mainContent, displayName)
 * - Facetable attributes (all refs.* for permission filtering)
 * - Custom ranking (recency, views, followers)
 * - Highlighting, snippets, pagination, typo tolerance
 */
async initializeIndex(): Promise<Result<void, ExternalServiceError>> {
  try {
    const index = this.adminClient.initIndex(this.indexName);
    await index.setSettings(ALGOLIA_INDEX_SETTINGS);
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown configuration error';
    this.logger?.error('Failed to initialize Algolia index', {
      indexName: this.indexName,
      error: message,
    });
    return err(new ExternalServiceError(`Algolia initializeIndex failed: ${message}`));
  }
}
```

### 3. Write tests verifying settings

Add to `src/services/search.service.spec.ts`:

```typescript
describe('initializeIndex', () => {
  it('should call setSettings with the index configuration', async () => {
    await service.initializeIndex();

    expect(mockIndex.setSettings).toHaveBeenCalledTimes(1);
    const settings = mockIndex.setSettings.mock.calls[0][0];

    // Verify searchable attributes
    expect(settings.searchableAttributes).toEqual([
      'search',
      'properties.mainContent',
      'properties.displayName',
    ]);
  });

  it('should include all refs.* facets for permission filtering', async () => {
    await service.initializeIndex();

    const settings = mockIndex.setSettings.mock.calls[0][0];
    const facets = settings.attributesForFaceting;

    expect(facets).toContain('refs.hasViewer');
    expect(facets).toContain('refs.hasOwner');
    expect(facets).toContain('refs.hasSubject');
    expect(facets).toContain('refs.hasFollower');
    expect(facets).toContain('refs.hasModerator');
    expect(facets).toContain('refs.hasTag');
    expect(facets).toContain('refs.hasMention');
    expect(facets).toContain('refs.hasLiker');
  });

  it('should include type and isPublic in facets', async () => {
    await service.initializeIndex();

    const settings = mockIndex.setSettings.mock.calls[0][0];
    const facets = settings.attributesForFaceting;

    expect(facets).toContain('type');
    expect(facets).toContain('isPublic');
  });

  it('should include comment threading facets', async () => {
    await service.initializeIndex();

    const settings = mockIndex.setSettings.mock.calls[0][0];
    const facets = settings.attributesForFaceting;

    expect(facets).toContain('parentId');
    expect(facets).toContain('threadRootId');
  });

  it('should set custom ranking with recency first', async () => {
    await service.initializeIndex();

    const settings = mockIndex.setSettings.mock.calls[0][0];
    expect(settings.customRanking[0]).toBe('desc(createdAt)');
  });

  it('should configure typo tolerance', async () => {
    await service.initializeIndex();

    const settings = mockIndex.setSettings.mock.calls[0][0];
    expect(settings.typoTolerance).toBe(true);
    expect(settings.minWordSizefor1Typo).toBe(4);
    expect(settings.minWordSizefor2Typos).toBe(8);
  });

  it('should set pagination defaults', async () => {
    await service.initializeIndex();

    const settings = mockIndex.setSettings.mock.calls[0][0];
    expect(settings.hitsPerPage).toBe(20);
    expect(settings.maxValuesPerFacet).toBe(100);
  });

  it('should configure highlighting', async () => {
    await service.initializeIndex();

    const settings = mockIndex.setSettings.mock.calls[0][0];
    expect(settings.attributesToHighlight).toContain('search');
    expect(settings.attributesToHighlight).toContain('properties.mainContent');
    expect(settings.attributesToHighlight).toContain('properties.displayName');
  });

  it('should configure snippets', async () => {
    await service.initializeIndex();

    const settings = mockIndex.setSettings.mock.calls[0][0];
    expect(settings.attributesToSnippet).toContain('content:50');
    expect(settings.attributesToSnippet).toContain('search:30');
  });

  it('should return ok on success', async () => {
    const result = await service.initializeIndex();
    expect(result.ok).toBe(true);
  });

  it('should return err on Algolia failure', async () => {
    mockIndex.setSettings.mockRejectedValue(new Error('Config error'));
    const result = await service.initializeIndex();
    expect(result.ok).toBe(false);
  });

  it('should log error on failure', async () => {
    mockIndex.setSettings.mockRejectedValue(new Error('Config error'));
    await service.initializeIndex();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

### 4. Write a settings completeness test

```typescript
describe('ALGOLIA_INDEX_SETTINGS', () => {
  it('should have all required top-level settings keys', () => {
    const requiredKeys = [
      'searchableAttributes',
      'attributesForFaceting',
      'customRanking',
      'attributesToRetrieve',
      'attributesToHighlight',
      'attributesToSnippet',
      'hitsPerPage',
      'maxValuesPerFacet',
      'typoTolerance',
      'minWordSizefor1Typo',
      'minWordSizefor2Typos',
      'enableRules',
    ];

    for (const key of requiredKeys) {
      expect(ALGOLIA_INDEX_SETTINGS).toHaveProperty(key);
    }
  });

  it('should have exactly 3 searchable attributes', () => {
    expect(ALGOLIA_INDEX_SETTINGS.searchableAttributes).toHaveLength(3);
  });

  it('should have searchable attributes in priority order', () => {
    const attrs = ALGOLIA_INDEX_SETTINGS.searchableAttributes;
    expect(attrs[0]).toBe('search');          // Primary
    expect(attrs[1]).toBe('properties.mainContent');  // Secondary
    expect(attrs[2]).toBe('properties.displayName');  // Tertiary
  });

  it('should have at least 14 facetable attributes', () => {
    expect(ALGOLIA_INDEX_SETTINGS.attributesForFaceting.length).toBeGreaterThanOrEqual(14);
  });
});
```

---

## Verification

- [ ] `ALGOLIA_INDEX_SETTINGS` contains all settings from the search-architecture design doc
- [ ] `searchableAttributes` is `["search", "properties.mainContent", "properties.displayName"]` in that order
- [ ] `attributesForFaceting` includes all `refs.*` fields: hasViewer, hasOwner, hasSubject, hasFollower, hasModerator, hasTag, hasMention, hasLiker
- [ ] `attributesForFaceting` includes `type`, `name`, `subtype`, `parentId`, `threadRootId`, `isPublic`
- [ ] `customRanking` starts with `desc(createdAt)`
- [ ] `attributesToRetrieve` includes id, name, type, subtype, stats, isPublic, _geoloc
- [ ] `attributesToHighlight` includes search, name, properties.mainContent, properties.displayName
- [ ] `attributesToSnippet` includes `content:50` and `search:30`
- [ ] `hitsPerPage` is 20
- [ ] `maxValuesPerFacet` is 100
- [ ] `typoTolerance` is true
- [ ] `minWordSizefor1Typo` is 4
- [ ] `minWordSizefor2Typos` is 8
- [ ] `enableRules` is true
- [ ] `initializeIndex()` calls `setSettings()` with the complete settings constant
- [ ] `initializeIndex()` returns `Result.ok` on success
- [ ] `initializeIndex()` returns `Result.err` on failure and logs the error
- [ ] All tests pass (`npm test`)
- [ ] File compiles without TypeScript errors (`npm run typecheck`)

---

## Expected Output

**File Structure**:
```
src/services/
├── search.service.ts        # Updated with ALGOLIA_INDEX_SETTINGS and completed initializeIndex()
└── search.service.spec.ts   # Extended with index configuration tests
```

Or if separated:
```
src/
├── lib/
│   └── algolia-index-settings.ts    # ALGOLIA_INDEX_SETTINGS constant
└── services/
    ├── search.service.ts            # initializeIndex() imports and uses the settings
    └── search.service.spec.ts       # Tests verify settings are complete and correct
```

**Key Exports**:
- `ALGOLIA_INDEX_SETTINGS` constant (frozen/readonly)

---

## Common Issues and Solutions

### Issue 1: Missing refs facets break permission filtering
**Symptom**: Search returns results the user should not see, or returns no results when they should see content
**Solution**: Ensure all `refs.*` fields used in AlgoliaFilters are listed in `attributesForFaceting`. The critical one is `refs.hasViewer` -- if it is not facetable, the permission filter `refs.hasViewer:"@public"` will not work.

### Issue 2: Searchable attribute order affects ranking
**Symptom**: Search results are ranked unexpectedly (titles ranking above content matches)
**Solution**: The order of `searchableAttributes` defines priority. `search` (AI-generated keywords) is first because it contains the most relevant indexing text. `properties.mainContent` is second (body content), and `properties.displayName` is third (title). This order should match the existing goodneighbor production index.

### Issue 3: Settings not applied (idempotency)
**Symptom**: Index settings revert or do not take effect
**Solution**: Algolia's `setSettings()` is a replacement operation -- it overwrites all settings. Calling it multiple times with the same constant is safe. However, if another process modifies settings between calls, they will be overwritten. Use `initializeIndex()` only during deployment or bootstrap, not on every request.

### Issue 4: `as const` type narrowing
**Symptom**: TypeScript complains about readonly arrays passed to setSettings
**Solution**: The `as const` assertion makes the settings deeply readonly. If Algolia's setSettings expects mutable arrays, you may need to spread the arrays or use a type assertion when passing to setSettings: `await index.setSettings({ ...ALGOLIA_INDEX_SETTINGS })`.

---

## Resources

- `agent/design/local.search-architecture.md`: Algolia Index Configuration section -- the authoritative source for all settings values
- [Algolia Index Settings API](https://www.algolia.com/doc/api-reference/settings-api-parameters/): Full reference for all configurable settings

---

## Notes

- The settings constant uses `as const` for literal type inference. This ensures TypeScript catches any accidental modifications and provides autocomplete for the exact values.
- The `refs.hasSubject` facet appears in the design doc settings but is not in the refs hierarchy interfaces. It may be a legacy field or used by a specific entity subtype. Include it in the facets to match production.
- `attributesToRetrieve` in the index settings is a default for all queries. The `DEFAULT_ATTRIBUTES_TO_RETRIEVE` in SearchService (Task 16) overrides this per-query. Both should be maintained -- the index default handles direct Algolia Dashboard queries, while the per-query default handles SearchService queries.
- This task completes the SearchService implementation started in Task 16. After this task, the full M4 milestone is complete.

---

**Next Task**: None (final task in M4)
**Related Design Docs**: [Search Architecture](../../design/local.search-architecture.md)
**Estimated Completion Date**: TBD
