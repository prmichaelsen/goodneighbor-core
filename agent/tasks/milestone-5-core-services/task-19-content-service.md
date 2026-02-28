# Task 19: ContentService

**Milestone**: [M5 - Core Services](../../milestones/milestone-5-core-services.md)
**Estimated Time**: 4 hours
**Dependencies**: Task 12 (post creators), Task 14 (mappers), Task 16 (search service)
**Status**: Not Started

---

## Objective

Implement ContentService that orchestrates the content processing pipeline, Firestore persistence, and Algolia indexing for posts and feeds. The service ties together the pure functions from M3 (content processing, creators, mappers) with the SearchService from M4 and Firestore for persistence. Key methods: `createPost(dto, userId)` validates content, creates the entity, writes to Firestore, indexes to Algolia (non-blocking), and returns `Result<DbPost, ValidationError>`. `createFeed(dto, userId)` follows a similar pipeline with feed-specific logic. Mapper methods delegate to pure mapper functions from M3.

---

## Context

The goodneighbor Next.js app performs content creation across multiple API route handlers, each inlining the validation, processing, persistence, and indexing steps. ContentService consolidates this into a single service that owns the complete pipeline:

```
CreatePostDto
  -> validatePostContent()      # M3: length/media limits
  -> processPostContent()       # M3: extract hashtags, mentions, URLs, categorize
  -> buildPostRefs()            # M3: construct permission refs with @uid:{userId}
  -> createPostEntity()         # M3: build DbPost with all fields
  -> Firestore write            # Persist to SEARCH collection
  -> indexDocument()            # M4 SearchService: push to Algolia (non-blocking)
  -> Return Result<DbPost>
```

All content entities live in the single polymorphic Firestore collection `goodneighbor.search` with a `type` discriminator field. The Algolia indexing step is intentionally non-blocking -- the Firestore write is the authoritative persistence, and search indexing is best-effort with error logging.

---

## Steps

### 1. Create ContentService Class

Create `src/services/content.service.ts` extending BaseService. The constructor accepts a Firestore instance and a SearchService instance.

```typescript
import { Firestore } from "firebase-admin/firestore";

interface ContentServiceDeps {
  firestore: Firestore;
  searchService: SearchService;
}

export class ContentService extends BaseService {
  private firestore: Firestore;
  private searchService: SearchService;

  constructor(deps: ContentServiceDeps) {
    super();
    this.firestore = deps.firestore;
    this.searchService = deps.searchService;
  }
}
```

### 2. Implement createPost

Orchestrate the full content creation pipeline:

1. Call `validatePostContent(dto)` from content-processing module. If validation fails, return `err(new ValidationError(...))`.
2. Call `processPostContent(dto)` to extract hashtags, mentions, URLs, and categorize the post.
3. Call `buildPostRefs(userId, processedContent)` to construct ContentEntityRefs with `@uid:{userId}` format.
4. Call `createPostEntity(dto, userId, processedContent, refs)` to build the complete DbPost object.
5. Write the DbPost to Firestore at `COLLECTIONS.SEARCH` using `firestore.collection(COLLECTIONS.SEARCH).doc(post.id).set(post)`.
6. Index to Algolia non-blocking: `this.searchService.indexDocument(post).catch(err => this.logger.error("Algolia indexing failed", err))`.
7. Return `ok(post)`.

```typescript
async createPost(dto: CreatePostDto, userId: string): Promise<Result<DbPost, ValidationError>> {
  const validationResult = validatePostContent(dto);
  if (!validationResult.ok) {
    return validationResult;
  }

  const processed = processPostContent(dto);
  const refs = buildPostRefs(userId, processed);
  const post = createPostEntity(dto, userId, processed, refs);

  await this.firestore
    .collection(COLLECTIONS.SEARCH)
    .doc(post.id)
    .set(post);

  // Non-blocking Algolia indexing
  this.searchService.indexDocument(post).catch((error) => {
    this.logger.error("Failed to index post to Algolia", { postId: post.id, error });
  });

  return ok(post);
}
```

### 3. Implement createFeed

Similar pipeline to createPost but with feed-specific logic:

1. Validate feed DTO (name required, description optional).
2. Call `createFeedEntity(dto, userId)` from feed-creators module, which builds FeedEntityRefs with moderation permissions.
3. Write the DbFeed to `COLLECTIONS.SEARCH`.
4. Index to Algolia non-blocking.
5. Return `ok(feed)`.

```typescript
async createFeed(dto: CreateFeedDto, userId: string): Promise<Result<DbFeed, ValidationError>> {
  // Validate feed DTO
  if (!dto.name || dto.name.trim().length === 0) {
    return err(new ValidationError("Feed name is required"));
  }

  const feed = createFeedEntity(dto, userId);

  await this.firestore
    .collection(COLLECTIONS.SEARCH)
    .doc(feed.id)
    .set(feed);

  this.searchService.indexDocument(feed).catch((error) => {
    this.logger.error("Failed to index feed to Algolia", { feedId: feed.id, error });
  });

  return ok(feed);
}
```

