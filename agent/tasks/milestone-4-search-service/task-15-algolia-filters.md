# Task 15: AlgoliaFilters Builder Class

**Milestone**: [M4 - Search Service](../../milestones/milestone-4-search-service.md)
**Estimated Time**: 4 hours
**Dependencies**: Task 1 (common types)
**Status**: Not Started

---

## Objective

Implement the `AlgoliaFilters` builder class that constructs Algolia filter strings for search queries. The class enforces Algolia's structural constraint: only `(OR group) AND (OR group) AND condition` patterns are allowed -- never AND-within-OR. The class provides a fluent API for building filters programmatically and includes convenience methods for common permission patterns like `addUserPermissions(userId)` which produces `refs.hasViewer:"@public" OR refs.hasViewer:"@uid:{userId}"`.

---

## Context

Algolia's filtering syntax supports a specific pattern: individual conditions can be combined with OR within parenthesized groups, and these groups can be combined with AND. However, you cannot have AND conditions nested within an OR group. For example:

Valid:   `(type:post) AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:abc123")`
Invalid: `type:post AND refs.hasViewer:"@public" OR type:feed AND refs.hasViewer:"@uid:abc123"`

The `AlgoliaFilters` class abstracts this constraint, ensuring all constructed filter strings are valid. It is the foundation for SearchService (Task 16), which uses it to inject permission filters into every search query.

In goodneighbor, the most common filter pattern is:
```
type:{entityType} AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:{userId}")
```

This ensures users only see content they have permission to view. The `@uid:{firebaseUid}` format is used for user-specific visibility, and `@public` is the system token for publicly visible content.

---

## Steps

### 1. Create the algolia-filters module

Create `src/lib/algolia-filters.ts`:

```typescript
// src/lib/algolia-filters.ts

/**
 * AlgoliaFilters - Fluent builder for constructing Algolia filter strings.
 *
 * Enforces Algolia's constraint: only (OR group) AND (OR group) AND condition.
 * Never produces AND-within-OR patterns.
 *
 * Usage:
 *   AlgoliaFilters.create()
 *     .addType("post")
 *     .addUserPermissions("abc123")
 *     .getFilter()
 *   // => 'type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:abc123")'
 */
export class AlgoliaFilters {
  private orGroups: string[][] = [];
  private currentOrGroup: string[] = [];
  private andConditions: string[] = [];

  // ... implementation
}
```

### 2. Implement core state management methods

```typescript
/**
 * Start a new OR group. Flushes the current OR group (if non-empty)
 * and begins a new one.
 */
newOrGroup(): this {
  this.flushCurrentOrGroup();
  return this;
}

/**
 * Add a condition to the current OR group.
 * Multiple addOr() calls build conditions joined by OR.
 */
addOr(condition: string): this {
  this.currentOrGroup.push(condition);
  return this;
}

/**
 * Add a complete OR group as an array of conditions.
 * This flushes any current OR group first.
 */
addOrGroup(conditions: string[]): this {
  this.flushCurrentOrGroup();
  if (conditions.length > 0) {
    this.orGroups.push([...conditions]);
  }
  return this;
}

/**
 * Add a standalone AND condition.
 * AND conditions are not grouped with OR.
 */
addAnd(condition: string): this {
  this.flushCurrentOrGroup();
  this.andConditions.push(condition);
  return this;
}

/**
 * Add multiple standalone AND conditions.
 */
addAnds(conditions: string[]): this {
  this.flushCurrentOrGroup();
  this.andConditions.push(...conditions);
  return this;
}

/**
 * Internal: flush the current OR group into the orGroups list.
 */
private flushCurrentOrGroup(): void {
  if (this.currentOrGroup.length > 0) {
    this.orGroups.push([...this.currentOrGroup]);
    this.currentOrGroup = [];
  }
}
```

### 3. Implement getFilter()

```typescript
/**
 * Build the final Algolia filter string.
 *
 * Produces: (OR group 1) AND (OR group 2) AND condition1 AND condition2
 * Single-condition OR groups omit the parentheses.
 *
 * @returns Valid Algolia filter string, or empty string if no conditions
 */
getFilter(): string {
  this.flushCurrentOrGroup();

  const parts: string[] = [];

  // Add OR groups
  for (const group of this.orGroups) {
    if (group.length === 1) {
      parts.push(group[0]);
    } else if (group.length > 1) {
      parts.push(`(${group.join(' OR ')})`);
    }
  }

  // Add AND conditions
  for (const condition of this.andConditions) {
    parts.push(condition);
  }

  return parts.join(' AND ');
}

/**
 * Check if the filter has any conditions.
 */
isEmpty(): boolean {
  return this.orGroups.length === 0
    && this.currentOrGroup.length === 0
    && this.andConditions.length === 0;
}

/**
 * Reset all filter state.
 */
reset(): this {
  this.orGroups = [];
  this.currentOrGroup = [];
  this.andConditions = [];
  return this;
}

/**
 * Create an independent copy of this filter builder.
 */
clone(): AlgoliaFilters {
  const copy = new AlgoliaFilters();
  copy.orGroups = this.orGroups.map(g => [...g]);
  copy.currentOrGroup = [...this.currentOrGroup];
  copy.andConditions = [...this.andConditions];
  return copy;
}
```

