# Task 21: FeedService

**Milestone**: [M5 - Core Services](../../milestones/milestone-5-core-services.md)
**Estimated Time**: 4 hours
**Dependencies**: Task 13 (feed creators), Task 16 (search service)
**Status**: Not Started

---

## Objective

Implement FeedService for feed lifecycle management including creation, retrieval, follow/unfollow, and permission-gated submissions. The service enforces the FeedEntityRefs permission model -- particularly `refs.hasSubmitPermissions` for controlling who can submit posts to a feed, and `refs.hasFollower` for tracking feed followers using atomic Firestore operations (arrayUnion/arrayRemove).

---

## Context

Feeds in goodneighbor are collections of posts organized around topics, geography, roles, or user-curated content. Each feed has a `type` of `"feed"` in the unified `goodneighbor.search` Firestore collection and carries `FeedEntityRefs` -- an extension of `ContentEntityRefs` that adds moderation and submission permission arrays.

Key FeedEntityRefs fields for this service:
- `refs.hasFollower` -- array of `@uid:{firebaseUid}` semantic IDs for users following this feed
- `refs.hasSubmitPermissions` -- array of `@uid:{firebaseUid}` or `@public` controlling who can submit posts
- `refs.hasModerator` -- array of UIDs with moderation rights
- `refs.hasSubmission` -- array of submission IDs tracking submitted posts

The follow/unfollow operations use Firestore atomic operations (`FieldValue.arrayUnion` and `FieldValue.arrayRemove`) to prevent race conditions when multiple users follow/unfollow simultaneously.

Feed submissions create a separate `DbFeedSubmission` document in the `COLLECTIONS.FEED_SUBMISSIONS` collection, linked to both the feed and the post.

---

## Steps

### 1. Create FeedService Class

Create `src/services/feed.service.ts` extending BaseService. The constructor accepts a Firestore instance and a SearchService instance.

```typescript
import { Firestore, FieldValue } from "firebase-admin/firestore";

interface FeedServiceDeps {
  firestore: Firestore;
  searchService: SearchService;
}

export class FeedService extends BaseService {
  private firestore: Firestore;
  private searchService: SearchService;

  constructor(deps: FeedServiceDeps) {
    super();
    this.firestore = deps.firestore;
    this.searchService = deps.searchService;
  }
}
```

### 2. Implement createFeed

Delegate to the `createFeedEntity()` function from M3 Task 13, write to Firestore, and index to Algolia non-blocking. The feed entity includes `FeedEntityRefs` with moderation permissions initialized to the creator.

```typescript
async createFeed(dto: CreateFeedDto, userId: string): Promise<Result<DbFeed, ValidationError>> {
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

### 3. Implement getFeed

Read the feed document from Firestore, verify it exists and is of type `"feed"`, then map to a FeedViewModel using the mapper from M3.

```typescript
async getFeed(feedId: string): Promise<Result<FeedViewModel, NotFoundError>> {
  const doc = await this.firestore
    .collection(COLLECTIONS.SEARCH)
    .doc(feedId)
    .get();

  if (!doc.exists) {
    return err(new NotFoundError(`Feed not found: ${feedId}`));
  }

  const data = doc.data() as DbFeed;
  if (data.type !== "feed") {
    return err(new NotFoundError(`Document is not a feed: ${feedId}`));
  }

  const viewModel = mapDbFeedToViewModel(data, { uid: "" }); // Caller should provide userContext
  return ok(viewModel);
}
```

### 4. Implement followFeed and unfollowFeed

Use Firestore atomic operations to add/remove the user's semantic ID from `refs.hasFollower`. Also update the `stats.followers` count atomically.

```typescript
async followFeed(feedId: string, userId: string): Promise<Result<void, NotFoundError>> {
  const docRef = this.firestore.collection(COLLECTIONS.SEARCH).doc(feedId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return err(new NotFoundError(`Feed not found: ${feedId}`));
  }

  const semanticId = `@uid:${userId}`;
  await docRef.update({
    "refs.hasFollower": FieldValue.arrayUnion(semanticId),
    "stats.followers": FieldValue.increment(1),
  });

  return ok(undefined);
}