### 4. Implement Mapper Methods

Delegate to the pure mapper functions from M3 Task 14. These are thin wrappers that provide a service-level API for view model construction.

```typescript
mapPostToViewModel(dbPost: DbPost, userContext: UserContext): PostViewModel {
  return mapDbPostToViewModel(dbPost, userContext);
}

mapFeedToViewModel(dbFeed: DbFeed, userContext: UserContext): FeedViewModel {
  return mapDbFeedToViewModel(dbFeed, userContext);
}
```

The `userContext` parameter includes the current user's UID (as `@uid:{firebaseUid}`) and is used by mappers to compute permission flags like `canEdit`, `canDelete`, `isLiked`, `isFollowing`.

### 5. Implement validatePostContent and processPostContent Wrappers

Expose the M3 pure functions through the service API for consumers that need intermediate validation or processing without full persistence.

```typescript
validatePostContent(dto: CreatePostDto): Result<ValidatedPost, ValidationError> {
  return validatePostContentFn(dto);
}

processPostContent(dto: CreatePostDto): ProcessedContent {
  return processPostContentFn(dto);
}
```

### 6. Write Unit Tests

Create `src/services/content.service.spec.ts` with the following test cases:

- **createPost success**: Mock Firestore set and SearchService indexDocument. Provide valid DTO. Verify DbPost is returned with correct fields, Firestore set called with COLLECTIONS.SEARCH, indexDocument called.
- **createPost validation failure**: Provide DTO with empty content. Verify ValidationError returned, Firestore not called.
- **createPost Algolia failure does not block**: Mock indexDocument to reject. Verify DbPost is still returned successfully (non-blocking).
- **createPost builds correct refs**: Verify refs include `@uid:{userId}` in hasOwner, hasAuthor, hasCreator; `@public` in hasViewer for public posts.
- **createFeed success**: Mock Firestore and SearchService. Provide valid feed DTO. Verify DbFeed returned.
- **createFeed validation failure**: Provide DTO with empty name. Verify ValidationError.
- **createFeed builds FeedEntityRefs**: Verify feed refs include hasModerator, hasSubmitPermissions.
- **mapPostToViewModel**: Verify delegation to pure mapper function produces correct PostViewModel with permission flags.
- **mapFeedToViewModel**: Verify delegation to pure mapper function produces correct FeedViewModel.

---

## Verification

- [ ] `createPost` writes to `COLLECTIONS.SEARCH` Firestore collection
- [ ] `createPost` indexes to Algolia non-blocking (does not await the indexDocument call)
- [ ] `createPost` returns `Result<DbPost, ValidationError>` -- ok on success, err on validation failure
- [ ] `createPost` calls the full pipeline: validate -> process -> buildRefs -> createEntity -> write -> index
- [ ] `createFeed` follows the same pipeline pattern with feed-specific types and FeedEntityRefs
- [ ] Algolia indexing failure does not cause createPost/createFeed to return an error
- [ ] Algolia indexing failure is logged via the service logger
- [ ] `mapPostToViewModel` correctly delegates to the pure mapper function from M3
- [ ] `mapFeedToViewModel` correctly delegates to the pure mapper function from M3
- [ ] All methods use proper Result<T, E> return types
- [ ] ContentService accepts Firestore and SearchService via constructor injection
- [ ] All tests pass with mocked Firestore and SearchService

---

## Expected Output

**File Structure**:
```
src/services/
├── content.service.ts       # ContentService class with 6 methods
└── content.service.spec.ts  # 9+ test cases covering all paths
```

**Key Files Created**:
- `content.service.ts`: ContentService orchestrating content pipeline, Firestore persistence, Algolia indexing
- `content.service.spec.ts`: Unit tests with mocked Firestore and SearchService

---

## Notes

- The non-blocking Algolia indexing uses `.catch()` rather than `await` to prevent unhandled promise rejections while not blocking the main write path. This is an intentional design decision -- Firestore is the source of truth; Algolia is eventually consistent.
- The `COLLECTIONS.SEARCH` constant (`"goodneighbor.search"`) is from M1 Task 4.
- The `UserContext` type used by mapper methods should include at minimum `{ uid: string }` where uid is the Firebase UID used to construct `@uid:{uid}` for permission checks.
- Post IDs are generated by `createPostEntity()` in M3. They should be UUIDs or Firestore auto-generated IDs.
- The `processPostContent` function from M3 returns extracted hashtags (without # prefix), mention UIDs (resolved from @username at creation time), URL objects, and a category string.

---

**Next Task**: [Task 20: ProfileService](./task-20-profile-service.md)
**Related Design Docs**: [goodneighbor-core design](../../design/local.goodneighbor-core.md), [content entity model](../../design/local.content-entity-model.md)
**Estimated Completion Date**: TBD
