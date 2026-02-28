# Task 13: Feed Creators

**Milestone**: [M3 - Content Processing & Entity Builders](../../milestones/milestone-3-content-processing.md)
**Estimated Time**: 2 hours
**Dependencies**: Task 12 (post creators pattern, buildPostRefs as composition base)
**Status**: Not Started

---

## Objective

Implement `createFeedEntity(dto, userId)` which builds a complete `DbFeed` document ready for Firestore insertion. Feeds use `FeedEntityRefs` which extends `ContentEntityRefs` with 7 additional moderation and membership fields: `hasModerator`, `hasMember`, `hasApprover`, `hasSubmitPermissions`, `hasConfigureBehaviorPermissions`, `hasSubmission`, and `hasRejected`.

---

## Context

Feeds are the organizational containers in goodneighbor -- they represent communities, boards, lists, and dynamic content streams. A feed entity has richer permissions than a post because it needs to control:
- Who can **moderate** content (hasModerator)
- Who can **approve** submissions (hasApprover)
- Who can **submit** content to the feed (hasSubmitPermissions)
- Who can **configure** feed behavior (hasConfigureBehaviorPermissions)
- Feed **membership** (hasMember)
- Pending and rejected submissions tracking (hasSubmission, hasRejected)

The `FeedEntityRefs` interface extends `ContentEntityRefs` (28 fields from Task 12) with 7 additional fields, totaling 35 refs arrays.

Key design rules from the content-entity-model design doc:
- `hasModerator`: initially `["@uid:{userId}"]` (creator is first moderator)
- `hasApprover`: initially `["@uid:{userId}"]` (creator is first approver)
- `hasSubmitPermissions`: `["@public"]` for public feeds, `["@uid:{userId}"]` for private feeds
- `hasConfigureBehaviorPermissions`: initially `["@uid:{userId}"]`
- `hasMember`, `hasSubmission`, `hasRejected`: initialized as empty arrays

Additionally, `DbFeed` has extra fields beyond `ContentEntity`:
- `subtype`: "user" | "feed" | "dynamic" | "list" | "board"
- `parentFeed`: optional parent feed ID
- `childrenFeeds`: array of child feed IDs
- `behavior`: `FeedBehavior` object with submission models, approval models, etc.
- `properties`: `FeedProperties` extending `ContentEntityProperties` with `rules`

---

## Steps

### 1. Create the feed-creators module

Create `src/lib/creators/feed-creators.ts`:

```typescript
// src/lib/creators/feed-creators.ts

import { FeedEntityRefs } from '../../types/content-entity.types';
import { DbFeed, CreateFeedDto, FeedBehavior, FeedProperties } from '../../types/feed.types';
import { EntityStats } from '../../types/content-entity.types';
import { buildPostRefs } from './post-creators';
```

### 2. Implement buildFeedRefs (internal helper)

Build the feed-specific refs by composing on top of `buildPostRefs`:

```typescript
/**
 * Build FeedEntityRefs for a new feed.
 *
 * Extends ContentEntityRefs (from buildPostRefs) with 7 feed-specific fields:
 * - hasModerator: creator is initial moderator
 * - hasApprover: creator is initial approver
 * - hasSubmitPermissions: @public for public feeds, @uid:{userId} for private
 * - hasConfigureBehaviorPermissions: creator only
 * - hasMember, hasSubmission, hasRejected: empty arrays
 *
 * @param userId - Firebase UID of the feed creator
 * @param isPublic - Whether the feed is publicly visible
 * @param hashtags - Hashtags associated with the feed
 * @returns Complete FeedEntityRefs with all 35 fields
 */
function buildFeedRefs(
  userId: string,
  isPublic: boolean,
  hashtags: string[],
): FeedEntityRefs {
  const baseRefs = buildPostRefs(userId, isPublic, hashtags, []);
  const userSemId = `@uid:${userId}`;

  return {
    ...baseRefs,
    hasModerator: [userSemId],
    hasApprover: [userSemId],
    hasSubmitPermissions: isPublic ? ["@public"] : [userSemId],
    hasConfigureBehaviorPermissions: [userSemId],
    hasMember: [],
    hasSubmission: [],
    hasRejected: [],
  };
}
```

### 3. Implement createFeedEntity

