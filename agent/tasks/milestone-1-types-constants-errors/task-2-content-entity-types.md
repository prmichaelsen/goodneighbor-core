# Task 2: Content Entity Types & Refs Hierarchy

**Milestone**: [M1 - Types, Constants & Errors](../../milestones/milestone-1-types-constants-errors.md)
**Estimated Time**: 4 hours
**Dependencies**: Task 1 (Branded IDs, common types)
**Status**: Not Started

---

## Objective

Port the three-tier refs hierarchy (SearchEntityRefs -> ContentEntityRefs -> FeedEntityRefs), all entity interfaces (SearchEntity, ContentEntity, DbPost, DbFeed, DbFeedSubmission), and supporting types (EntityStats, ContentEntityProperties, FeedProperties, FeedBehavior, AggregationRule, SearchEntityType). All semantic IDs in refs arrays use the `@uid:{firebaseUid}` format. The implementation must exactly match the design specification in `local.content-entity-model.md`.

---

## Context

The refs-based permission system is the most complex and central abstraction in goodneighbor. Every content entity (posts, feeds, comments, submissions) carries a `refs` object -- arrays of semantic IDs that control visibility, ownership, editing rights, and social relationships. These refs arrays map directly to Algolia facetable attributes, enabling permission-filtered search.

The hierarchy is:
- **SearchEntityRefs** (base): 6 permission arrays controlling ownership and access
- **ContentEntityRefs** (extends SearchEntityRefs): adds 22 social/content arrays for likes, comments, tags, mentions, etc.
- **FeedEntityRefs** (extends ContentEntityRefs): adds 7 feed-specific arrays for moderation, membership, submissions

Getting the array counts and field names exactly right is critical. Incorrect refs break both the permission model and Algolia search filtering.

This task depends on Task 1 because entity interfaces use the branded ID types and Timestamps utility type.

---

## Steps

### 1. Create content-entity.types.ts with SearchEntityRefs

Create `src/types/content-entity.types.ts` starting with the base refs interface:

```typescript
import { Timestamps } from './utils.types';

/**
 * Search entity type discriminator.
 * Identifies the kind of entity stored in the goodneighbor.search collection.
 */
export type SearchEntityType = 'post' | 'feed' | 'comment' | 'feed_submission';

/**
 * Base refs for any searchable entity.
 * Controls ownership, visibility, and permission grants.
 * All user-scoped values use the @uid:{firebaseUid} format.
 * The @public token grants visibility to all users.
 *
 * 6 arrays total.
 */
export interface SearchEntityRefs {
  hasOwner: string[];
  hasViewer: string[];
  hasEditPermissions: string[];
  hasArchivePermissions: string[];
  hasUpdateViewersPermissions: string[];
  hasConfigurePropertiesPermissions: string[];
}
```

### 2. Add ContentEntityRefs

Extend SearchEntityRefs with 22 additional social/content arrays:

```typescript
/**
 * Refs for content entities (posts, comments, reviews).
 * Extends SearchEntityRefs with social interaction and content association arrays.
 *
 * Adds 22 arrays on top of SearchEntityRefs (6), for 28 total.
 */
export interface ContentEntityRefs extends SearchEntityRefs {
  hasFollower: string[];
  hasSharer: string[];
  hasTag: string[];
  hasMention: string[];
  hasLiker: string[];
  hasSecretLiker: string[];
  hasAnonymousLiker: string[];
  hasReviewer: string[];
  hasCreator: string[];
  hasBeenViewedBy: string[];
  hasFlair: string[];
  hasSupporter: string[];
  hasComments: string[];
  hasCommenter: string[];
  hasQuote: string[];
  hasQuoter: string[];
  hasAnnotation: string[];
  hasAnnotator: string[];
  hasRepost: string[];
  hasReposter: string[];
  hasAuthor: string[];
  hasCollaborator: string[];
  hasRelated: string[];
}
```

Note: The design doc lists 22 additional fields but `hasRelated` brings the count to 23 additional fields. Cross-reference the design doc carefully during implementation to get the exact count.

### 3. Add FeedEntityRefs

Extend ContentEntityRefs with 7 feed-specific arrays:

```typescript
/**
 * Refs for feed entities.
 * Extends ContentEntityRefs with moderation, membership, and submission arrays.
 *
 * Adds 7 arrays on top of ContentEntityRefs.
 */
export interface FeedEntityRefs extends ContentEntityRefs {
  hasModerator: string[];
  hasMember: string[];
  hasApprover: string[];
  hasSubmitPermissions: string[];
  hasConfigureBehaviorPermissions: string[];
  hasSubmission: string[];
  hasRejected: string[];
}
```