### 4. Implement convenience methods

```typescript
/**
 * Add user permission filter.
 * Creates an OR group: refs.hasViewer:"@public" OR refs.hasViewer:"@uid:{userId}"
 * This ensures the user sees public content and content explicitly shared with them.
 *
 * @param userId - Firebase UID (without @uid: prefix)
 */
addUserPermissions(userId: string): this {
  this.addOrGroup([
    `refs.hasViewer:"@public"`,
    `refs.hasViewer:"@uid:${userId}"`,
  ]);
  return this;
}

/**
 * Add an entity type filter as an AND condition.
 * Produces: type:{type}
 */
addType(type: string): this {
  this.addAnd(`type:${type}`);
  return this;
}

/**
 * Add an entity type to the current OR group.
 * Use when filtering for multiple types: type:post OR type:feed
 */
addOrType(type: string): this {
  this.addOr(`type:${type}`);
  return this;
}

/**
 * Add feed ID filters as an OR group.
 * Produces: (feedId:id1 OR feedId:id2 OR ...)
 */
addFeeds(feedIds: string[]): this {
  if (feedIds.length > 0) {
    this.addOrGroup(feedIds.map(id => `feedId:${id}`));
  }
  return this;
}

/**
 * Add tag filters as an OR group.
 * Produces: (refs.hasTag:tag1 OR refs.hasTag:tag2 OR ...)
 */
addTags(tags: string[]): this {
  if (tags.length > 0) {
    this.addOrGroup(tags.map(tag => `refs.hasTag:"${tag}"`));
  }
  return this;
}
```

### 5. Implement static factories

```typescript
/**
 * Create a new empty AlgoliaFilters instance.
 */
static create(): AlgoliaFilters {
  return new AlgoliaFilters();
}

/**
 * Create an AlgoliaFilters instance initialized with an existing filter string.
 * The string is added as a single AND condition.
 *
 * Note: This does NOT parse the filter string into its component parts.
 * It wraps it as a raw AND condition for composition with additional filters.
 */
static fromString(filterString: string): AlgoliaFilters {
  const instance = new AlgoliaFilters();
  if (filterString && filterString.trim().length > 0) {
    instance.addAnd(filterString.trim());
  }
  return instance;
}
```

### 6. Implement pre-built convenience filters

Add these as module-level exports below the class:

```typescript
/**
 * Create a new empty filter builder.
 */
export const createFilter = () => AlgoliaFilters.create();

/**
 * Create a filter builder pre-configured for post queries.
 * Produces: type:post
 */
export const createPostFilter = () => AlgoliaFilters.create().addType("post");

/**
 * Create a filter builder for user-specific post queries.
 * Produces: type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:{userId}")
 */
export const createUserPostFilter = (userId: string) =>
  AlgoliaFilters.create().addType("post").addUserPermissions(userId);
```

### 7. Write comprehensive tests

Create `src/lib/algolia-filters.spec.ts`:

