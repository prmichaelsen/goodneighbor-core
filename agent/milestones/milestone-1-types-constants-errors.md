# Milestone 1: Types, Constants & Errors

**Goal**: Port all domain type definitions, Firestore collection constants, and error hierarchy from goodneighbor into goodneighbor-core
**Duration**: 3-4 days
**Dependencies**: None
**Status**: Not Started

---

## Overview

This milestone establishes the foundational type system for the entire goodneighbor-core library. Every subsequent milestone depends on the types, constants, and error classes defined here. The work involves porting domain types from the goodneighbor Next.js application (and the `@prmichaelsen/goodneighbor-types` v1.6.0 package), defining typed Firestore collection path constants for all 27 goodneighbor collections, and implementing a typed error hierarchy with HTTP status mapping.

Key design decisions carried forward:
- Semantic IDs use `@uid:{firebaseUid}` format (not usernames) to avoid fan-out on username changes.
- `@public` is the sole system visibility token.
- The three-tier refs hierarchy (SearchEntityRefs -> ContentEntityRefs -> FeedEntityRefs) is the central permission model.
- All content entities live in the single polymorphic Firestore collection `goodneighbor.search`.
- Cleanbook types and collections are explicitly excluded.

---

## Deliverables

### 1. Domain Types
- Branded ID types: UserId, PostId, FeedId, CommentId, FeedSubmissionId, SearchEntityId
- Utility types: DeepPartial, Nullable, Optional
- Result<T, E> discriminated union with ok() and err() constructors

### 2. Content Entity Types
- SearchEntityRefs (6 permission arrays)
- ContentEntityRefs (extends SearchEntityRefs with 22 social/content arrays)
- FeedEntityRefs (extends ContentEntityRefs with 7 feed-specific arrays)
- SearchEntity, ContentEntity base interfaces
- DbPost, DbFeed (with subtypes), DbFeedSubmission
- EntityStats, ContentEntityProperties, FeedProperties, FeedBehavior, AggregationRule
- SearchEntityType union type ("post" | "feed" | "comment" | "feed_submission")

### 3. Profile Types
- PublicProfile, PrivateProfile, ProfileFormData
- ProfileBoard, BaseWidget, WidgetType
- 17 widget type configurations

### 4. Post, Feed, Comment, Search & Auth Types
- CreatePostDto, PostViewModel
- CreateFeedDto, FeedViewModel, FeedSubmissionViewModel
- Comment, CommentReply
- AlgoliaSearchParams, SearchResponse, SearchResultItem
- CustomClaims, ServerUser, ServerSession, AuthResult
- PaginatedResult, PaginationOptions

### 5. Collection Constants
- 27 Firestore collection path constants (goodneighbor-scoped only, cleanbook excluded)
- Grouped by category: Profile, Auth, Content, Relationships, Store, System
- Exported as a frozen `as const` object for literal type inference

### 6. Error Hierarchy
- BaseError base class with code, message, and httpStatus fields
- NotFoundError (404), ValidationError (400), UnauthorizedError (401), ForbiddenError (403), ConflictError (409), ExternalServiceError (502)
- ErrorCode enum and error code to HTTP status mapping

---

## Success Criteria

- [ ] All type files compile without TypeScript errors (`npm run typecheck` passes)
- [ ] Branded ID types prevent cross-assignment (PostId not assignable to FeedId)
- [ ] Result type supports both ok() and err() constructors and narrows correctly via discriminant
- [ ] SearchEntityRefs has exactly 6 arrays, ContentEntityRefs adds 22, FeedEntityRefs adds 7
- [ ] Collection constants define exactly 27 paths, all starting with "goodneighbor"
- [ ] No cleanbook types, collections, or related code is present
- [ ] Error hierarchy maps correctly: NotFoundError->404, ValidationError->400, UnauthorizedError->401, ForbiddenError->403, ConflictError->409, ExternalServiceError->502
- [ ] All 6 domain error classes are instanceof BaseError
- [ ] Barrel exports (index.ts) re-export all types, constants, and errors
- [ ] Unit tests pass for branded IDs, Result type, error classes, and collection constants

---

## Key Files to Create

