# Milestone 5: Core Services

**Goal**: Implement the 5 core business services: AuthService, ContentService, ProfileService, FeedService, CommentService
**Duration**: 5-7 days
**Dependencies**: M1 (types), M2 (config/Firebase init), M3 (content processing), M4 (search service)
**Status**: Not Started

---

## Overview

This milestone implements the five primary business logic services that form the operational core of goodneighbor-core. Each service encapsulates a distinct domain capability -- authentication, content management, profile management, feed management, and commenting -- following the dependency injection pattern established in M2.

All services accept Firebase/Algolia clients in their constructors (no global singletons) and return `Result<T, E>` discriminated unions from every fallible operation. This makes each service fully testable with mocked dependencies and ensures callers handle both success and error paths explicitly.

The services build on the foundation laid in previous milestones:
- M1 types provide the domain models (DbPost, DbFeed, ContentEntityRefs, etc.)
- M2 config provides validated Firebase/Algolia client instances
- M3 content processing provides the pure functions for hashtag/mention extraction, categorization, and validation
- M4 search service provides Algolia indexing and querying

Key design principles:
- Semantic IDs use `@uid:{firebaseUid}` format (not usernames) to avoid fan-out on username changes
- `@public` is the sole system visibility token for public content
- Permission checks rely on refs arrays (hasOwner, hasViewer, hasEditPermissions, etc.)
- All Firestore atomic operations (arrayUnion, arrayRemove, increment) are used for refs updates

---

## Deliverables

### 1. AuthService
- `verifySession(sessionCookie)` -- verifies Firebase session cookie, returns `Result<ServerUser, UnauthorizedError>`
- `isOwner(claims, appName)` -- checks if user is owner of given app, returns boolean
- `isOverseer(claims, appName)` -- checks if user is overseer of given app, returns boolean
- `requireOwner(session)` -- verifies session and checks ownership, returns `Result<ServerUser, ForbiddenError>`

### 2. ContentService
- `validatePostContent(dto)` -- validates content length and media limits
- `processPostContent(dto)` -- extracts hashtags, mentions, URLs, categorizes
- `createPost(dto, userId)` -- full pipeline: validate, process, build refs, create entity, write to Firestore, index to Algolia (non-blocking)
- `createFeed(dto, userId)` -- similar pipeline with feed-specific logic
- `mapPostToViewModel(dbPost, userContext)` -- delegates to pure mapper functions
- `mapFeedToViewModel(dbFeed, userContext)` -- delegates to pure mapper functions

### 3. ProfileService
- `getPublicProfile(username)` -- query by username field, returns `Result<PublicProfile, NotFoundError>`
- `updatePublicProfile(userId, data)` -- validate and write, returns `Result<PublicProfile, ValidationError>`
- `getPrivateProfile(userId)` -- read by userId, returns `Result<PrivateProfile, NotFoundError>`
- `updatePrivateProfile(userId, data)` -- validate and write, returns `Result<PrivateProfile, ValidationError>`
- `getProfileBoard(userId)` -- read board with 17 widget types, returns `Result<ProfileBoard, NotFoundError>`
- `createDefaultBoard(userId)` -- create default board, returns `Result<ProfileBoard, ConflictError>`
- `updateBoard(userId, data)` -- update board configuration, returns `Result<ProfileBoard, ValidationError>`
- `searchUsers(query)` -- Firestore prefix query on username/displayName, deduplicated by userId

### 4. FeedService
- `createFeed(dto, userId)` -- creates feed entity with FeedEntityRefs including moderation permissions
- `getFeed(feedId)` -- reads from Firestore, maps to FeedViewModel
- `followFeed(feedId, userId)` -- adds `@uid:{userId}` to `refs.hasFollower` via arrayUnion
- `unfollowFeed(feedId, userId)` -- removes `@uid:{userId}` from `refs.hasFollower` via arrayRemove
- `submitToFeed(feedId, postId, userId)` -- checks `refs.hasSubmitPermissions` before creating DbFeedSubmission

### 5. CommentService
- `createComment(postId, content, userId)` -- creates comment, atomically updates parent entity refs
- `getComments(postId, pagination)` -- cursor-based pagination with orderBy createdAt

---

## Success Criteria

- [ ] All services testable with mocked dependencies (no real Firebase/Algolia needed for unit tests)
- [ ] All fallible methods return `Result<T, E>` types using the ok() and err() constructors
- [ ] AuthService delegates to Firebase Admin SDK `auth.verifySessionCookie()` with SESSION_DURATION_DAYS check
- [ ] ContentService wraps content processing pipeline + Firestore writes + Algolia indexing (non-blocking)
- [ ] ProfileService handles both public and private profiles with separate Firestore collections
- [ ] ProfileService profile boards support all 17 widget types
- [ ] ProfileService `searchUsers()` uses Firestore prefix query (>= query, <= query + \uf8ff), deduplicates by userId
- [ ] FeedService enforces submit permissions via `refs.hasSubmitPermissions` check before creating submissions
- [ ] FeedService follow/unfollow use Firestore atomic `arrayUnion`/`arrayRemove` on `refs.hasFollower`
- [ ] CommentService updates parent entity refs atomically on comment creation (`refs.hasComments` arrayUnion, `refs.hasCommenter` arrayUnion, `stats.comments` increment)
- [ ] All services extend BaseService or follow equivalent pattern with logger and config
- [ ] 85% test coverage across all service files

