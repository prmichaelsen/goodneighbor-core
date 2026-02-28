# Milestone 3: Content Processing & Entity Builders

**Goal**: Port all content processing pure functions, entity creator functions, and view model mappers from goodneighbor
**Duration**: 3-4 days
**Dependencies**: M1 (types needed for entity interfaces, refs hierarchy, Result type, and error classes)
**Status**: Not Started

---

## Overview

This milestone ports the pure business logic that sits at the heart of the goodneighbor content pipeline. It covers three layers:

1. **Content extraction and classification** -- parsing hashtags, mentions, and URLs from post text, categorizing posts by topic, and validating content against business rules.
2. **Entity creators** -- constructing complete `DbPost` and `DbFeed` documents with properly populated refs arrays, zeroed stats, and timestamps ready for Firestore insertion.
3. **View model mappers** -- transforming database entities into user-facing view models with permission flags (canEdit, canDelete, isLiked, canModerate) derived from the refs arrays and a given user context.

All functions in this milestone are pure (no side effects, no I/O). This makes them the easiest layer to port and test, while also being the most critical to get right -- incorrect refs assignment breaks both the permission model and Algolia search filtering.

Key design constraints:
- Semantic IDs use `@uid:{firebaseUid}` format throughout (never usernames).
- `@public` is the sole system visibility token for public content.
- The three-tier refs hierarchy (SearchEntityRefs -> ContentEntityRefs -> FeedEntityRefs) must be populated exactly as specified in the content-entity-model design doc.
- All entities target the single polymorphic Firestore collection `goodneighbor.search`.

---

## Deliverables

### 1. Content Extraction
- `extractHashtags(text)` -- parse #hashtag patterns from text, return deduplicated string array
- `extractMentions(text)` -- parse @mention patterns from text, return deduplicated string array
- `extractUrls(text)` -- parse http/https/www URL patterns from text, return deduplicated string array

### 2. Content Categorization
- `categorizePost(content)` -- classify post content into one of: "safety", "events", "recommendations", "lost_found", "general"

### 3. Content Validation
- `validatePostContent(dto)` -- validate post DTO against content length and media constraints, return `Result<ValidatedPost, ValidationError>`

### 4. Content Processing Pipeline
- `processPostContent(dto)` -- combine extraction + categorization into a single `ProcessedContent` result containing hashtags, mentions, URLs, and category

### 5. Post Creators
- `buildPostRefs(userId, isPublic, hashtags, mentionUids)` -- construct a complete `ContentEntityRefs` object with correct visibility, ownership, permissions, tags, and mentions
- `createPostEntity(dto, userId, processed)` -- build a complete `DbPost` document with refs, zeroed stats, timestamps, properties, and search text

### 6. Feed Creators
- `createFeedEntity(dto, userId)` -- build a complete `DbFeed` document with `FeedEntityRefs` including moderation fields, feed behavior, and feed properties

### 7. Post Mappers
- `mapDbPostToViewModel(dbPost, userContext)` -- transform a `DbPost` into a `PostViewModel` with user-specific permission flags (canEdit, canDelete, isLiked) derived from refs

### 8. Feed Mappers
- `mapDbFeedToViewModel(dbFeed, userContext)` -- transform a `DbFeed` into a `FeedViewModel` with permission flags (isOwner, canModerate, canPost)
- `mapDbFeedSubmissionToViewModel(sub)` -- transform a `DbFeedSubmission` into a `FeedSubmissionViewModel`

---

## Success Criteria

- [ ] `extractHashtags("#hello #world")` returns `["hello", "world"]`
- [ ] `extractMentions("@alice @bob")` returns `["alice", "bob"]`
- [ ] `extractUrls("visit https://example.com")` returns `["https://example.com"]`
- [ ] `categorizePost` correctly classifies safety/events/recommendations/lost_found/general content
- [ ] `validatePostContent` rejects content exceeding length limits and returns a `ValidationError`
- [ ] `processPostContent` returns a `ProcessedContent` with hashtags, mentions, URLs, and category
- [ ] `buildPostRefs` uses `@uid:{userId}` format for all user ID entries in refs arrays
- [ ] `buildPostRefs` sets `hasViewer: ["@public"]` for public posts and `hasViewer: ["@uid:{userId}"]` for private posts
- [ ] `createPostEntity` produces a complete `DbPost` with all required fields, including zeroed stats
- [ ] `createFeedEntity` produces a complete `DbFeed` with `FeedEntityRefs` including moderation refs
- [ ] `mapDbPostToViewModel` correctly derives canEdit, canDelete, isLiked from refs arrays
- [ ] `mapDbFeedToViewModel` correctly derives isOwner, canModerate, canPost from feed refs
- [ ] 95% test coverage on all pure functions
- [ ] All files compile without TypeScript errors (`npm run typecheck` passes)

---

## Key Files to Create