```typescript
/**
 * Create a complete DbFeed entity ready for Firestore insertion.
 *
 * Builds FeedEntityRefs with moderation permissions, initializes
 * feed behavior and properties, and sets all required fields.
 *
 * @param dto - Feed creation DTO from the client
 * @param userId - Firebase UID of the feed creator
 * @returns Complete DbFeed ready for Firestore write
 */
export function createFeedEntity(
  dto: CreateFeedDto,
  userId: string,
): DbFeed {
  const now = new Date().toISOString();
  const hashtags = dto.tags || [];
  const refs = buildFeedRefs(userId, dto.isPublic, hashtags);

  const searchParts = [
    dto.name,
    dto.description,
    ...hashtags,
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
    tags: hashtags.length,
  };

  const behavior: FeedBehavior = {
    submissionModels: dto.submissionModels || ['direct'],
    approvalModels: dto.approvalModels || ['auto'],
    ownershipModels: dto.ownershipModels || ['single'],
    automatedRules: [],
    contentModel: [],
    flair: [],
  };

  const properties: FeedProperties = {
    displayName: dto.name || '',
    mainContent: dto.description || '',
    tags: hashtags,
    mentions: [],
    rules: dto.rules || [],
  };

  return {
    id: '', // Set by Firestore on write
    type: 'feed',
    subtype: dto.subtype || 'feed',
    name: dto.name || '',
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
    properties,
    behavior,
    childrenFeeds: [],
  };
}
```

### 4. Write tests for buildFeedRefs behavior

Create `src/lib/creators/feed-creators.spec.ts`:

```typescript
import { createFeedEntity } from './feed-creators';

describe('createFeedEntity', () => {
  const userId = 'feedcreator123';

  describe('feed-specific refs for public feeds', () => {
    const dto = {
      name: 'Neighborhood Watch',
      description: 'Community safety feed',
      isPublic: true,
      subtype: 'feed' as const,
    };

    it('should set hasModerator to creator', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasModerator).toEqual([`@uid:${userId}`]);
    });

    it('should set hasApprover to creator', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasApprover).toEqual([`@uid:${userId}`]);
    });

    it('should set hasSubmitPermissions to @public for public feeds', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasSubmitPermissions).toEqual(['@public']);
    });

    it('should set hasConfigureBehaviorPermissions to creator', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasConfigureBehaviorPermissions).toEqual([`@uid:${userId}`]);
    });

    it('should initialize hasMember as empty', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasMember).toEqual([]);
    });

    it('should initialize hasSubmission as empty', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasSubmission).toEqual([]);
    });

    it('should initialize hasRejected as empty', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasRejected).toEqual([]);
    });
  });

  describe('feed-specific refs for private feeds', () => {
    const dto = {
      name: 'Private Board',
      description: 'Invite only',
      isPublic: false,
      subtype: 'board' as const,
    };

    it('should set hasSubmitPermissions to @uid:{userId} for private feeds', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasSubmitPermissions).toEqual([`@uid:${userId}`]);
    });

    it('should set hasViewer to @uid:{userId} for private feeds', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasViewer).toEqual([`@uid:${userId}`]);
    });
  });

  describe('inherited ContentEntityRefs', () => {
    const dto = {
      name: 'Test Feed',
      description: 'Testing',
      isPublic: true,
      subtype: 'feed' as const,
    };

    it('should inherit all ownership refs from buildPostRefs', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasOwner).toEqual([`@uid:${userId}`]);
      expect(feed.refs.hasAuthor).toEqual([`@uid:${userId}`]);
      expect(feed.refs.hasCreator).toEqual([`@uid:${userId}`]);
    });

    it('should inherit all permission refs from buildPostRefs', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasEditPermissions).toEqual([`@uid:${userId}`]);
      expect(feed.refs.hasArchivePermissions).toEqual([`@uid:${userId}`]);
    });
  });
});
```

### 5. Write tests for feed entity fields

```typescript
describe('feed entity fields', () => {
  const dto = {
    name: 'Neighborhood Watch',
    description: 'Community safety feed',
    isPublic: true,
    subtype: 'feed' as const,
    tags: ['safety', 'community'],
    rules: ['Be respectful', 'No spam'],
  };

  it('should set type to "feed"', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.type).toBe('feed');
  });

  it('should set subtype from dto', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.subtype).toBe('feed');
  });

  it('should set properties.displayName from dto.name', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.properties.displayName).toBe('Neighborhood Watch');
  });

  it('should set properties.mainContent from dto.description', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.properties.mainContent).toBe('Community safety feed');
  });

  it('should set properties.rules from dto', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.properties.rules).toEqual(['Be respectful', 'No spam']);
  });

  it('should set properties.tags from dto.tags', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.properties.tags).toEqual(['safety', 'community']);
  });

  it('should initialize behavior with defaults', () => {
    const simpleDtoWithoutBehavior = {
      name: 'Simple Feed',
      description: 'Basic',
      isPublic: true,
      subtype: 'feed' as const,
    };
    const feed = createFeedEntity(simpleDtoWithoutBehavior, 'user1');
    expect(feed.behavior.submissionModels).toEqual(['direct']);
    expect(feed.behavior.approvalModels).toEqual(['auto']);
    expect(feed.behavior.ownershipModels).toEqual(['single']);
  });

  it('should initialize childrenFeeds as empty', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.childrenFeeds).toEqual([]);
  });

  it('should initialize stats with zeros', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.stats.viewers).toBe(0);
    expect(feed.stats.followers).toBe(0);
    expect(feed.stats.likers).toBe(0);
  });

  it('should set stats.tags to hashtag count', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.stats.tags).toBe(2);
  });

  it('should build search text from name, description, and tags', () => {
    const feed = createFeedEntity(dto, 'user1');
    expect(feed.search).toContain('Neighborhood Watch');
    expect(feed.search).toContain('Community safety feed');
    expect(feed.search).toContain('safety');
  });
});
```