```typescript
import { AlgoliaFilters, createFilter, createPostFilter, createUserPostFilter } from './algolia-filters';

describe('AlgoliaFilters', () => {
  describe('empty state', () => {
    it('should return empty string for new instance', () => {
      expect(AlgoliaFilters.create().getFilter()).toBe('');
    });

    it('should report isEmpty as true for new instance', () => {
      expect(AlgoliaFilters.create().isEmpty()).toBe(true);
    });
  });

  describe('addAnd', () => {
    it('should produce a single AND condition', () => {
      const filter = AlgoliaFilters.create().addAnd('type:post').getFilter();
      expect(filter).toBe('type:post');
    });

    it('should join multiple AND conditions', () => {
      const filter = AlgoliaFilters.create()
        .addAnd('type:post')
        .addAnd('isPublic:true')
        .getFilter();
      expect(filter).toBe('type:post AND isPublic:true');
    });
  });

  describe('addOrGroup', () => {
    it('should produce an OR group in parentheses', () => {
      const filter = AlgoliaFilters.create()
        .addOrGroup(['type:post', 'type:feed'])
        .getFilter();
      expect(filter).toBe('(type:post OR type:feed)');
    });

    it('should not add parentheses for single-condition group', () => {
      const filter = AlgoliaFilters.create()
        .addOrGroup(['type:post'])
        .getFilter();
      expect(filter).toBe('type:post');
    });
  });

  describe('addOr and newOrGroup', () => {
    it('should build OR conditions incrementally', () => {
      const filter = AlgoliaFilters.create()
        .addOr('type:post')
        .addOr('type:feed')
        .getFilter();
      expect(filter).toBe('(type:post OR type:feed)');
    });

    it('should separate OR groups with AND', () => {
      const filter = AlgoliaFilters.create()
        .addOr('type:post')
        .addOr('type:feed')
        .newOrGroup()
        .addOr('refs.hasViewer:"@public"')
        .addOr('refs.hasViewer:"@uid:abc123"')
        .getFilter();
      expect(filter).toBe(
        '(type:post OR type:feed) AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:abc123")'
      );
    });
  });

  describe('addUserPermissions', () => {
    it('should add refs.hasViewer OR group with @public and @uid: format', () => {
      const filter = AlgoliaFilters.create()
        .addUserPermissions('abc123')
        .getFilter();
      expect(filter).toBe(
        '(refs.hasViewer:"@public" OR refs.hasViewer:"@uid:abc123")'
      );
    });
  });

  describe('addType', () => {
    it('should add type as AND condition', () => {
      const filter = AlgoliaFilters.create()
        .addType('post')
        .getFilter();
      expect(filter).toBe('type:post');
    });
  });

  describe('addOrType', () => {
    it('should add type to current OR group', () => {
      const filter = AlgoliaFilters.create()
        .addOrType('post')
        .addOrType('feed')
        .getFilter();
      expect(filter).toBe('(type:post OR type:feed)');
    });
  });

  describe('addFeeds', () => {
    it('should add feed IDs as OR group', () => {
      const filter = AlgoliaFilters.create()
        .addFeeds(['feed-1', 'feed-2'])
        .getFilter();
      expect(filter).toBe('(feedId:feed-1 OR feedId:feed-2)');
    });

    it('should not add anything for empty feed array', () => {
      const filter = AlgoliaFilters.create()
        .addFeeds([])
        .getFilter();
      expect(filter).toBe('');
    });
  });

  describe('addTags', () => {
    it('should add tags as OR group with refs.hasTag', () => {
      const filter = AlgoliaFilters.create()
        .addTags(['safety', 'alert'])
        .getFilter();
      expect(filter).toBe('(refs.hasTag:"safety" OR refs.hasTag:"alert")');
    });

    it('should not add anything for empty tags array', () => {
      const filter = AlgoliaFilters.create()
        .addTags([])
        .getFilter();
      expect(filter).toBe('');
    });
  });

  describe('complex filter combinations', () => {
    it('should build type + user permissions filter', () => {
      const filter = AlgoliaFilters.create()
        .addType('post')
        .addUserPermissions('user123')
        .getFilter();
      expect(filter).toBe(
        'type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:user123")'
      );
    });

    it('should build multi-type + permissions + tags filter', () => {
      const filter = AlgoliaFilters.create()
        .addOrType('post')
        .addOrType('feed')
        .newOrGroup()
        .addUserPermissions('user123')
        .addTags(['safety'])
        .getFilter();
      // (type:post OR type:feed) AND (refs.hasViewer:... OR ...) AND refs.hasTag:"safety"
      expect(filter).toContain('(type:post OR type:feed)');
      expect(filter).toContain('refs.hasViewer:"@public"');
      expect(filter).toContain('refs.hasTag:"safety"');
    });
  });

  describe('static factories', () => {
    it('create() should return empty instance', () => {
      const filters = AlgoliaFilters.create();
      expect(filters.isEmpty()).toBe(true);
    });

    it('fromString() should wrap existing filter as AND condition', () => {
      const filters = AlgoliaFilters.fromString('type:post');
      expect(filters.getFilter()).toBe('type:post');
      expect(filters.isEmpty()).toBe(false);
    });

    it('fromString() with additional conditions', () => {
      const filters = AlgoliaFilters.fromString('type:post')
        .addUserPermissions('user123');
      expect(filters.getFilter()).toBe(
        'type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:user123")'
      );
    });

    it('fromString() with empty string returns empty instance', () => {
      const filters = AlgoliaFilters.fromString('');
      expect(filters.isEmpty()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      const filters = AlgoliaFilters.create()
        .addType('post')
        .addUserPermissions('user1');
      expect(filters.isEmpty()).toBe(false);
      filters.reset();
      expect(filters.isEmpty()).toBe(true);
      expect(filters.getFilter()).toBe('');
    });
  });

  describe('clone', () => {
    it('should produce an independent copy', () => {
      const original = AlgoliaFilters.create().addType('post');
      const copy = original.clone();

      copy.addUserPermissions('user1');

      expect(original.getFilter()).toBe('type:post');
      expect(copy.getFilter()).toContain('refs.hasViewer');
    });
  });

  describe('convenience factories', () => {
    it('createFilter() should return empty builder', () => {
      expect(createFilter().isEmpty()).toBe(true);
    });

    it('createPostFilter() should return type:post', () => {
      expect(createPostFilter().getFilter()).toBe('type:post');
    });

    it('createUserPostFilter() should return type + permissions', () => {
      const filter = createUserPostFilter('user1').getFilter();
      expect(filter).toBe(
        'type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:user1")'
      );
    });
  });
});
```

