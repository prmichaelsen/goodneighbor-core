# Task 22: CommentService

**Milestone**: [M5 - Core Services](../../milestones/milestone-5-core-services.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 2 (entity types), Task 8 (Firebase init)
**Status**: Not Started

---

## Objective

Implement CommentService for comment creation and retrieval on posts. The service creates comment documents in the `POST_COMMENTS` collection, atomically updates the parent entity's refs and stats (`refs.hasComments` arrayUnion, `refs.hasCommenter` arrayUnion, `stats.comments` increment), and supports cursor-based pagination for fetching comments. Nested replies are stored in a separate `COMMENT_REPLIES` collection.

---

## Context

The goodneighbor app allows users to comment on posts. When a comment is created, the parent post's document in the `goodneighbor.search` collection must be updated atomically to track the relationship:

```typescript
// Parent entity updates on comment creation
await parentRef.update({
  "refs.hasComments": arrayUnion(commentId),
  "refs.hasCommenter": arrayUnion(`@uid:${authorId}`),
  "stats.comments": increment(1),
});
```

This denormalized approach keeps the comment count and commenter list on the parent entity for fast reads (no need to count a subcollection), while the actual comment documents live in a separate collection for efficient pagination.

Comments use cursor-based pagination rather than offset-based. The cursor is the `createdAt` timestamp of the last item in the previous page, passed as `startAfter` to the next query. This is more efficient for Firestore and handles insertions between pages correctly.

---

## Steps

### 1. Create CommentService Class

Create `src/services/comment.service.ts` extending BaseService. The constructor accepts a Firestore instance.

```typescript
import { Firestore, FieldValue } from "firebase-admin/firestore";

interface CommentServiceDeps {
  firestore: Firestore;
}

export class CommentService extends BaseService {
  private firestore: Firestore;

  constructor(deps: CommentServiceDeps) {
    super();
    this.firestore = deps.firestore;
  }
}
```

### 2. Implement createComment

Create a comment document in `POST_COMMENTS` and atomically update the parent entity in `SEARCH`.

```typescript
async createComment(
  postId: string,
  content: string,
  userId: string
): Promise<Result<Comment, ValidationError | NotFoundError>> {
  // Validate content
  if (!content || content.trim().length === 0) {
    return err(new ValidationError("Comment content cannot be empty"));
  }

  if (content.length > 5000) {
    return err(new ValidationError("Comment content exceeds maximum length of 5000 characters"));
  }

  // Verify parent post exists
  const parentRef = this.firestore.collection(COLLECTIONS.SEARCH).doc(postId);
  const parentDoc = await parentRef.get();

  if (!parentDoc.exists) {
    return err(new NotFoundError(`Post not found: ${postId}`));
  }

  // Create comment document
  const commentId = this.firestore.collection(COLLECTIONS.POST_COMMENTS).doc().id;
  const comment: Comment = {
    id: commentId,
    postId,
    authorId: userId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
    stats: {
      likes: 0,
      replies: 0,
    },
  };

  // Use a batch to write comment and update parent atomically
  const batch = this.firestore.batch();

  const commentRef = this.firestore.collection(COLLECTIONS.POST_COMMENTS).doc(commentId);
  batch.set(commentRef, comment);

  const semanticId = `@uid:${userId}`;
  batch.update(parentRef, {
    "refs.hasComments": FieldValue.arrayUnion(commentId),
    "refs.hasCommenter": FieldValue.arrayUnion(semanticId),
    "stats.comments": FieldValue.increment(1),
  });

  await batch.commit();

  return ok(comment);
}
```

### 3. Implement getComments

Fetch comments for a post with cursor-based pagination. Order by `createdAt` ascending, use `startAfter` for the cursor, and `limit` for page size.

```typescript
async getComments(
  postId: string,
  pagination: PaginationOptions
): Promise<Result<PaginatedResult<Comment>, NotFoundError>> {
  // Verify parent post exists
  const parentDoc = await this.firestore
    .collection(COLLECTIONS.SEARCH)
    .doc(postId)
    .get();

  if (!parentDoc.exists) {
    return err(new NotFoundError(`Post not found: ${postId}`));
  }

  const pageSize = pagination.limit ?? 20;
  let query = this.firestore
    .collection(COLLECTIONS.POST_COMMENTS)
    .where("postId", "==", postId)
    .orderBy("createdAt", "asc")
    .limit(pageSize + 1); // Fetch one extra to determine if there are more

  if (pagination.cursor) {
    query = query.startAfter(pagination.cursor);
  }

  const snapshot = await query.get();
  const comments = snapshot.docs.slice(0, pageSize).map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Comment));

  const hasMore = snapshot.docs.length > pageSize;
  const nextCursor = hasMore && comments.length > 0
    ? comments[comments.length - 1].createdAt
    : undefined;

  return ok({
    items: comments,
    hasMore,
    nextCursor,
    total: undefined, // Firestore does not provide efficient count
  });
}
```

### 4. Implement createReply (Nested Replies)

Support nested replies via the `COMMENT_REPLIES` collection. A reply references its parent comment and also updates the parent comment's reply count.

```typescript
async createReply(
  commentId: string,
  content: string,
  userId: string
): Promise<Result<CommentReply, ValidationError | NotFoundError>> {
  if (!content || content.trim().length === 0) {
    return err(new ValidationError("Reply content cannot be empty"));
  }

  if (content.length > 5000) {
    return err(new ValidationError("Reply content exceeds maximum length of 5000 characters"));
  }

  // Verify parent comment exists
  const commentRef = this.firestore.collection(COLLECTIONS.POST_COMMENTS).doc(commentId);
  const commentDoc = await commentRef.get();

  if (!commentDoc.exists) {
    return err(new NotFoundError(`Comment not found: ${commentId}`));
  }

  const replyId = this.firestore.collection(COLLECTIONS.COMMENT_REPLIES).doc().id;
  const reply: CommentReply = {
    id: replyId,
    commentId,
    authorId: userId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const batch = this.firestore.batch();

  const replyRef = this.firestore.collection(COLLECTIONS.COMMENT_REPLIES).doc(replyId);
  batch.set(replyRef, reply);

  batch.update(commentRef, {
    "stats.replies": FieldValue.increment(1),
  });

  await batch.commit();

  return ok(reply);
}
```

### 5. Write Unit Tests

Create `src/services/comment.service.spec.ts` with the following test cases:

- **createComment success**: Mock Firestore batch and parent doc. Verify comment created in POST_COMMENTS, parent refs updated atomically.
- **createComment empty content**: Verify ValidationError returned.
- **createComment exceeds max length**: Provide content > 5000 chars. Verify ValidationError.
- **createComment parent not found**: Mock parent doc.exists = false. Verify NotFoundError.
- **createComment updates parent refs**: Verify batch.update called with `refs.hasComments` arrayUnion, `refs.hasCommenter` arrayUnion with `@uid:{userId}`, `stats.comments` increment(1).
- **createComment uses batch for atomicity**: Verify batch.set and batch.update called, then batch.commit.
- **getComments success**: Mock Firestore query returning 3 comments. Verify PaginatedResult with correct items.
- **getComments with cursor**: Verify startAfter is applied to the query.
- **getComments hasMore true**: Mock query returning pageSize + 1 docs. Verify hasMore is true and nextCursor is set.
- **getComments hasMore false**: Mock query returning fewer docs than limit. Verify hasMore is false.
- **getComments parent not found**: Mock parent doc.exists = false. Verify NotFoundError.
- **createReply success**: Mock parent comment doc. Verify reply created in COMMENT_REPLIES, parent stats.replies incremented.
- **createReply parent not found**: Mock non-existing comment. Verify NotFoundError.

---

## Verification

- [ ] `createComment` writes to `COLLECTIONS.POST_COMMENTS` collection
- [ ] `createComment` atomically updates parent entity at `COLLECTIONS.SEARCH` using Firestore batch
- [ ] Parent entity update includes `refs.hasComments` arrayUnion with commentId
- [ ] Parent entity update includes `refs.hasCommenter` arrayUnion with `@uid:{userId}` semantic ID
- [ ] Parent entity update includes `stats.comments` increment(1)
- [ ] `createComment` validates content is non-empty and within 5000-character limit
- [ ] `createComment` verifies parent post exists before creating comment
- [ ] `getComments` uses cursor-based pagination with `orderBy("createdAt", "asc")` and `startAfter(cursor)`
- [ ] `getComments` fetches `limit + 1` to determine `hasMore` flag
- [ ] `getComments` returns `PaginatedResult<Comment>` with items, hasMore, and nextCursor
- [ ] `createReply` writes to `COLLECTIONS.COMMENT_REPLIES` collection
- [ ] `createReply` increments parent comment's `stats.replies` atomically
- [ ] All semantic IDs use `@uid:{firebaseUid}` format
- [ ] All methods return Result<T, E> types
- [ ] All tests pass with mocked Firestore

---

## Expected Output

**File Structure**:
```
src/services/
├── comment.service.ts       # CommentService class with 3 methods
└── comment.service.spec.ts  # 13+ test cases covering all paths
```

**Key Files Created**:
- `comment.service.ts`: CommentService with createComment, getComments, createReply
- `comment.service.spec.ts`: Unit tests with mocked Firestore

---

## Notes

- The Firestore batch write is critical for atomicity. Without it, a crash between writing the comment and updating the parent refs would leave the data in an inconsistent state (comment exists but parent does not reference it).
- Cursor-based pagination is preferred over offset-based for Firestore because offset-based reads (and discards) all documents up to the offset, which is wasteful and slow for deep pages.
- The `total` field in PaginatedResult is undefined because Firestore does not provide an efficient way to count documents matching a query without reading them all. If a total count is needed, it should be maintained separately on the parent entity (which we already do with `stats.comments`).
- The comment's `authorId` stores the plain Firebase UID, not the `@uid:{userId}` format. The semantic ID format is only used in the parent entity's refs arrays.
- Content validation limits (5000 characters) should match the goodneighbor app's existing limits.
- The `createdAt` field is stored as an ISO 8601 string. Firestore orderBy works correctly with string-formatted timestamps in ISO 8601 format.

---

**Next Task**: [Task 23: NotificationService](../milestone-6-notification-i18n/task-23-notification-service.md)
**Related Design Docs**: [goodneighbor-core design](../../design/local.goodneighbor-core.md), [content entity model](../../design/local.content-entity-model.md)
**Estimated Completion Date**: TBD
