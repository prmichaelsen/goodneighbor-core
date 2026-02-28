# Task 4: Firestore Collection Constants

**Milestone**: [M1 - Types, Constants & Errors](../../milestones/milestone-1-types-constants-errors.md)
**Estimated Time**: 2 hours
**Dependencies**: None
**Status**: Not Started

---

## Objective

Create typed Firestore collection path constants for all 27 goodneighbor collections. Constants are grouped by category (Profile, Auth, Content, Relationships, Store, System), exported as a frozen `as const` object for literal type inference, and explicitly exclude all cleanbook-related collections. A barrel export and unit tests round out the deliverable.

---

## Context

The goodneighbor application uses 27 Firestore collections for all persistent data. These collection paths are currently scattered across the Next.js codebase as string literals, creating a maintenance burden and a source of typos. Centralizing them as typed constants ensures every service references the canonical path and enables TypeScript to catch collection path errors at compile time.

All goodneighbor collection paths follow one of two patterns:
- `goodneighbor/collections/{name}` -- subcollection-style paths for most entities
- `goodneighbor.search` -- the unified search collection (dot-separated, not subcollection)

Cleanbook collections (clean appointments, Guesty, Mellow, daily digest, etc.) are explicitly excluded from goodneighbor-core.

---

## Steps

### 1. Create constants/collections.ts

Create `src/constants/collections.ts` with all 27 collection paths:

```typescript
/**
 * Firestore collection path constants for goodneighbor.
 * All 27 goodneighbor-scoped collections, grouped by category.
 *
 * Cleanbook collections are intentionally excluded:
 * - No clean appointment collections
 * - No Guesty integration collections
 * - No Mellow integration collections
 * - No daily digest collections
 * - No property management collections
 */
export const COLLECTIONS = {
  // -- Profile (4) --
  /** Public profile data (displayName, username, bio, avatarUrl, etc.) */
  PUBLIC_PROFILES: 'goodneighbor/collections/public-profiles',
  /** Private profile data (email, phone, preferences) */
  PRIVATE_PROFILES: 'goodneighbor/collections/private-profiles',
  /** Profile board widget configurations */
  PROFILE_BOARDS: 'goodneighbor/collections/profile-boards',
  /** Base user records */
  USERS: 'goodneighbor/collections/users',

  // -- Auth (2) --
  /** Password reset tokens */
  PASSWORD_RESETS: 'goodneighbor/collections/password-resets',
  /** Email verification tokens */
  EMAIL_VERIFICATIONS: 'goodneighbor/collections/email-verifications',

  // -- Content (4) --
  /** Unified search collection (all content entities: posts, feeds, comments, submissions) */
  SEARCH: 'goodneighbor.search',
  /** Mapping from DB document IDs to search entity IDs */
  SEARCH_DB_ID_MAPPINGS: 'goodneighbor/collections/search-id-mappings',
  /** Comments on posts */
  POST_COMMENTS: 'goodneighbor/collections/post-comments',
  /** Replies to comments */
  COMMENT_REPLIES: 'goodneighbor/collections/comment-replies',

  // -- Relationships (4) --
  /** Feed submission records (post submitted to feed for moderation) */
  FEED_SUBMISSIONS: 'goodneighbor/collections/feed-submissions',
  /** Feed follower records */
  FEED_FOLLOWERS: 'goodneighbor/collections/feed-followers',
  /** Feed moderator records */
  FEED_MODERATORS: 'goodneighbor/collections/feed-moderators',
  /** User vote records (likes, upvotes, etc.) */
  USER_VOTES: 'goodneighbor/collections/user-votes',

  // -- Store (5) --
  /** Product listings */
  PRODUCTS: 'goodneighbor/collections/products',
  /** Store configuration and settings */
  STORE_SETTINGS: 'goodneighbor/collections/store-settings',
  /** Order records */
  ORDERS: 'goodneighbor/collections/orders',
  /** Shopping cart records */
  CARTS: 'goodneighbor/collections/carts',
  /** User shipping/billing addresses */
  ADDRESSES: 'goodneighbor/collections/addresses',

  // -- System (8) --
  /** Application-wide settings */
  SYSTEM_SETTINGS: 'goodneighbor/collections/system-settings',
  /** Webhook event logs */
  WEBHOOK_EVENTS: 'goodneighbor/collections/webhook-events',
  /** Debug email captures (for testing email sending) */
  DEBUG_EMAILS: 'goodneighbor/collections/debug-emails',
  /** Chat session records */
  CHAT_SESSIONS: 'goodneighbor/collections/chat-sessions',
  /** Chat message records */
  CHAT_MESSAGES: 'goodneighbor/collections/chat-messages',
  /** Waitlist invitation codes */
  WAITLIST_CODES: 'goodneighbor/collections/waitlist-codes',
  /** Editor content and draft storage */
  EDITOR: 'goodneighbor/collections/editor',
} as const;

/**
 * Type for any valid collection path.
 * Useful for functions that accept a collection name parameter.
 */
export type CollectionPath = typeof COLLECTIONS[keyof typeof COLLECTIONS];

/**
 * Category groupings for documentation and tooling.
 */
export const COLLECTION_CATEGORIES = {
  PROFILE: [
    COLLECTIONS.PUBLIC_PROFILES,
    COLLECTIONS.PRIVATE_PROFILES,
    COLLECTIONS.PROFILE_BOARDS,
    COLLECTIONS.USERS,
  ],
  AUTH: [
    COLLECTIONS.PASSWORD_RESETS,
    COLLECTIONS.EMAIL_VERIFICATIONS,
  ],
  CONTENT: [
    COLLECTIONS.SEARCH,
    COLLECTIONS.SEARCH_DB_ID_MAPPINGS,
    COLLECTIONS.POST_COMMENTS,
    COLLECTIONS.COMMENT_REPLIES,
  ],
  RELATIONSHIPS: [
    COLLECTIONS.FEED_SUBMISSIONS,
    COLLECTIONS.FEED_FOLLOWERS,
    COLLECTIONS.FEED_MODERATORS,
    COLLECTIONS.USER_VOTES,
  ],
  STORE: [
    COLLECTIONS.PRODUCTS,
    COLLECTIONS.STORE_SETTINGS,
    COLLECTIONS.ORDERS,
    COLLECTIONS.CARTS,
    COLLECTIONS.ADDRESSES,
  ],
  SYSTEM: [
    COLLECTIONS.SYSTEM_SETTINGS,
    COLLECTIONS.WEBHOOK_EVENTS,
    COLLECTIONS.DEBUG_EMAILS,
    COLLECTIONS.CHAT_SESSIONS,
    COLLECTIONS.CHAT_MESSAGES,
    COLLECTIONS.WAITLIST_CODES,
    COLLECTIONS.EDITOR,
  ],
} as const;
```

### 2. Create constants/index.ts Barrel Export

Create `src/constants/index.ts`:

```typescript
export * from './collections';
```

### 3. Write Unit Tests

Create `src/constants/__tests__/collections.spec.ts`:

```typescript
import { COLLECTIONS, COLLECTION_CATEGORIES, CollectionPath } from '../collections';

describe('Firestore Collection Constants', () => {
  it('should define exactly 27 collection paths', () => {
    const paths = Object.values(COLLECTIONS);
    expect(paths).toHaveLength(27);
  });

  it('should have all paths starting with "goodneighbor"', () => {
    const paths = Object.values(COLLECTIONS);
    for (const path of paths) {
      expect(path).toMatch(/^goodneighbor/);
    }
  });

  it('should not contain any cleanbook collection paths', () => {
    const paths = Object.values(COLLECTIONS);
    const cleanBookTerms = ['clean', 'guesty', 'mellow', 'appointment', 'property', 'digest', 'manager'];
    for (const path of paths) {
      for (const term of cleanBookTerms) {
        expect(path.toLowerCase()).not.toContain(term);
      }
    }
  });

  it('should have SEARCH collection using dot notation', () => {
    expect(COLLECTIONS.SEARCH).toBe('goodneighbor.search');
  });

  it('should have all non-SEARCH paths using subcollection notation', () => {
    const paths = Object.entries(COLLECTIONS)
      .filter(([key]) => key !== 'SEARCH')
      .map(([, value]) => value);
    for (const path of paths) {
      expect(path).toMatch(/^goodneighbor\/collections\//);
    }
  });

  it('should have category counts summing to 27', () => {
    const categoryTotal = Object.values(COLLECTION_CATEGORIES)
      .reduce((sum, paths) => sum + paths.length, 0);
    expect(categoryTotal).toBe(27);
  });

  it('should have all unique paths (no duplicates)', () => {
    const paths = Object.values(COLLECTIONS);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });
});
```