### 4. Add SearchEntity and ContentEntity Base Interfaces

```typescript
/**
 * Base entity stored in the goodneighbor.search Firestore collection.
 * All searchable entities share this minimal shape.
 */
export interface SearchEntity {
  id: string;
  type: SearchEntityType;
  name: string;
}

/**
 * Content entity properties common to posts, feeds, and other content types.
 */
export interface ContentEntityProperties {
  displayName: string;
  mainContent: string;
  tags: string[];
  mentions: string[];
}

/**
 * Statistics counters for a content entity.
 * Updated atomically via Firestore increment operations.
 */
export interface EntityStats {
  viewers: number;
  followers: number;
  sharers: number;
  likers: number;
  comments: number;
  views: number;
  reposts: number;
  quotes: number;
  annotations: number;
  tags: number;
}

/**
 * Full content entity with refs, stats, properties, and metadata.
 * Extends SearchEntity with the full content model.
 */
export interface ContentEntity extends SearchEntity {
  search: string;
  refs: ContentEntityRefs;
  isPublic: boolean;
  isPublished: boolean;
  timestamps: Timestamps;
  metadata: Record<string, any>;
  stats: EntityStats;
  properties: ContentEntityProperties;
}
```

### 5. Add DbPost, DbFeed, DbFeedSubmission

```typescript
/**
 * Post entity as stored in Firestore.
 * Type discriminator is "post".
 */
export interface DbPost extends ContentEntity {
  type: 'post';
}

/**
 * Feed subtype discriminator.
 */
export type FeedSubtype = 'user' | 'feed' | 'dynamic' | 'list' | 'board';

/**
 * Feed-specific content properties.
 */
export interface FeedProperties extends ContentEntityProperties {
  rules: string[];
}

/**
 * Feed behavior configuration.
 * Controls how content is submitted, approved, and aggregated within a feed.
 */
export interface FeedBehavior {
  submissionModels: string[];
  approvalModels: string[];
  aggregationRules?: AggregationRule[];
  ownershipModels: string[];
  automatedRules: string[];
  contentModel: string[];
  flair: string[];
}

/**
 * Aggregation rule for feed content organization.
 */
export interface AggregationRule {
  [key: string]: any;
}

/**
 * Feed entity as stored in Firestore.
 * Type discriminator is "feed".
 * Uses FeedEntityRefs (the most permissive refs tier) for moderation support.
 */
export interface DbFeed extends ContentEntity {
  type: 'feed';
  subtype: FeedSubtype;
  parentFeed?: string;
  childrenFeeds: string[];
  refs: FeedEntityRefs;
  properties: FeedProperties;
  behavior: FeedBehavior;
}

/**
 * Feed submission status.
 */
export type FeedSubmissionStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

/**
 * Feed submission entity as stored in Firestore.
 * Represents a post submitted to a feed for moderation review.
 * Type discriminator is "feed_submission".
 */
export interface DbFeedSubmission extends SearchEntity {
  type: 'feed_submission';
  feedId: string;
  postId: string;
  createdBy: string;
  status: FeedSubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  autoApproveReason?: string;
  rejectionReason?: string;
}
```

### 6. Update types/index.ts Barrel Export

Add the content-entity types to the barrel export:

```typescript
export * from './common.types';
export * from './result.types';
export * from './utils.types';
export * from './content-entity.types';
```

### 7. Write Unit Tests

Create `src/types/__tests__/content-entity.types.spec.ts`:

```typescript
describe('Content Entity Types', () => {
  it('should verify SearchEntityRefs has exactly 6 fields', () => {
    // This is a structural test -- verify at compile time
    // that the interface has the expected fields
    const refs: SearchEntityRefs = {
      hasOwner: [],
      hasViewer: [],
      hasEditPermissions: [],
      hasArchivePermissions: [],
      hasUpdateViewersPermissions: [],
      hasConfigurePropertiesPermissions: [],
    };
    expect(Object.keys(refs)).toHaveLength(6);
  });

  it('should verify EntityStats has 10 counter fields', () => {
    const stats: EntityStats = {
      viewers: 0, followers: 0, sharers: 0, likers: 0,
      comments: 0, views: 0, reposts: 0, quotes: 0,
      annotations: 0, tags: 0,
    };
    expect(Object.keys(stats)).toHaveLength(10);
  });

  it('should verify SearchEntityType is a valid union', () => {
    const types: SearchEntityType[] = ['post', 'feed', 'comment', 'feed_submission'];
    expect(types).toHaveLength(4);
  });
});
```

