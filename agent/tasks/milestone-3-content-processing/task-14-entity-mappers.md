# Task 14: Post & Feed Mappers

**Milestone**: [M3 - Content Processing & Entity Builders](../../milestones/milestone-3-content-processing.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 2 (content entity types, DbPost, DbFeed, DbFeedSubmission), Task 3 (PostViewModel, FeedViewModel, FeedSubmissionViewModel)
**Status**: Not Started

---

## Objective

Implement three mapper functions that transform database entities into user-facing view models with permission flags:

1. `mapDbPostToViewModel(dbPost, userContext)` -- derives canEdit, canDelete, isLiked, isFollowing from post refs
2. `mapDbFeedToViewModel(dbFeed, userContext)` -- derives isOwner, canModerate, canPost, isFollowing, canEdit from feed refs
3. `mapDbFeedSubmissionToViewModel(sub)` -- maps DbFeedSubmission fields to FeedSubmissionViewModel

Permission flags are derived by checking refs arrays for the current user's semantic ID (`@uid:{userId}`). This is the mechanism that connects the refs-based permission model to the UI.

---

## Context

The refs arrays on each entity serve as an inline access control list. When a user views a post or feed, the mapper checks whether the user's semantic ID appears in the relevant refs arrays to determine what actions are available.

From the content-entity-model design doc:

```typescript
// post-mappers.ts
const canEdit = dbPost.refs.hasEditPermissions.includes(`@uid:${userId}`);
const canDelete = dbPost.refs.hasArchivePermissions.includes(`@uid:${userId}`);
const isLiked = dbPost.refs.hasLiker.includes(`@uid:${userId}`);

// feed-mappers.ts
const isOwner = dbFeed.refs.hasOwner.includes(`@uid:${userId}`);
const canModerate = dbFeed.refs.hasModerator.includes(`@uid:${userId}`);
const canPost = dbFeed.refs.hasSubmitPermissions.includes("@public")
  || dbFeed.refs.hasSubmitPermissions.includes(`@uid:${userId}`);
```

The semantic ID format `@uid:{firebaseUid}` must be used consistently. If creators use `@uid:abc123` but mappers check for `abc123` (without the prefix), permission checks will silently fail.

The `userContext` parameter provides the currently authenticated user's information. When `userContext` is null or undefined (unauthenticated user), all permission flags default to false.

---

## Steps

### 1. Define UserContext type

If not already defined in the types from Task 3, define:

```typescript
export interface UserContext {
  userId: string;  // Firebase UID
}
```

### 2. Create post-mappers module

Create `src/lib/mappers/post-mappers.ts`:

```typescript
// src/lib/mappers/post-mappers.ts

import { DbPost } from '../../types/post.types';
import { PostViewModel } from '../../types/post.types';

export interface UserContext {
  userId: string;
}

/**
 * Map a database post entity to a user-facing view model.
 *
 * Derives permission flags by checking refs arrays for @uid:{userId}:
 * - canEdit: userId in refs.hasEditPermissions
 * - canDelete: userId in refs.hasArchivePermissions
 * - isLiked: userId in refs.hasLiker
 * - isFollowing: userId in refs.hasFollower
 *
 * When userContext is null (unauthenticated), all flags default to false.
 *
 * @param dbPost - Database post entity from Firestore
 * @param userContext - Current user context (null for unauthenticated)
 * @returns PostViewModel with user-specific permission flags
 */
export function mapDbPostToViewModel(
  dbPost: DbPost,
  userContext: UserContext | null,
): PostViewModel {
  const userSemId = userContext ? `@uid:${userContext.userId}` : null;

  const canEdit = userSemId
    ? dbPost.refs.hasEditPermissions.includes(userSemId)
    : false;
  const canDelete = userSemId
    ? dbPost.refs.hasArchivePermissions.includes(userSemId)
    : false;
  const isLiked = userSemId
    ? dbPost.refs.hasLiker.includes(userSemId)
    : false;
  const isFollowing = userSemId
    ? dbPost.refs.hasFollower.includes(userSemId)
    : false;
  const isOwner = userSemId
    ? dbPost.refs.hasOwner.includes(userSemId)
    : false;

  return {
    id: dbPost.id,
    type: dbPost.type,
    title: dbPost.properties.displayName,
    content: dbPost.properties.mainContent,
    tags: dbPost.properties.tags,
    mentions: dbPost.properties.mentions,
    isPublic: dbPost.isPublic,
    createdAt: dbPost.timestamps.createdAt,
    updatedAt: dbPost.timestamps.updatedAt,
    stats: dbPost.stats,
    canEdit,
    canDelete,
    isLiked,
    isFollowing,
    isOwner,
  };
}
```

### 3. Create feed-mappers module

Create `src/lib/mappers/feed-mappers.ts`:

```typescript
// src/lib/mappers/feed-mappers.ts

import { DbFeed, DbFeedSubmission } from '../../types/feed.types';
import { FeedViewModel, FeedSubmissionViewModel } from '../../types/feed.types';
import { UserContext } from './post-mappers';

/**
 * Map a database feed entity to a user-facing view model.
 *
 * Derives permission flags by checking refs arrays:
 * - isOwner: userId in refs.hasOwner
 * - canModerate: userId in refs.hasModerator
 * - canPost: refs.hasSubmitPermissions includes @public OR @uid:{userId}
 * - canEdit: userId in refs.hasEditPermissions
 * - isFollowing: userId in refs.hasFollower
 *
 * @param dbFeed - Database feed entity from Firestore
 * @param userContext - Current user context (null for unauthenticated)
 * @returns FeedViewModel with user-specific permission flags
 */
export function mapDbFeedToViewModel(
  dbFeed: DbFeed,
  userContext: UserContext | null,
): FeedViewModel {
  const userSemId = userContext ? `@uid:${userContext.userId}` : null;

  const isOwner = userSemId
    ? dbFeed.refs.hasOwner.includes(userSemId)
    : false;
  const canModerate = userSemId
    ? dbFeed.refs.hasModerator.includes(userSemId)
    : false;
  const canEdit = userSemId
    ? dbFeed.refs.hasEditPermissions.includes(userSemId)
    : false;
  const isFollowing = userSemId
    ? dbFeed.refs.hasFollower.includes(userSemId)
    : false;

  // canPost is true if the feed allows public submissions OR the user has submit permissions
  const canPost = dbFeed.refs.hasSubmitPermissions.includes("@public")
    || (userSemId ? dbFeed.refs.hasSubmitPermissions.includes(userSemId) : false);

  return {
    id: dbFeed.id,
    type: dbFeed.type,
    subtype: dbFeed.subtype,
    name: dbFeed.properties.displayName,
    description: dbFeed.properties.mainContent,
    tags: dbFeed.properties.tags,
    rules: dbFeed.properties.rules,
    isPublic: dbFeed.isPublic,
    createdAt: dbFeed.timestamps.createdAt,
    updatedAt: dbFeed.timestamps.updatedAt,
    stats: dbFeed.stats,
    behavior: dbFeed.behavior,
    isOwner,
    canModerate,
    canPost,
    canEdit,
    isFollowing,
  };
}

/**
 * Map a database feed submission to a view model.
 *
 * This is a simple field mapping without permission derivation,
 * since submission visibility is controlled at the query level.
 *
 * @param sub - Database feed submission from Firestore
 * @returns FeedSubmissionViewModel
 */
export function mapDbFeedSubmissionToViewModel(
  sub: DbFeedSubmission,
): FeedSubmissionViewModel {
  return {
    id: sub.id,
    feedId: sub.feedId,
    postId: sub.postId,
    createdBy: sub.createdBy,
    status: sub.status,
    submittedAt: sub.submittedAt,
    reviewedAt: sub.reviewedAt,
    reviewedBy: sub.reviewedBy,
    rejectionReason: sub.rejectionReason,
  };
}
```

### 4. Write tests for post mappers

Create `src/lib/mappers/post-mappers.spec.ts`:

```typescript
import { mapDbPostToViewModel } from './post-mappers';

// Helper to create a minimal DbPost for testing
function createTestDbPost(overrides: any = {}) {
  return {
    id: 'post-1',
    type: 'post' as const,
    name: 'Test Post',
    search: 'test content',
    isPublic: true,
    isPublished: true,
    timestamps: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    metadata: {},
    stats: { viewers: 0, followers: 0, sharers: 0, likers: 0, comments: 0, views: 0, reposts: 0, quotes: 0, annotations: 0, tags: 0 },
    properties: {
      displayName: 'Test Post',
      mainContent: 'Test content body',
      tags: ['test'],
      mentions: [],
    },
    refs: {
      hasOwner: ['@uid:owner1'],
      hasViewer: ['@public'],
      hasEditPermissions: ['@uid:owner1'],
      hasArchivePermissions: ['@uid:owner1'],
      hasUpdateViewersPermissions: ['@uid:owner1'],
      hasConfigurePropertiesPermissions: ['@uid:owner1'],
      hasAuthor: ['@uid:owner1'],
      hasCreator: ['@uid:owner1'],
      hasCollaborator: ['@uid:owner1'],
      hasTag: ['test'],
      hasMention: [],
      hasFollower: ['@uid:follower1'],
      hasSharer: [],
      hasLiker: ['@uid:liker1'],
      hasSecretLiker: [],
      hasAnonymousLiker: [],
      hasReviewer: [],
      hasBeenViewedBy: [],
      hasFlair: [],
      hasSupporter: [],
      hasComments: [],
      hasCommenter: [],
      hasQuote: [],
      hasQuoter: [],
      hasAnnotation: [],
      hasAnnotator: [],
      hasRepost: [],
      hasReposter: [],
      hasRelated: [],
      ...overrides.refs,
    },
    ...overrides,
    refs: { ...overrides.refs },
  };
}

describe('mapDbPostToViewModel', () => {
  describe('as post owner', () => {
    it('should set canEdit to true', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, { userId: 'owner1' });
      expect(vm.canEdit).toBe(true);
    });

    it('should set canDelete to true', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, { userId: 'owner1' });
      expect(vm.canDelete).toBe(true);
    });

    it('should set isOwner to true', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, { userId: 'owner1' });
      expect(vm.isOwner).toBe(true);
    });
  });

  describe('as non-owner user', () => {
    it('should set canEdit to false', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, { userId: 'other-user' });
      expect(vm.canEdit).toBe(false);
    });

    it('should set canDelete to false', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, { userId: 'other-user' });
      expect(vm.canDelete).toBe(false);
    });

    it('should set isOwner to false', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, { userId: 'other-user' });
      expect(vm.isOwner).toBe(false);
    });
  });

  describe('social flags', () => {
    it('should set isLiked to true when user is in hasLiker', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, { userId: 'liker1' });
      expect(vm.isLiked).toBe(true);
    });

    it('should set isLiked to false when user is not in hasLiker', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, { userId: 'other-user' });
      expect(vm.isLiked).toBe(false);
    });

    it('should set isFollowing to true when user is in hasFollower', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, { userId: 'follower1' });
      expect(vm.isFollowing).toBe(true);
    });
  });

  describe('unauthenticated user', () => {
    it('should set all permission flags to false', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, null);
      expect(vm.canEdit).toBe(false);
      expect(vm.canDelete).toBe(false);
      expect(vm.isLiked).toBe(false);
      expect(vm.isFollowing).toBe(false);
      expect(vm.isOwner).toBe(false);
    });
  });

  describe('field mapping', () => {
    it('should map properties.displayName to title', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, null);
      expect(vm.title).toBe('Test Post');
    });

    it('should map properties.mainContent to content', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, null);
      expect(vm.content).toBe('Test content body');
    });

    it('should include stats', () => {
      const dbPost = createTestDbPost();
      const vm = mapDbPostToViewModel(dbPost, null);
      expect(vm.stats).toBeDefined();
    });
  });
});
```

### 5. Write tests for feed mappers

Create `src/lib/mappers/feed-mappers.spec.ts`:

```typescript
import { mapDbFeedToViewModel, mapDbFeedSubmissionToViewModel } from './feed-mappers';

describe('mapDbFeedToViewModel', () => {
  // Helper to build test DbFeed - use similar pattern as post test helper

  describe('as feed owner', () => {
    it('should set isOwner to true', () => {
      // Test with userId matching refs.hasOwner
    });

    it('should set canModerate to true', () => {
      // Test with userId matching refs.hasModerator
    });

    it('should set canEdit to true', () => {
      // Test with userId matching refs.hasEditPermissions
    });
  });

  describe('as non-owner user', () => {
    it('should set isOwner to false', () => { /* ... */ });
    it('should set canModerate to false', () => { /* ... */ });
  });

  describe('canPost permission', () => {
    it('should be true for public feeds (any user)', () => {
      // hasSubmitPermissions includes "@public"
    });

    it('should be true for private feeds when user has submit permissions', () => {
      // hasSubmitPermissions includes "@uid:{userId}"
    });

    it('should be false for private feeds when user lacks submit permissions', () => {
      // hasSubmitPermissions does not include "@public" or "@uid:{userId}"
    });

    it('should be true for public feeds even for unauthenticated users', () => {
      // @public in hasSubmitPermissions means anyone can post
    });
  });

  describe('unauthenticated user', () => {
    it('should set all ownership/moderation flags to false', () => { /* ... */ });
    it('should still allow canPost if feed is public', () => { /* ... */ });
  });
});

describe('mapDbFeedSubmissionToViewModel', () => {
  it('should map all submission fields', () => {
    const sub = {
      id: 'sub-1',
      type: 'feed_submission' as const,
      name: 'Submission 1',
      feedId: 'feed-1',
      postId: 'post-1',
      createdBy: 'user-1',
      status: 'pending' as const,
      submittedAt: '2026-01-01T00:00:00Z',
    };

    const vm = mapDbFeedSubmissionToViewModel(sub);
    expect(vm.id).toBe('sub-1');
    expect(vm.feedId).toBe('feed-1');
    expect(vm.postId).toBe('post-1');
    expect(vm.status).toBe('pending');
  });

  it('should include optional review fields when present', () => {
    const sub = {
      id: 'sub-2',
      type: 'feed_submission' as const,
      name: 'Submission 2',
      feedId: 'feed-1',
      postId: 'post-2',
      createdBy: 'user-1',
      status: 'rejected' as const,
      submittedAt: '2026-01-01T00:00:00Z',
      reviewedAt: '2026-01-02T00:00:00Z',
      reviewedBy: 'moderator-1',
      rejectionReason: 'Off topic',
    };

    const vm = mapDbFeedSubmissionToViewModel(sub);
    expect(vm.reviewedAt).toBe('2026-01-02T00:00:00Z');
    expect(vm.reviewedBy).toBe('moderator-1');
    expect(vm.rejectionReason).toBe('Off topic');
  });
});
```

### 6. Test with various userContext scenarios

Write tests covering at least these scenarios for each mapper:
- **Owner**: userId matches the creator in refs
- **Non-owner with specific permission**: userId added to a specific refs array (e.g., granted edit permissions)
- **Non-owner without permission**: userId not in any refs arrays
- **Unauthenticated**: userContext is null
- **User who has liked**: userId in refs.hasLiker
- **User who is following**: userId in refs.hasFollower

---

## Verification

- [ ] `mapDbPostToViewModel` returns a `PostViewModel` with all required fields
- [ ] `canEdit` is `true` when `@uid:{userId}` is in `refs.hasEditPermissions`
- [ ] `canEdit` is `false` when `@uid:{userId}` is NOT in `refs.hasEditPermissions`
- [ ] `canDelete` is `true` when `@uid:{userId}` is in `refs.hasArchivePermissions`
- [ ] `canDelete` is `false` when `@uid:{userId}` is NOT in `refs.hasArchivePermissions`
- [ ] `isLiked` is `true` when `@uid:{userId}` is in `refs.hasLiker`
- [ ] `isFollowing` is `true` when `@uid:{userId}` is in `refs.hasFollower`
- [ ] `isOwner` is `true` when `@uid:{userId}` is in `refs.hasOwner`
- [ ] All flags are `false` when `userContext` is `null`
- [ ] `properties.displayName` maps to `title` in PostViewModel
- [ ] `properties.mainContent` maps to `content` in PostViewModel
- [ ] `mapDbFeedToViewModel` returns a `FeedViewModel` with all required fields
- [ ] `isOwner` correctly derived from `refs.hasOwner`
- [ ] `canModerate` correctly derived from `refs.hasModerator`
- [ ] `canPost` is `true` when `refs.hasSubmitPermissions` contains `"@public"`
- [ ] `canPost` is `true` when `refs.hasSubmitPermissions` contains `"@uid:{userId}"`
- [ ] `canPost` is `false` for private feed when user lacks submit permissions
- [ ] `canPost` is `true` for public feed even when `userContext` is `null`
- [ ] `mapDbFeedSubmissionToViewModel` maps all fields including optional review fields
- [ ] All tests pass (`npm test`)
- [ ] Files compile without TypeScript errors (`npm run typecheck`)

---

## Expected Output

**File Structure**:
```
src/lib/mappers/
├── post-mappers.ts          # mapDbPostToViewModel, UserContext
├── post-mappers.spec.ts     # Comprehensive permission scenario tests
├── feed-mappers.ts          # mapDbFeedToViewModel, mapDbFeedSubmissionToViewModel
└── feed-mappers.spec.ts     # Comprehensive permission and submission tests
```

**Key Exports**:
- `mapDbPostToViewModel(dbPost: DbPost, userContext: UserContext | null): PostViewModel`
- `mapDbFeedToViewModel(dbFeed: DbFeed, userContext: UserContext | null): FeedViewModel`
- `mapDbFeedSubmissionToViewModel(sub: DbFeedSubmission): FeedSubmissionViewModel`
- `UserContext` interface

---

## Common Issues and Solutions

### Issue 1: Semantic ID format mismatch
**Symptom**: Permission flags are always false even for the owner
**Solution**: Ensure mappers construct the semantic ID as `` `@uid:${userContext.userId}` `` exactly matching what creators put into the refs arrays. A common mistake is using the plain userId without the `@uid:` prefix.

### Issue 2: canPost logic for public feeds
**Symptom**: canPost is false for unauthenticated users on public feeds
**Solution**: The canPost check must first check for `"@public"` in hasSubmitPermissions before checking for the user's specific semantic ID. Public feed submit permissions use the `@public` token, which is independent of whether a userContext exists.

### Issue 3: ViewModel types not yet defined
**Symptom**: TypeScript cannot find PostViewModel or FeedViewModel types
**Solution**: These types should be defined in Task 3 (domain types). If not yet available, define minimal interfaces in the mapper files and migrate them later. The key fields are the permission booleans (canEdit, canDelete, isLiked, etc.) plus the display fields mapped from properties.

### Issue 4: DbPost and DbFeed test fixtures are verbose
**Symptom**: Tests become hard to read with large fixture objects
**Solution**: Create helper factory functions (createTestDbPost, createTestDbFeed) that return default objects and accept overrides. This keeps individual tests focused on the specific scenario being tested.

---

## Resources

- `agent/design/local.content-entity-model.md`: Permission Checks in Mappers section -- exact field mappings
- `agent/design/local.goodneighbor-core.md`: ContentService mapper signatures

---

## Notes

- The `UserContext` interface is intentionally minimal (just `userId`). It may be extended later to include claims, roles, or other auth information, but for permission checking only the Firebase UID is needed.
- Mappers are pure functions: they take data in and return data out with no side effects. They do NOT fetch additional data from Firestore or any other source.
- The semantic ID check uses `Array.includes()` which is O(n). For entities with very large refs arrays (e.g., a post with thousands of likers), this could be slow. This matches the existing goodneighbor behavior and is acceptable for now. If performance becomes an issue, refs could be converted to Sets.
- `mapDbFeedSubmissionToViewModel` does not take a `userContext` because submission visibility is controlled at the query level (only moderators and the submitter can see submissions), not at the mapper level.

---

**Next Task**: [Task 15: AlgoliaFilters Builder Class](../milestone-4-search-service/task-15-algolia-filters.md)
**Related Design Docs**: [Content Entity Model](../../design/local.content-entity-model.md)
**Estimated Completion Date**: TBD