---

## Verification

- [ ] `src/constants/collections.ts` exists and compiles without errors
- [ ] COLLECTIONS object has exactly 27 keys
- [ ] All 27 paths start with "goodneighbor"
- [ ] COLLECTIONS.SEARCH is "goodneighbor.search" (dot notation)
- [ ] All other paths use "goodneighbor/collections/{name}" format
- [ ] No cleanbook-related paths (clean, guesty, mellow, appointment, property, digest, manager)
- [ ] COLLECTIONS is exported with `as const` for literal type inference
- [ ] CollectionPath type represents the union of all 27 path strings
- [ ] COLLECTION_CATEGORIES groups all 27 paths across 6 categories
- [ ] `src/constants/index.ts` barrel exports the collections module
- [ ] All unit tests pass
- [ ] TypeScript compiles without errors

---

## Expected Output

**File Structure**:
```
src/constants/
├── __tests__/
│   └── collections.spec.ts   # NEW: Tests for collection constants
├── index.ts                   # NEW: Barrel export
└── collections.ts             # NEW: 27 collection path constants
```

**Key Files Created**:
- `src/constants/collections.ts`: All 27 Firestore collection paths as typed constants
- `src/constants/index.ts`: Barrel export for the constants module

---

## Common Issues and Solutions

### Issue 1: Collection count is not exactly 27
**Symptom**: Unit test "should define exactly 27 collection paths" fails
**Solution**: Cross-reference against the canonical list in `agent/design/local.goodneighbor-core.md` under "Collections to Port". Count carefully including all Store and System collections.

### Issue 2: SEARCH path uses wrong separator
**Symptom**: The unified search collection path uses "/" instead of "."
**Solution**: The search collection is `goodneighbor.search` (dot notation), not `goodneighbor/collections/search`. This is a special case -- it is a top-level collection, not a subcollection.

### Issue 3: as const not applied
**Symptom**: CollectionPath type resolves to `string` instead of the union of literal strings
**Solution**: Ensure the COLLECTIONS object has `as const` assertion. Without it, TypeScript widens the values from literal strings to `string`.

---

## Resources

- Design doc: `agent/design/local.goodneighbor-core.md` -- Canonical list of all 27 collection paths under "Collections to Port"
- Design doc: `agent/design/requirements.md` -- Collection constants listed as a supporting feature

---

## Notes

- The COLLECTIONS object is frozen at the type level via `as const`. There is no need for `Object.freeze()` at runtime since the values are strings (immutable by nature).
- Store collections (Products, Store Settings, Orders, Carts, Addresses) are included in the constants even though store/e-commerce features are deferred to a future milestone. The constants are cheap to define and ensure the paths are available when needed.
- The COLLECTION_CATEGORIES grouping is for documentation and tooling convenience. It is not required by any service.
- This task has no dependencies on other tasks -- it can be started immediately and worked on in parallel with Tasks 1-3.

---

**Next Task**: [Task 5: Error Hierarchy & Error Codes](./task-5-error-hierarchy.md)
**Related Design Docs**: `agent/design/local.goodneighbor-core.md`
**Estimated Completion Date**: TBD