---

## Verification

- [ ] `createFeedEntity` returns a `DbFeed` with `type: "feed"`
- [ ] `createFeedEntity` sets `subtype` from the DTO
- [ ] `refs.hasModerator` is `["@uid:{userId}"]` for the creator
- [ ] `refs.hasApprover` is `["@uid:{userId}"]` for the creator
- [ ] `refs.hasSubmitPermissions` is `["@public"]` for public feeds
- [ ] `refs.hasSubmitPermissions` is `["@uid:{userId}"]` for private feeds
- [ ] `refs.hasConfigureBehaviorPermissions` is `["@uid:{userId}"]`
- [ ] `refs.hasMember` is initialized as `[]`
- [ ] `refs.hasSubmission` is initialized as `[]`
- [ ] `refs.hasRejected` is initialized as `[]`
- [ ] All inherited `ContentEntityRefs` fields are correctly populated (ownership, permissions, social -- 28 fields)
- [ ] Total refs field count is 35 (28 from ContentEntityRefs + 7 feed-specific)
- [ ] `properties.displayName` is set from `dto.name`
- [ ] `properties.mainContent` is set from `dto.description`
- [ ] `properties.rules` is set from `dto.rules`
- [ ] `behavior` is initialized with sensible defaults
- [ ] `childrenFeeds` is initialized as `[]`
- [ ] Stats are initialized with zeros (except `stats.tags`)
- [ ] All tests pass (`npm test`)
- [ ] File compiles without TypeScript errors (`npm run typecheck`)

---

## Expected Output

**File Structure**:
```
src/lib/creators/
├── post-creators.ts         # (from Task 12)
├── post-creators.spec.ts    # (from Task 12)
├── feed-creators.ts         # createFeedEntity (buildFeedRefs internal)
└── feed-creators.spec.ts    # Comprehensive tests
```

**Key Exports**:
- `createFeedEntity(dto: CreateFeedDto, userId: string): DbFeed`

---

## Common Issues and Solutions

### Issue 1: Missing FeedEntityRefs fields
**Symptom**: TypeScript error about missing properties on FeedEntityRefs
**Solution**: Ensure all 7 feed-specific fields are present on top of the 28 inherited ContentEntityRefs fields. Cross-reference: hasModerator, hasMember, hasApprover, hasSubmitPermissions, hasConfigureBehaviorPermissions, hasSubmission, hasRejected.

### Issue 2: Spread operator losing type safety
**Symptom**: `{ ...baseRefs, ...feedFields }` compiles but produces incorrect type
**Solution**: Explicitly annotate the return type as `FeedEntityRefs` to ensure TypeScript checks all required fields.

### Issue 3: CreateFeedDto type mismatch
**Symptom**: DTO fields do not match expected structure
**Solution**: Ensure the `CreateFeedDto` type from Task 3 (feed.types.ts) includes: name, description, isPublic, subtype, tags, rules, submissionModels, approvalModels, ownershipModels. Update the DTO type if needed.

---

## Resources

- `agent/design/local.content-entity-model.md`: Feed Creation -- Additional Refs section, FeedEntityRefs interface, FeedBehavior and FeedProperties interfaces
- Task 12 implementation: buildPostRefs for the composition base

---

## Notes

- `buildFeedRefs` is an internal (non-exported) helper. Only `createFeedEntity` is exported because feeds are always created as complete entities, not as bare refs. If other code needs feed refs separately, it can be exported later.
- The composition pattern (`...buildPostRefs(...)` spread into feed refs) ensures consistency between post and feed ref construction. Changes to the base ContentEntityRefs logic propagate automatically.
- `CreateFeedDto` may include optional behavior configuration (submissionModels, approvalModels, etc.). The creator provides sensible defaults when these are not specified.
- The `parentFeed` field is intentionally omitted from `createFeedEntity` output. Parent-child feed relationships are established through separate API calls, not at creation time.

---

**Next Task**: [Task 14: Post & Feed Mappers](./task-14-entity-mappers.md)
**Related Design Docs**: [Content Entity Model](../../design/local.content-entity-model.md)
**Estimated Completion Date**: TBD
