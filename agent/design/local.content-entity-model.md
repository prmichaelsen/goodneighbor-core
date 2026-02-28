# Content Entity & Permission Model

**Concept**: The refs-based permission system and unified search collection that form the architectural core of goodneighbor
**Created**: 2026-02-28
**Status**: Design Specification

---

## Overview

Every content entity in goodneighbor (posts, feeds, comments, submissions) lives in a single polymorphic Firestore collection (`goodneighbor.search`) and carries a `refs` object — arrays of semantic IDs that control visibility, ownership, editing rights, and social relationships. This document specifies the exact type hierarchy, semantic ID format, and permission logic to port into goodneighbor-core.

**Key discovery**: The base types already exist in the npm package `@prmichaelsen/goodneighbor-types` (v1.6.0). goodneighbor-core should re-export and extend these types, or port them directly if we want to own them.

---

## Problem Statement

The refs model is the most complex and central abstraction in goodneighbor. It controls:
- Who can **see** content (hasViewer)
- Who can **edit/delete** content (hasEditPermissions, hasArchivePermissions)
- What **tags and mentions** are associated (hasTag, hasMention)
- Social relationships like **followers, likers, commenters** (hasFollower, hasLiker, hasCommenter)
- Algolia **faceted search filtering** at query time

Getting this wrong breaks both the permission model and search. It must be ported precisely.

---

## Solution

Port the three-tier refs hierarchy exactly as defined in the source, with branded semantic IDs for type safety.

---

## Implementation

### Type Hierarchy

```
SearchEntity
  └── SearchEntityRefs          (6 permission arrays)
        └── ContentEntityRefs   (extends: +22 social/content arrays)
              └── FeedEntityRefs (extends: +7 feed-specific arrays)
```

### SearchEntityRefs (Base)

```typescript
export interface SearchEntityRefs {
  hasOwner: string[];
  hasViewer: string[];
  hasEditPermissions: string[];
  hasArchivePermissions: string[];
  hasUpdateViewersPermissions: string[];
  hasConfigurePropertiesPermissions: string[];
}
```

### ContentEntityRefs (Posts, Comments, Reviews)

```typescript
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

### FeedEntityRefs (Feeds only)

```typescript
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

### Semantic ID Format

- `@public` — Public visibility marker (system token, unchanged)
- `@uid:{firebaseUid}` — Specific user (e.g., `@uid:abc123def456`). Uses Firebase UID, not username.
- Tags: plain strings without prefix (e.g., `["safety", "alert"]`)
- Mentions in `refs.hasMention`: Firebase UIDs resolved at creation time (e.g., `["abc123", "def456"]`). Display text in post body keeps `@username` for readability.

**Why UIDs instead of usernames**: Username-based semantic IDs (`@/{username}`) create a massive fan-out problem on username changes — every document referencing that user would need updating. UID-based IDs are immutable, so username changes only update the profile document.

### Entity Hierarchy

```typescript
// Base entity stored in the SEARCH collection
export interface SearchEntity {
  id: string;
  type: SearchEntityType; // "post" | "feed" | "comment" | "feed_submission" | ...
  name: string;
}

export interface ContentEntity extends SearchEntity {
  search: string;                         // Concatenated searchable text for Algolia
  refs: ContentEntityRefs;
  isPublic: boolean;
  isPublished: boolean;
  timestamps: { createdAt: string; updatedAt: string };
  metadata: Record<string, any>;
  stats: EntityStats;
  properties: ContentEntityProperties;
}

export interface ContentEntityProperties {
  displayName: string;    // Title for posts, name for feeds
  mainContent: string;    // Body content
  tags: string[];
  mentions: string[];
}
```

### DbPost

```typescript
export interface DbPost extends ContentEntity {
  type: "post";
}
```

Field mapping from CreatePostDto:
- `title` → `properties.displayName`
- `content` → `properties.mainContent`
- `tags` → `refs.hasTag` and `properties.tags`
- `mentions` → `refs.hasMention` and `properties.mentions`

### DbFeed

```typescript
export interface DbFeed extends ContentEntity {
  type: "feed";
  subtype: "user" | "feed" | "dynamic" | "list" | "board";
  parentFeed?: string;
  childrenFeeds: string[];
  refs: FeedEntityRefs;
  properties: FeedProperties;
  behavior: FeedBehavior;
}

export interface FeedProperties extends ContentEntityProperties {
  rules: string[];
}

export interface FeedBehavior {
  submissionModels: string[];
  approvalModels: string[];
  aggregationRules?: AggregationRule[];
  ownershipModels: string[];
  automatedRules: string[];
  contentModel: string[];
  flair: string[];
}
```