---

## Key Files to Create

```
src/services/
├── auth.service.ts          # AuthService - session verification, role checking
├── auth.service.spec.ts     # AuthService tests with mocked Firebase Auth
├── content.service.ts       # ContentService - content pipeline, Firestore writes, Algolia indexing
├── content.service.spec.ts  # ContentService tests with mocked Firestore and SearchService
├── profile.service.ts       # ProfileService - public/private profile CRUD, boards, user search
├── profile.service.spec.ts  # ProfileService tests with mocked Firestore
├── feed.service.ts          # FeedService - feed CRUD, follow/unfollow, submissions
├── feed.service.spec.ts     # FeedService tests with mocked Firestore
├── comment.service.ts       # CommentService - comment creation, pagination, parent ref updates
└── comment.service.spec.ts  # CommentService tests with mocked Firestore
```

---

## Tasks

1. [Task 18: AuthService](../tasks/milestone-5-core-services/task-18-auth-service.md) - Implement session verification and role-based access checks wrapping Firebase Admin SDK
2. [Task 19: ContentService](../tasks/milestone-5-core-services/task-19-content-service.md) - Implement content processing pipeline with Firestore persistence and Algolia indexing
3. [Task 20: ProfileService](../tasks/milestone-5-core-services/task-20-profile-service.md) - Implement public/private profile CRUD, profile boards, and user search
4. [Task 21: FeedService](../tasks/milestone-5-core-services/task-21-feed-service.md) - Implement feed management with follow/unfollow and permission-gated submissions
5. [Task 22: CommentService](../tasks/milestone-5-core-services/task-22-comment-service.md) - Implement comment creation with parent ref updates and cursor-based pagination

---

## Environment Variables

No new environment variables required for this milestone. All services receive their configuration and client instances via constructor injection from the config layer established in M2.

Relevant config sections consumed by these services:
```
AuthConfig.sessionDurationDays     # Used by AuthService for session cookie verification
AppConfig.appName                  # Used by AuthService for isOwner/isOverseer claims checking
```

---

## Testing Requirements

- [ ] AuthService unit tests: verifySession returns ServerUser on valid cookie, returns UnauthorizedError on invalid/expired cookie, isOwner/isOverseer check claims arrays correctly, requireOwner chains session verification with ownership check
- [ ] ContentService unit tests: createPost writes to goodneighbor.search collection, Algolia indexing is non-blocking (does not block the Result return), validation errors propagate as Result.err, mapPostToViewModel delegates correctly
- [ ] ProfileService unit tests: getPublicProfile queries by username, returns NotFoundError when missing, updatePublicProfile validates input, board CRUD handles all 17 widget types, searchUsers deduplicates results
- [ ] FeedService unit tests: createFeed builds correct FeedEntityRefs, followFeed/unfollowFeed call arrayUnion/arrayRemove, submitToFeed checks hasSubmitPermissions and rejects unauthorized users
- [ ] CommentService unit tests: createComment writes to POST_COMMENTS collection, parent entity refs updated atomically (hasComments, hasCommenter, stats.comments), getComments supports cursor-based pagination
- [ ] All tests use mocked Firestore and Firebase Auth instances (no emulator required for unit tests)

---

## Documentation Requirements

- [ ] JSDoc comments on all public service methods documenting parameters, return types, and error cases
- [ ] JSDoc comments on constructor parameters documenting expected dependency types
- [ ] Inline comments on permission check logic explaining the `@uid:{firebaseUid}` and `@public` patterns
- [ ] Inline comments on atomic Firestore operations (arrayUnion, arrayRemove, increment) explaining why atomicity matters

---

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Firebase Admin SDK API surface changes | Medium | Low | Pin firebase-admin version; wrap SDK calls in service methods that isolate the dependency |
| Algolia non-blocking indexing errors silently swallowed | Medium | Medium | Log indexing failures; consider a retry queue or dead-letter collection for failed indexes |
| Profile board 17 widget types create complex validation | Medium | Medium | Use discriminated union type for widgets; validate each widget type independently |
| Firestore atomic operations race conditions on high-traffic posts | Medium | Low | Use transactions for critical multi-field updates; arrayUnion/increment are inherently atomic |
| User search prefix query returns too many results | Low | Medium | Apply reasonable limit (e.g., 20 results); document that this is not full-text search |

---

**Next Milestone**: [Milestone 6: Notification & I18n](./milestone-6-notification-i18n.md)
**Blockers**: Milestones 1-4 must be complete (types, config, content processing, search service)
**Notes**:
- Services should be developed in dependency order: AuthService first (no service dependencies), then ContentService (depends on SearchService from M4), then ProfileService, FeedService, and CommentService.
- The BaseService class from existing scaffold should be extended by all services for consistent logging and config access.
- All Firestore collection paths should use constants from M1 Task 4 (`COLLECTIONS.SEARCH`, `COLLECTIONS.PUBLIC_PROFILES`, etc.).
- Non-blocking Algolia indexing in ContentService should use `.catch()` to prevent unhandled rejections while not blocking the main write path.
