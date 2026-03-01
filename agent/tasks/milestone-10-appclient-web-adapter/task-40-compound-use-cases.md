# Task 40: Compound Use-Case Functions

**Milestone**: [M10 - AppClient & Web Adapter](../../milestones/milestone-10-appclient-web-adapter.md)
**Estimated Time**: 5 hours
**Dependencies**: Task 39 (WebSDKContext)
**Status**: Not Started

---

## Objective

Implement ~10 compound use-case functions in `src/web/use-cases/` that compose multiple service calls into user-facing workflows, using WebSDKContext for dependency injection and returning `Result<T, WebSDKError>`.

---

## Steps

### 1. Create `src/web/use-cases/content.ts`

**createAndSubmitToFeed**
```typescript
export async function createAndSubmitToFeed(
  ctx: WebSDKContext,
  input: { post: CreatePostDto; feedId: string },
): Promise<Result<{ post: DbPost; feedEntry: unknown }, WebSDKError>>
```
- ContentService.createPost → FeedService.submitToFeed
- Fail fast: if createPost fails, don't submit

**createFeedAndFollow**
```typescript
export async function createFeedAndFollow(
  ctx: WebSDKContext,
  input: CreateFeedDto,
): Promise<Result<{ feed: DbFeed }, WebSDKError>>
```
- ContentService.createFeed → FeedService.followFeed

### 2. Create `src/web/use-cases/profile.ts`

**setupProfile**
```typescript
export async function setupProfile(
  ctx: WebSDKContext,
  input: ProfileFormData,
): Promise<Result<PublicProfile, WebSDKError>>
```
- ProfileService.updateProfile (upsert behavior)

**viewProfile**
```typescript
export async function viewProfile(
  ctx: WebSDKContext,
  targetUid: string,
): Promise<Result<{ profile: PublicProfile; feeds: DbFeed[] }, WebSDKError>>
```
- ProfileService.getProfile + FeedService.getUserFeeds in parallel

### 3. Create `src/web/use-cases/discovery.ts`

**discoverUsers**
```typescript
export async function discoverUsers(
  ctx: WebSDKContext,
  input: { query: string; limit?: number },
): Promise<Result<{ profiles: PublicProfile[] }, WebSDKError>>
```
- ProfileService.searchProfiles → enrich with full profiles

### 4. Create `src/web/use-cases/feed.ts`

**getFeedWithPosts**
```typescript
export async function getFeedWithPosts(
  ctx: WebSDKContext,
  feedId: string,
): Promise<Result<{ feed: DbFeed; posts: PostViewModel[] }, WebSDKError>>
```
- FeedService.getFeed + ContentService.getPostsForFeed in parallel

### 5. Create `src/web/use-cases/index.ts` barrel

Export all use-case functions.

### 6. Update `src/web/index.ts`

Re-export use-cases barrel.

### 7. Create colocated specs

Test each use-case function:
- Mock service calls via mocked ServiceContainer
- Test success paths (all steps succeed)
- Test fail-fast behavior (first step fails → no second call)
- Test parallel operations resolve correctly

---

## Verification

- [ ] 6+ compound use-case functions implemented
- [ ] All functions accept WebSDKContext and return Result<T, WebSDKError>
- [ ] Fail-fast pattern on intermediate errors
- [ ] Parallel service calls where possible (viewProfile, getFeedWithPosts)
- [ ] All tests pass