```
src/
├── types/
│   ├── index.ts                    # Barrel export for all types
│   ├── common.types.ts             # Branded IDs (UserId, PostId, FeedId, etc.), factory functions
│   ├── result.types.ts             # Result<T, E> discriminated union (update existing scaffold)
│   ├── utils.types.ts              # DeepPartial, Nullable, Optional (update existing scaffold)
│   ├── content-entity.types.ts     # Refs hierarchy, SearchEntity, ContentEntity, EntityStats
│   ├── profile.types.ts            # PublicProfile, PrivateProfile, ProfileFormData
│   ├── profile-board.types.ts      # ProfileBoard, BaseWidget, 17 widget type configs
│   ├── post.types.ts               # DbPost, CreatePostDto, PostViewModel
│   ├── feed.types.ts               # DbFeed, CreateFeedDto, FeedViewModel, FeedSubmissionViewModel
│   ├── comment.types.ts            # Comment, CommentReply
│   ├── search.types.ts             # AlgoliaSearchParams, SearchResponse, SearchResultItem
│   ├── auth.types.ts               # CustomClaims, ServerUser, ServerSession, AuthResult
│   └── pagination.types.ts         # PaginatedResult, PaginationOptions
├── constants/
│   ├── index.ts                    # Barrel export for constants
│   └── collections.ts             # 27 Firestore collection paths
└── errors/
    ├── index.ts                    # Barrel export for errors (update existing scaffold)
    ├── base.error.ts               # BaseError (update existing scaffold)
    ├── app-errors.ts               # 6 domain error classes (update existing scaffold)
    └── error-codes.ts              # ErrorCode enum, HTTP status map
```

---

## Tasks

1. [Task 1: Branded IDs, Common Types & Utility Types](../tasks/milestone-1-types-constants-errors/task-1-branded-ids-common-types.md) - Create branded ID types, utility types, and Result<T,E> discriminated union
2. [Task 2: Content Entity Types & Refs Hierarchy](../tasks/milestone-1-types-constants-errors/task-2-content-entity-types.md) - Port the three-tier refs hierarchy and all entity interfaces
3. [Task 3: Domain Types (Profile, Post, Feed, Comment, Search, Auth)](../tasks/milestone-1-types-constants-errors/task-3-domain-types.md) - Port all remaining domain types across 8 type files
4. [Task 4: Firestore Collection Constants](../tasks/milestone-1-types-constants-errors/task-4-collection-constants.md) - Define all 27 goodneighbor collection paths as typed constants
5. [Task 5: Error Hierarchy & Error Codes](../tasks/milestone-1-types-constants-errors/task-5-error-hierarchy.md) - Implement error classes and error code to HTTP status mapping

---

## Environment Variables

None required for this milestone. Types, constants, and errors are pure definitions with no runtime configuration dependencies.

---

## Testing Requirements

- [ ] Unit tests for branded ID types: verify factory functions create correct branded types, verify cross-assignment is prevented at type level
- [ ] Unit tests for Result type: verify ok() and err() constructors, verify type narrowing with isOk/isErr
- [ ] Unit tests for collection constants: verify exactly 27 paths exist, verify all paths start with "goodneighbor", verify no cleanbook paths
- [ ] Unit tests for error hierarchy: verify each error class has correct httpStatus, verify instanceof BaseError, verify error codes map correctly
- [ ] Type-level tests: verify TypeScript compiler rejects invalid type assignments (branded IDs, Result narrowing)

---

## Documentation Requirements

- [ ] JSDoc comments on all exported types and interfaces explaining their purpose and usage
- [ ] JSDoc comments on all branded ID factory functions
- [ ] JSDoc comments on error classes documenting when each error type should be used
- [ ] Inline code comments on the refs hierarchy explaining the semantic ID format (`@uid:{firebaseUid}`, `@public`)

---

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Type incompatibility with `@prmichaelsen/goodneighbor-types` v1.6.0 | Medium | Medium | Compare ported types against the npm package; ensure structural compatibility even if we own the types directly |
| Missing or incorrect refs arrays in the hierarchy | High | Low | Cross-reference against the content-entity-model design doc; count arrays at each tier (6, 22, 7) |
| Cleanbook types accidentally ported | Low | Medium | Review each type file against the exclusion list; no clean/appointment/Guesty/Mellow types |
| Branded ID ergonomics too cumbersome | Medium | Low | Provide factory functions (createUserId, createPostId) and document the pattern clearly |
| Error code enum growing unmanageable | Low | Low | Start with the 6 defined errors; add codes only as services need them |

---

**Next Milestone**: [Milestone 2: Config & Infrastructure](./milestone-2-config-infrastructure.md)
**Blockers**: None
**Notes**:
- Several files already exist as scaffolds (result.types.ts, utils.types.ts, base.error.ts, app-errors.ts). These should be updated in place rather than recreated.
- The shared.types.ts file exists in the scaffold but is not part of the target structure. It may need to be removed or merged into common.types.ts.
- Types should be ported directly rather than re-exported from `@prmichaelsen/goodneighbor-types` so that goodneighbor-core owns its type definitions.
