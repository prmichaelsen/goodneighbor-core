# Task 12: Post Creators

**Milestone**: [M3 - Content Processing & Entity Builders](../../milestones/milestone-3-content-processing.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 2 (content entity types, ContentEntityRefs, DbPost, EntityStats), Task 11 (ProcessedContent type)
**Status**: Not Started

---

## Objective

Implement two post creation functions:

1. `buildPostRefs(userId, isPublic, hashtags, mentionUids)` -- constructs a complete `ContentEntityRefs` object with all 28 fields populated according to the exact specification in the content-entity-model design doc.
2. `createPostEntity(dto, userId, processed)` -- builds a complete `DbPost` document ready for Firestore insertion, with refs, zeroed stats, timestamps, properties, and search text.

These functions are the bridge between content processing (Task 10-11) and database persistence. Correct refs assignment is critical because it drives both the permission model and Algolia search filtering.

---

## Context

The refs-based permission model is the architectural core of goodneighbor. Every content entity carries a `refs` object with arrays of semantic IDs that control:
- **Visibility**: `hasViewer` contains `["@public"]` for public content or `["@uid:{userId}"]` for private content
- **Ownership**: `hasOwner`, `hasAuthor`, `hasCreator`, `hasCollaborator` all contain `["@uid:{userId}"]`
- **Permissions**: `hasEditPermissions`, `hasArchivePermissions`, etc. initially contain the creator's UID
- **Content associations**: `hasTag` contains extracted hashtags, `hasMention` contains resolved UIDs
- **Social interactions**: `hasFollower`, `hasLiker`, `hasCommenter`, etc. start empty and accumulate as users interact

The semantic ID format is `@uid:{firebaseUid}` -- NOT usernames. This is a deliberate design decision to avoid fan-out updates when users change their username.

The `@public` token is the sole system visibility marker. Public content has `hasViewer: ["@public"]`; private content has `hasViewer: ["@uid:{userId}"]`.

---

## Steps

### 1. Create the post-creators module

Create `src/lib/creators/post-creators.ts`:

```typescript
// src/lib/creators/post-creators.ts

import { ContentEntityRefs } from '../../types/content-entity.types';
import { DbPost, CreatePostDto } from '../../types/post.types';
import { EntityStats } from '../../types/content-entity.types';
import { ProcessedContent } from '../content-processing';

export function buildPostRefs(
  userId: string,
  isPublic: boolean,
  hashtags: string[],
  mentionUids: string[],
): ContentEntityRefs {
  // Implementation here
}

export function createPostEntity(
  dto: CreatePostDto,
  userId: string,
  processed: ProcessedContent,
): DbPost {
  // Implementation here
}
```

### 2. Implement buildPostRefs

Follow the exact refs assignment from the content-entity-model design doc:

```typescript
/**
 * Build ContentEntityRefs for a new post.
 *
 * Semantic ID format: @uid:{firebaseUid} for all user references.
 * Visibility: @public for public posts, @uid:{userId} for private posts.
 *
 * @param userId - Firebase UID of the post creator
 * @param isPublic - Whether the post is publicly visible
 * @param hashtags - Extracted hashtag strings (without # prefix)
 * @param mentionUids - Firebase UIDs resolved from @mentions
 * @returns Complete ContentEntityRefs with all 28 fields populated
 */
export function buildPostRefs(
  userId: string,
  isPublic: boolean,
  hashtags: string[],
  mentionUids: string[],
): ContentEntityRefs {
  const userSemId = `@uid:${userId}`;

  return {
    // Visibility
    hasViewer: isPublic ? ["@public"] : [userSemId],

    // Ownership & authoring
    hasOwner: [userSemId],
    hasAuthor: [userSemId],
    hasCreator: [userSemId],
    hasCollaborator: [userSemId],

    // Permissions (initially only the creator)
    hasEditPermissions: [userSemId],
    hasArchivePermissions: [userSemId],
    hasUpdateViewersPermissions: [userSemId],
    hasConfigurePropertiesPermissions: [userSemId],

    // Content associations
    hasTag: hashtags,
    hasMention: mentionUids,

    // Social interactions (initialized empty)
    hasFollower: [],
    hasSharer: [],
    hasLiker: [],
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
  };
}
```

### 3. Implement createPostEntity

Build the complete `DbPost` document:

```typescript
/**
 * Create a complete DbPost entity ready for Firestore insertion.
 *
 * Maps DTO fields to entity fields:
 * - dto.title -> properties.displayName
 * - dto.content -> properties.mainContent
 * - processed.hashtags -> refs.hasTag and properties.tags
 * - processed.mentions -> refs.hasMention and properties.mentions
 *
 * @param dto - Post creation DTO from the client
 * @param userId - Firebase UID of the post creator
 * @param processed - ProcessedContent from processPostContent()
 * @returns Complete DbPost ready for Firestore write
 */
export function createPostEntity(
  dto: CreatePostDto,
  userId: string,
  processed: ProcessedContent,
): DbPost {
  const now = new Date().toISOString();
  const refs = buildPostRefs(userId, dto.isPublic, processed.hashtags, processed.mentions);

  // Build concatenated search text for Algolia indexing
  const searchParts = [
    dto.title,
    dto.content,
    ...processed.hashtags,
  ].filter(Boolean);
  const search = searchParts.join(' ');

  const stats: EntityStats = {
    viewers: 0,
    followers: 0,
    sharers: 0,
    likers: 0,
    comments: 0,
    views: 0,
    reposts: 0,
    quotes: 0,
    annotations: 0,
    tags: processed.hashtags.length,
  };

  return {
    id: '', // Set by Firestore on write
    type: 'post',
    name: dto.title || '',
    search,
    refs,
    isPublic: dto.isPublic,
    isPublished: true,
    timestamps: {
      createdAt: now,
      updatedAt: now,
    },
    metadata: {},
    stats,
    properties: {
      displayName: dto.title || '',
      mainContent: dto.content,
      tags: processed.hashtags,
      mentions: processed.mentions,
    },
  };
}
```

### 4. Write tests for buildPostRefs

Create `src/lib/creators/post-creators.spec.ts`:

```typescript
import { buildPostRefs, createPostEntity } from './post-creators';

describe('buildPostRefs', () => {
  const userId = 'abc123def456';

  describe('public posts', () => {
    it('should set hasViewer to ["@public"]', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasViewer).toEqual(['@public']);
    });
  });

  describe('private posts', () => {
    it('should set hasViewer to ["@uid:{userId}"]', () => {
      const refs = buildPostRefs(userId, false, [], []);
      expect(refs.hasViewer).toEqual([`@uid:${userId}`]);
    });
  });

  describe('ownership refs', () => {
    it('should set hasOwner with @uid: format', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasOwner).toEqual([`@uid:${userId}`]);
    });

    it('should set hasAuthor with @uid: format', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasAuthor).toEqual([`@uid:${userId}`]);
    });

    it('should set hasCreator with @uid: format', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasCreator).toEqual([`@uid:${userId}`]);
    });

    it('should set hasCollaborator with @uid: format', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasCollaborator).toEqual([`@uid:${userId}`]);
    });
  });

  describe('permission refs', () => {
    it('should set all permission arrays to creator', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasEditPermissions).toEqual([`@uid:${userId}`]);
      expect(refs.hasArchivePermissions).toEqual([`@uid:${userId}`]);
      expect(refs.hasUpdateViewersPermissions).toEqual([`@uid:${userId}`]);
      expect(refs.hasConfigurePropertiesPermissions).toEqual([`@uid:${userId}`]);
    });
  });

  describe('content association refs', () => {
    it('should set hasTag from hashtags', () => {
      const refs = buildPostRefs(userId, true, ['safety', 'alert'], []);
      expect(refs.hasTag).toEqual(['safety', 'alert']);
    });

    it('should set hasMention from mentionUids', () => {
      const refs = buildPostRefs(userId, true, [], ['uid1', 'uid2']);
      expect(refs.hasMention).toEqual(['uid1', 'uid2']);
    });
  });

  describe('social interaction refs', () => {
    it('should initialize all social arrays as empty', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasFollower).toEqual([]);
      expect(refs.hasSharer).toEqual([]);
      expect(refs.hasLiker).toEqual([]);
      expect(refs.hasSecretLiker).toEqual([]);
      expect(refs.hasAnonymousLiker).toEqual([]);
      expect(refs.hasReviewer).toEqual([]);
      expect(refs.hasBeenViewedBy).toEqual([]);
      expect(refs.hasFlair).toEqual([]);
      expect(refs.hasSupporter).toEqual([]);
      expect(refs.hasComments).toEqual([]);
      expect(refs.hasCommenter).toEqual([]);
      expect(refs.hasQuote).toEqual([]);
      expect(refs.hasQuoter).toEqual([]);
      expect(refs.hasAnnotation).toEqual([]);
      expect(refs.hasAnnotator).toEqual([]);
      expect(refs.hasRepost).toEqual([]);
      expect(refs.hasReposter).toEqual([]);
      expect(refs.hasRelated).toEqual([]);
    });
  });
});
```

### 5. Write tests for createPostEntity

```typescript
describe('createPostEntity', () => {
  const userId = 'abc123def456';
  const dto = {
    title: 'Safety Alert',
    content: 'Watch out for suspicious activity on Main St',
    isPublic: true,
  };
  const processed = {
    hashtags: ['safety', 'alert'],
    mentions: ['alice123'],
    urls: ['https://example.com'],
    category: 'safety' as const,
  };

  it('should set type to "post"', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.type).toBe('post');
  });

  it('should map title to properties.displayName', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.properties.displayName).toBe('Safety Alert');
  });

  it('should map content to properties.mainContent', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.properties.mainContent).toBe(dto.content);
  });

  it('should set properties.tags from processed hashtags', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.properties.tags).toEqual(['safety', 'alert']);
  });

  it('should set properties.mentions from processed mentions', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.properties.mentions).toEqual(['alice123']);
  });

  it('should build correct refs', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.refs.hasViewer).toEqual(['@public']);
    expect(entity.refs.hasOwner).toEqual([`@uid:${userId}`]);
    expect(entity.refs.hasTag).toEqual(['safety', 'alert']);
  });

  it('should initialize stats with zeros', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.stats.viewers).toBe(0);
    expect(entity.stats.followers).toBe(0);
    expect(entity.stats.likers).toBe(0);
    expect(entity.stats.comments).toBe(0);
    expect(entity.stats.views).toBe(0);
  });

  it('should set stats.tags to hashtag count', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.stats.tags).toBe(2);
  });

  it('should set timestamps', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.timestamps.createdAt).toBeTruthy();
    expect(entity.timestamps.updatedAt).toBeTruthy();
    expect(entity.timestamps.createdAt).toBe(entity.timestamps.updatedAt);
  });

  it('should build search text from title, content, and hashtags', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.search).toContain('Safety Alert');
    expect(entity.search).toContain(dto.content);
    expect(entity.search).toContain('safety');
  });

  it('should set isPublic from dto', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.isPublic).toBe(true);
  });

  it('should set isPublished to true', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.isPublished).toBe(true);
  });
});
```

### 6. Write tests verifying @uid: format throughout

```typescript
describe('semantic ID format', () => {
  it('should use @uid: prefix for all user ID refs', () => {
    const userId = 'testuser123';
    const refs = buildPostRefs(userId, true, [], []);
    const expectedId = `@uid:${userId}`;

    // All user-referencing arrays should use @uid: format
    expect(refs.hasOwner[0]).toBe(expectedId);
    expect(refs.hasAuthor[0]).toBe(expectedId);
    expect(refs.hasCreator[0]).toBe(expectedId);
    expect(refs.hasCollaborator[0]).toBe(expectedId);
    expect(refs.hasEditPermissions[0]).toBe(expectedId);
    expect(refs.hasArchivePermissions[0]).toBe(expectedId);
    expect(refs.hasUpdateViewersPermissions[0]).toBe(expectedId);
    expect(refs.hasConfigurePropertiesPermissions[0]).toBe(expectedId);
  });

  it('should use @public for public post visibility', () => {
    const refs = buildPostRefs('user1', true, [], []);
    expect(refs.hasViewer).toEqual(['@public']);
  });

  it('should use @uid: for private post visibility', () => {
    const refs = buildPostRefs('user1', false, [], []);
    expect(refs.hasViewer).toEqual(['@uid:user1']);
  });
});
```

---

## Verification

- [ ] `buildPostRefs` returns an object with all 28 `ContentEntityRefs` fields
- [ ] Public posts: `hasViewer` is `["@public"]`
- [ ] Private posts: `hasViewer` is `["@uid:{userId}"]`
- [ ] `hasOwner`, `hasAuthor`, `hasCreator`, `hasCollaborator` all contain `["@uid:{userId}"]`
- [ ] All permission arrays (`hasEditPermissions`, `hasArchivePermissions`, `hasUpdateViewersPermissions`, `hasConfigurePropertiesPermissions`) contain `["@uid:{userId}"]`
- [ ] `hasTag` contains the passed hashtags array
- [ ] `hasMention` contains the passed mentionUids array
- [ ] All 18 social interaction arrays are initialized as empty `[]`
- [ ] `createPostEntity` returns a `DbPost` with `type: "post"`
- [ ] `createPostEntity` maps `dto.title` to `properties.displayName`
- [ ] `createPostEntity` maps `dto.content` to `properties.mainContent`
- [ ] `createPostEntity` sets `properties.tags` from processed hashtags
- [ ] `createPostEntity` sets `properties.mentions` from processed mentions
- [ ] `createPostEntity` initializes all numeric stats to 0 (except `stats.tags`)
- [ ] `createPostEntity` sets both `createdAt` and `updatedAt` timestamps
- [ ] `createPostEntity` builds search text containing title, content, and hashtags
- [ ] All semantic IDs use `@uid:{firebaseUid}` format (no username-based IDs)
- [ ] All tests pass (`npm test`)
- [ ] File compiles without TypeScript errors (`npm run typecheck`)

---

## Expected Output

**File Structure**:
```
src/lib/creators/
├── post-creators.ts         # buildPostRefs, createPostEntity
└── post-creators.spec.ts    # Comprehensive tests
```

**Key Exports**:
- `buildPostRefs(userId: string, isPublic: boolean, hashtags: string[], mentionUids: string[]): ContentEntityRefs`
- `createPostEntity(dto: CreatePostDto, userId: string, processed: ProcessedContent): DbPost`

---

## Common Issues and Solutions

### Issue 1: Missing refs fields
**Symptom**: TypeScript error about missing properties on ContentEntityRefs
**Solution**: Ensure all 28 fields are present. Count: 6 from SearchEntityRefs + 22 from ContentEntityRefs extension = 28 total. Cross-reference against the design doc.

### Issue 2: Wrong semantic ID format
**Symptom**: Permission checks fail in mappers because ID format does not match
**Solution**: Always use `@uid:${userId}` with the template literal. Never use `@/${username}` or plain usernames. The `@uid:` prefix is a literal string, not a variable.

### Issue 3: Timestamp format inconsistency
**Symptom**: Dates stored in different formats across entities
**Solution**: Always use `new Date().toISOString()` for consistent ISO 8601 format.

---

## Resources

- `agent/design/local.content-entity-model.md`: Exact refs assignment specification (Post Creation -- Refs Assignment section)
- `agent/design/local.goodneighbor-core.md`: Content processing pipeline overview

---

## Notes

- The `id` field on DbPost is set to an empty string by `createPostEntity`. The actual ID is assigned by Firestore when the document is written. The calling service is responsible for setting the ID after the Firestore write.
- `mentionUids` in `buildPostRefs` are already-resolved Firebase UIDs, not @username strings. The resolution from @username to UID happens at a higher level (the API route or content service) before calling buildPostRefs.
- The `search` field is a concatenation of searchable text for Algolia. It should include title, content, and hashtags. It does NOT include the semantic IDs from refs -- those are indexed separately as facets.
- The `stats.tags` field is initialized to the hashtag count, unlike other stats that start at 0. This is because tags are known at creation time.

---

**Next Task**: [Task 13: Feed Creators](./task-13-feed-creators.md)
**Related Design Docs**: [Content Entity Model](../../design/local.content-entity-model.md)
**Estimated Completion Date**: TBD