### DbFeedSubmission

```typescript
export interface DbFeedSubmission extends SearchEntity {
  type: "feed_submission";
  feedId: string;
  postId: string;
  createdBy: string;
  status: "pending" | "approved" | "rejected" | "auto_approved";
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  autoApproveReason?: string;
  rejectionReason?: string;
}
```

### EntityStats

```typescript
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
```

### Post Creation — Refs Assignment

When a post is created, refs are populated as:

```typescript
const refs: ContentEntityRefs = {
  // Visibility
  hasViewer: isPublic ? ["@public"] : [`@uid:${userId}`],

  // Ownership & authoring
  hasOwner: [`@uid:${userId}`],
  hasAuthor: [`@uid:${userId}`],
  hasCreator: [`@uid:${userId}`],
  hasCollaborator: [`@uid:${userId}`],

  // Permissions (initially only author)
  hasEditPermissions: [`@uid:${userId}`],
  hasArchivePermissions: [`@uid:${userId}`],
  hasUpdateViewersPermissions: [`@uid:${userId}`],
  hasConfigurePropertiesPermissions: [`@uid:${userId}`],

  // Content associations
  hasTag: hashtags,
  hasMention: mentionUids, // UIDs resolved from @username at creation time

  // Social (initialized empty, populated as users interact)
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
```

### Feed Creation — Additional Refs

Feeds add moderation and submit permissions:

```typescript
const feedRefs: FeedEntityRefs = {
  ...postRefs, // all ContentEntityRefs fields
  hasModerator: [`@uid:${userId}`],
  hasApprover: [`@uid:${userId}`],
  hasSubmitPermissions: isPublic ? ["@public"] : [`@uid:${userId}`],
  hasConfigureBehaviorPermissions: [`@uid:${userId}`],
  hasMember: [],
  hasSubmission: [],
  hasRejected: [],
};
```

### Permission Checks in Mappers

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

### Comment Creation — Parent Refs Update

When a comment is created, the parent entity's refs are updated:

```typescript
await parentRef.update({
  "refs.hasComments": arrayUnion(commentId),
  "refs.hasCommenter": arrayUnion(`@uid:${authorId}`),
  "stats.comments": increment(1),
});
```

---

## Benefits

- **Single permission model** for all entity types via refs arrays
- **Algolia-compatible**: refs arrays map directly to facetable attributes for permission-filtered search
- **Extensible**: New permission types are just new arrays on the refs interface
- **Auditable**: Every permission grants is explicit in the refs object

---

## Trade-offs

- **Array growth**: High-interaction posts accumulate large hasLiker/hasCommenter arrays. Algolia facet limits may apply.
- **Denormalization**: Permissions are stored per-entity, not in a central ACL table. Changes (e.g., user deletion) require fan-out updates.
- **Semantic ID format**: The `@/` prefix convention must be consistently applied or permission checks silently fail.

---

## Dependencies

- `@prmichaelsen/goodneighbor-types` (v1.6.0) — Existing type definitions (or port them directly)
- Firebase Firestore `arrayUnion` / `increment` for atomic refs updates

---

## Testing Strategy

- **Unit tests**: Verify `buildPostRefs()` and `createPostEntity()` produce correct refs for public/private posts
- **Unit tests**: Verify mapper permission checks (canEdit, canDelete, isLiked) with various userContext scenarios
- **Unit tests**: Verify feed refs include moderation permissions
- **Integration tests**: Verify Firestore `arrayUnion` updates propagate correctly

---

## Migration Path

1. Port the three refs interfaces (SearchEntityRefs → ContentEntityRefs → FeedEntityRefs)
2. Port entity interfaces (ContentEntity, DbPost, DbFeed, DbFeedSubmission)
3. Port creator functions (buildPostRefs, createPostEntity, createFeedEntity)
4. Port mapper functions (mapDbPostToViewModel, mapDbFeedToViewModel)
5. Port EntityStats interface

---

## Future Considerations

- **Array size limits**: May need to cap hasLiker/hasBeenViewedBy and use counts instead for high-traffic posts
- **Batch permission updates**: Fan-out service for user deletion/rename propagation across refs
- **Role-based refs**: Could add `hasAdmin`, `hasContributor` for more granular roles

---

**Status**: Design Specification
**Recommendation**: Port types first, then creators/mappers
**Related Documents**:
- `agent/design/local.goodneighbor-core.md` — Overall architecture
- `agent/design/local.search-architecture.md` — How refs integrate with Algolia search