```
src/lib/
├── content-processing.ts        # extractHashtags, extractMentions, extractUrls, categorizePost, validatePostContent, processPostContent
├── content-processing.spec.ts
├── creators/
│   ├── post-creators.ts         # buildPostRefs, createPostEntity
│   ├── post-creators.spec.ts
│   ├── feed-creators.ts         # createFeedEntity
│   └── feed-creators.spec.ts
└── mappers/
    ├── post-mappers.ts          # mapDbPostToViewModel
    ├── post-mappers.spec.ts
    ├── feed-mappers.ts          # mapDbFeedToViewModel, mapDbFeedSubmissionToViewModel
    └── feed-mappers.spec.ts
```

---

## Tasks

1. [Task 10: Content Extraction Functions](../tasks/milestone-3-content-processing/task-10-content-extraction.md) - Implement extractHashtags, extractMentions, extractUrls
2. [Task 11: Content Categorization & Validation](../tasks/milestone-3-content-processing/task-11-categorization-validation.md) - Implement categorizePost, validatePostContent, processPostContent
3. [Task 12: Post Creators](../tasks/milestone-3-content-processing/task-12-post-creators.md) - Implement buildPostRefs, createPostEntity
4. [Task 13: Feed Creators](../tasks/milestone-3-content-processing/task-13-feed-creators.md) - Implement createFeedEntity with FeedEntityRefs
5. [Task 14: Post & Feed Mappers](../tasks/milestone-3-content-processing/task-14-entity-mappers.md) - Implement mapDbPostToViewModel, mapDbFeedToViewModel, mapDbFeedSubmissionToViewModel

---

## Environment Variables

None required for this milestone. All functions are pure logic with no external service dependencies.

---

## Testing Requirements

- [ ] Unit tests for hashtag extraction: handles basic tags, hyphenated tags, ignores markdown headers (##), handles duplicates, handles empty input
- [ ] Unit tests for mention extraction: handles @username, handles duplicates, handles empty input
- [ ] Unit tests for URL extraction: handles http, https, www, handles multiple URLs, handles no URLs
- [ ] Unit tests for categorization: each category has keyword triggers, default is "general"
- [ ] Unit tests for validation: rejects too-long content, rejects too many media items, accepts valid content
- [ ] Unit tests for processPostContent pipeline: returns complete ProcessedContent
- [ ] Unit tests for buildPostRefs: public vs private visibility, @uid: format throughout, all 28 ContentEntityRefs fields populated
- [ ] Unit tests for createPostEntity: complete DbPost with zeroed stats, correct timestamps, correct property mapping
- [ ] Unit tests for createFeedEntity: FeedEntityRefs with moderation refs, feed behavior initialized, public vs private feeds
- [ ] Unit tests for post mappers: canEdit/canDelete/isLiked derived from refs, different user contexts
- [ ] Unit tests for feed mappers: isOwner/canModerate/canPost derived from refs, different user contexts
- [ ] Unit tests for feed submission mapper: status fields mapped correctly

---

## Documentation Requirements

- [ ] JSDoc comments on all exported functions documenting parameters, return types, and behavior
- [ ] JSDoc comments on ProcessedContent and ValidatedPost types
- [ ] Inline comments in buildPostRefs explaining the semantic ID format (`@uid:{firebaseUid}`) and `@public` token
- [ ] Inline comments in mappers explaining how permission flags are derived from refs

---

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Incorrect refs assignment breaks permission model | High | Medium | Cross-reference every refs field against the content-entity-model design doc; verify array counts (28 for ContentEntityRefs, 35 for FeedEntityRefs) |
| Regex edge cases in extraction functions | Medium | Medium | Write comprehensive edge case tests (Unicode, special characters, embedded hashtags in URLs) |
| Categorization keyword lists incomplete | Low | Medium | Start with known keywords from source; categorization can be refined later without breaking the interface |
| Missing fields in DbPost/DbFeed construction | High | Low | Compare created entities field-by-field against the design doc type definitions |
| Mapper permission logic subtly wrong | High | Medium | Test every permission flag with at least 3 scenarios: owner, non-owner with permission, non-owner without permission |

---

**Next Milestone**: [Milestone 4: Search Service](./milestone-4-search-service.md)
**Blockers**: None (M1 types are prerequisite but not a blocker to writing the milestone)
**Notes**:
- All functions in this milestone are pure and side-effect-free. This makes them ideal candidates for property-based testing in addition to example-based tests.
- The content processing pipeline (`processPostContent`) is the glue that combines extraction + categorization. It should call the individual functions, not duplicate their logic.
- Post creators and feed creators share the base ContentEntityRefs construction. Feed creators extend it with feed-specific refs. Use composition, not duplication.
- Mappers must check refs arrays using the exact `@uid:{userId}` format. A mismatch in the semantic ID format between creators and mappers will cause silent permission failures.