---

## Verification

- [ ] `AlgoliaFilters.create().getFilter()` returns `""`
- [ ] `AlgoliaFilters.create().isEmpty()` returns `true`
- [ ] `AlgoliaFilters.create().addAnd('type:post').getFilter()` returns `"type:post"`
- [ ] `addOrGroup(['type:post', 'type:feed']).getFilter()` returns `"(type:post OR type:feed)"`
- [ ] Single-condition OR group omits parentheses
- [ ] Multiple OR groups are joined by AND
- [ ] `addUserPermissions('abc123')` produces `(refs.hasViewer:"@public" OR refs.hasViewer:"@uid:abc123")`
- [ ] `addType('post')` produces `type:post` as an AND condition
- [ ] `addOrType` adds types to the current OR group
- [ ] `addFeeds(['f1','f2'])` produces `(feedId:f1 OR feedId:f2)`
- [ ] `addTags(['t1','t2'])` produces `(refs.hasTag:"t1" OR refs.hasTag:"t2")`
- [ ] Empty arrays passed to `addFeeds` and `addTags` produce no filter additions
- [ ] Complex filter: `type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:user1")`
- [ ] `fromString('type:post')` wraps as AND condition and composes with additional methods
- [ ] `fromString('')` produces empty instance
- [ ] `reset()` clears all state
- [ ] `clone()` produces independent copy that does not affect the original
- [ ] `createFilter()`, `createPostFilter()`, `createUserPostFilter()` produce correct defaults
- [ ] All tests pass (`npm test`)
- [ ] File compiles without TypeScript errors (`npm run typecheck`)

---

## Expected Output

**File Structure**:
```
src/lib/
├── algolia-filters.ts       # AlgoliaFilters class and convenience factories
└── algolia-filters.spec.ts  # Comprehensive tests
```

**Key Exports**:
- `AlgoliaFilters` class
- `createFilter()` factory
- `createPostFilter()` factory
- `createUserPostFilter(userId: string)` factory

---

## Common Issues and Solutions

### Issue 1: Unflushed OR group
**Symptom**: Conditions added via `addOr()` are not included in `getFilter()` output
**Solution**: `getFilter()` must call `flushCurrentOrGroup()` before building the output string, to capture any pending OR conditions not yet flushed.

### Issue 2: Parentheses on single-condition OR groups
**Symptom**: `type:post` is wrapped in unnecessary parentheses: `(type:post)`
**Solution**: When an OR group has exactly one condition, emit it without parentheses. Parentheses are only needed for multi-condition groups.

### Issue 3: AND/OR precedence confusion
**Symptom**: Filter produces unexpected results in Algolia
**Solution**: Always parenthesize OR groups. Algolia evaluates AND before OR without parentheses, which can change the meaning. By always grouping OR conditions in parentheses, the intended precedence is explicit.

### Issue 4: Missing quotes around string values
**Symptom**: Algolia rejects filters with special characters (e.g., `@uid:abc123` without quotes)
**Solution**: Convenience methods like `addUserPermissions` and `addTags` wrap values in double quotes: `refs.hasViewer:"@uid:abc123"`. The `@` and `:` characters in semantic IDs require quoting.

---

## Resources

- [Algolia Filter Syntax Documentation](https://www.algolia.com/doc/api-reference/api-parameters/filters/): Official filter syntax reference
- `agent/design/local.search-architecture.md`: AlgoliaFilters builder specification and convenience filter examples

---

## Notes

- The `AlgoliaFilters` class is pure logic with no external dependencies. It should be one of the first things implemented and tested in M4.
- The `fromString()` factory intentionally does NOT parse existing filter strings into their component parts. It wraps the string as a single raw AND condition. Full parsing of Algolia filter syntax is not needed for goodneighbor's use cases.
- The convenience methods (`addUserPermissions`, `addType`, etc.) are the primary API for goodneighbor code. The core methods (`addOr`, `addAnd`, `addOrGroup`) are lower-level and mainly used to implement the convenience methods.
- All filter values containing special characters (`:`, `@`, spaces) are wrapped in double quotes. This is a requirement of Algolia's filter syntax.

---

**Next Task**: [Task 16: SearchService Implementation](./task-16-search-service.md)
**Related Design Docs**: [Search Architecture](../../design/local.search-architecture.md)
**Estimated Completion Date**: TBD