---

## Verification

- [ ] `src/types/content-entity.types.ts` exists and compiles without errors
- [ ] SearchEntityRefs has exactly 6 arrays: hasOwner, hasViewer, hasEditPermissions, hasArchivePermissions, hasUpdateViewersPermissions, hasConfigurePropertiesPermissions
- [ ] ContentEntityRefs extends SearchEntityRefs and adds all social/content arrays from the design doc
- [ ] FeedEntityRefs extends ContentEntityRefs and adds 7 arrays: hasModerator, hasMember, hasApprover, hasSubmitPermissions, hasConfigureBehaviorPermissions, hasSubmission, hasRejected
- [ ] SearchEntity, ContentEntity, DbPost, DbFeed, DbFeedSubmission interfaces match the design doc exactly
- [ ] EntityStats has 10 counter fields
- [ ] SearchEntityType is `"post" | "feed" | "comment" | "feed_submission"`
- [ ] FeedSubtype is `"user" | "feed" | "dynamic" | "list" | "board"`
- [ ] FeedSubmissionStatus is `"pending" | "approved" | "rejected" | "auto_approved"`
- [ ] DbFeed.refs is typed as FeedEntityRefs (not ContentEntityRefs)
- [ ] types/index.ts re-exports content-entity.types
- [ ] All unit tests pass
- [ ] TypeScript compiles without errors

---

## Expected Output

**File Structure**:
```
src/types/
├── __tests__/
│   ├── common.types.spec.ts        # From Task 1
│   ├── result.types.spec.ts        # From Task 1
│   └── content-entity.types.spec.ts # NEW
├── index.ts                        # UPDATED with content-entity export
├── common.types.ts                 # From Task 1
├── result.types.ts                 # From Task 1
├── utils.types.ts                  # From Task 1
└── content-entity.types.ts         # NEW: Refs hierarchy, entities, stats
```

**Key Files Created/Updated**:
- `src/types/content-entity.types.ts`: Three-tier refs hierarchy, entity interfaces, EntityStats, supporting types
- `src/types/index.ts`: Updated barrel export with content-entity types

---

## Common Issues and Solutions

### Issue 1: ContentEntityRefs array count mismatch
**Symptom**: Review shows more or fewer than expected arrays in ContentEntityRefs
**Solution**: Carefully cross-reference each field against the design doc in `local.content-entity-model.md`. The design doc lists the canonical set. Count the fields in the `extends` portion only (do not count inherited SearchEntityRefs fields).

### Issue 2: DbFeed refs typed as ContentEntityRefs instead of FeedEntityRefs
**Symptom**: Feed-specific permission checks fail at compile time (e.g., `dbFeed.refs.hasModerator` not found)
**Solution**: DbFeed must explicitly override `refs: FeedEntityRefs` to use the feed-tier refs. ContentEntity's default `refs: ContentEntityRefs` is too narrow for feeds.

### Issue 3: AggregationRule type too permissive
**Symptom**: `Record<string, any>` provides no type safety
**Solution**: This is intentional for now. The exact AggregationRule shape is complex and under-documented in the source. Start with a permissive type and tighten it when porting feed behavior logic in later milestones.

---

## Resources

- Design doc: `agent/design/local.content-entity-model.md` -- The canonical source for all refs fields and entity interfaces
- Design doc: `agent/design/local.goodneighbor-core.md` -- Overall architecture context
- `@prmichaelsen/goodneighbor-types` v1.6.0 -- Existing type definitions for cross-reference

---

## Notes

- The refs arrays contain strings, not branded ID types. This is intentional: refs contain mixed formats (`@public`, `@uid:{uid}`, plain hashtag strings) that cannot all be branded.
- The `search` field on ContentEntity is a concatenated text blob used for Algolia full-text search. Its content is built by the content processing pipeline in Milestone 3.
- The `metadata` field on ContentEntity is `Record<string, any>` -- intentionally loose for now.
- DbFeedSubmission extends SearchEntity (not ContentEntity) because submissions do not have full content properties, refs, or stats.
- Count carefully: SearchEntityRefs (6) + ContentEntityRefs additions (22-23) + FeedEntityRefs additions (7). The exact count of ContentEntityRefs additions should be verified against the design doc.

---

**Next Task**: [Task 3: Domain Types](./task-3-domain-types.md)
**Related Design Docs**: `agent/design/local.content-entity-model.md`
**Estimated Completion Date**: TBD