async unfollowFeed(feedId: string, userId: string): Promise<Result<void, NotFoundError>> {
  const docRef = this.firestore.collection(COLLECTIONS.SEARCH).doc(feedId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return err(new NotFoundError(`Feed not found: ${feedId}`));
  }

  const semanticId = `@uid:${userId}`;
  await docRef.update({
    "refs.hasFollower": FieldValue.arrayRemove(semanticId),
    "stats.followers": FieldValue.increment(-1),
  });

  return ok(undefined);
}
```

### 5. Implement submitToFeed

Check `refs.hasSubmitPermissions` before creating a `DbFeedSubmission` document. The submit check looks for either `@public` (anyone can submit) or `@uid:{userId}` (specific user has permission).

```typescript
async submitToFeed(
  feedId: string,
  postId: string,
  userId: string
): Promise<Result<DbFeedSubmission, NotFoundError | ForbiddenError>> {
  const feedDoc = await this.firestore
    .collection(COLLECTIONS.SEARCH)
    .doc(feedId)
    .get();

  if (!feedDoc.exists) {
    return err(new NotFoundError(`Feed not found: ${feedId}`));
  }

  const feed = feedDoc.data() as DbFeed;
  const semanticId = `@uid:${userId}`;
  const hasPermission =
    feed.refs.hasSubmitPermissions.includes("@public") ||
    feed.refs.hasSubmitPermissions.includes(semanticId);

  if (!hasPermission) {
    return err(new ForbiddenError("User does not have permission to submit to this feed"));
  }

  const submission: DbFeedSubmission = {
    id: generateId(), // or use Firestore auto-ID
    type: "feed_submission",
    name: `Submission to ${feed.name}`,
    feedId,
    postId,
    createdBy: userId,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };

  await this.firestore
    .collection(COLLECTIONS.FEED_SUBMISSIONS)
    .doc(submission.id)
    .set(submission);

  // Update feed refs to track submission
  await this.firestore
    .collection(COLLECTIONS.SEARCH)
    .doc(feedId)
    .update({
      "refs.hasSubmission": FieldValue.arrayUnion(submission.id),
    });

  return ok(submission);
}
```

### 6. Write Unit Tests

Create `src/services/feed.service.spec.ts` with the following test cases:

- **createFeed success**: Mock Firestore set and SearchService. Verify DbFeed returned with correct FeedEntityRefs.
- **createFeed validation failure**: Provide empty name. Verify ValidationError.
- **createFeed builds correct FeedEntityRefs**: Verify refs include hasModerator, hasApprover, hasSubmitPermissions with creator's `@uid:{userId}`.
- **getFeed success**: Mock Firestore doc.get returning a feed document. Verify FeedViewModel returned.
- **getFeed not found**: Mock non-existing document. Verify NotFoundError.
- **getFeed wrong type**: Mock document with type !== "feed". Verify NotFoundError.
- **followFeed success**: Mock existing feed. Verify arrayUnion called with `@uid:{userId}`, stats.followers incremented.
- **followFeed not found**: Mock non-existing feed. Verify NotFoundError.
- **unfollowFeed success**: Verify arrayRemove called with `@uid:{userId}`, stats.followers decremented.
- **submitToFeed with public permissions**: Mock feed with `hasSubmitPermissions: ["@public"]`. Verify submission created.
- **submitToFeed with user permission**: Mock feed with `hasSubmitPermissions: ["@uid:user123"]`. Submit as user123. Verify submission created.
- **submitToFeed unauthorized**: Mock feed with `hasSubmitPermissions: ["@uid:other"]`. Submit as different user. Verify ForbiddenError.
- **submitToFeed not found**: Mock non-existing feed. Verify NotFoundError.
- **submitToFeed updates feed refs**: Verify `refs.hasSubmission` updated with arrayUnion of submission ID.

---

## Verification

- [ ] `createFeed` builds FeedEntityRefs with hasModerator, hasApprover, hasSubmitPermissions set to the creator
- [ ] `createFeed` writes to `COLLECTIONS.SEARCH` and indexes to Algolia non-blocking
- [ ] `getFeed` reads from `COLLECTIONS.SEARCH` and verifies `type === "feed"` before returning
- [ ] `followFeed` uses `FieldValue.arrayUnion(@uid:{userId})` on `refs.hasFollower`
- [ ] `followFeed` atomically increments `stats.followers`
- [ ] `unfollowFeed` uses `FieldValue.arrayRemove(@uid:{userId})` on `refs.hasFollower`
- [ ] `unfollowFeed` atomically decrements `stats.followers`
- [ ] `submitToFeed` checks `refs.hasSubmitPermissions` for `@public` or `@uid:{userId}` before creating submission
- [ ] `submitToFeed` returns ForbiddenError (not UnauthorizedError) when user lacks permission
- [ ] `submitToFeed` creates DbFeedSubmission in `COLLECTIONS.FEED_SUBMISSIONS`
- [ ] `submitToFeed` updates feed's `refs.hasSubmission` with the new submission ID
- [ ] All semantic IDs use `@uid:{firebaseUid}` format consistently
- [ ] All methods return Result<T, E> types
- [ ] All tests pass with mocked Firestore

---

## Expected Output

**File Structure**:
```
src/services/
├── feed.service.ts          # FeedService class with 5 methods
└── feed.service.spec.ts     # 14+ test cases covering all paths
```

**Key Files Created**:
- `feed.service.ts`: FeedService with createFeed, getFeed, followFeed, unfollowFeed, submitToFeed
- `feed.service.spec.ts`: Unit tests with mocked Firestore and SearchService

---

## Notes

- The `@uid:{firebaseUid}` format must be used consistently for all semantic IDs. Never use plain UIDs in refs arrays -- always prefix with `@uid:`.
- `@public` is the only system token. It means "any authenticated user" for submit permissions and "visible to everyone" for viewer permissions.
- The `FieldValue.arrayUnion` and `FieldValue.arrayRemove` operations are atomic at the Firestore level -- they handle concurrent modifications correctly without transactions.
- The `stats.followers` counter may drift from the actual `refs.hasFollower` array length over time if a user follows/unfollows rapidly. For production, consider periodic reconciliation.
- Feed submissions start with status `"pending"`. Approval/rejection logic (moderation) is a potential future addition but is not required in this task.
- The `generateId()` function should produce a unique identifier (UUID or Firestore auto-ID).

---

**Next Task**: [Task 22: CommentService](./task-22-comment-service.md)
**Related Design Docs**: [goodneighbor-core design](../../design/local.goodneighbor-core.md), [content entity model](../../design/local.content-entity-model.md)
**Estimated Completion Date**: TBD
