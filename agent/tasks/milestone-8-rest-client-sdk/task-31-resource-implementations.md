# Task 31: Resource Implementations

**Milestone**: [M8 - REST Client SDK](../../milestones/milestone-8-rest-client-sdk.md)
**Estimated Time**: 5 hours
**Dependencies**: Task 30 (SdkResponse, HttpClient, Guard), Task 3 (Domain types)
**Status**: Not Started

---

## Objective

Implement 6 resource clients that mirror the REST API routes 1:1. Each resource is an interface + factory function, delegating all HTTP calls to the shared `HttpClient`.

---

## Context

Resources are thin wrappers — no business logic, no validation, no caching. They map method calls to HTTP `request()` calls with the right verb, path, and body. Types are imported from existing goodneighbor-core type modules.

Pattern: [core-sdk.client-svc](../../patterns/core-sdk.client-svc.md)

---

## Steps

### 1. Create `src/clients/svc/v1/posts.ts`

```typescript
export interface PostsResource {
  create(userId: string, input: CreatePostDto): Promise<SdkResponse<DbPost>>;
  get(userId: string, id: string): Promise<SdkResponse<PostViewModel>>;
  delete(userId: string, id: string): Promise<SdkResponse<void>>;
}
```

Routes: `POST /api/v1/posts`, `GET /api/v1/posts/:id`, `DELETE /api/v1/posts/:id`

### 2. Create `src/clients/svc/v1/profiles.ts`

```typescript
export interface ProfilesResource {
  get(userId: string, uid: string): Promise<SdkResponse<PublicProfile>>;
  update(userId: string, uid: string, input: Partial<ProfileFormData>): Promise<SdkResponse<PublicProfile>>;
  search(userId: string, input: { query: string; limit?: number }): Promise<SdkResponse<PublicProfile[]>>;
}
```

Routes: `GET /api/v1/profiles/:uid`, `PUT /api/v1/profiles/:uid`, `POST /api/v1/profiles/search`

### 3. Create `src/clients/svc/v1/feeds.ts`

```typescript
export interface FeedsResource {
  create(userId: string, input: CreateFeedDto): Promise<SdkResponse<DbFeed>>;
  get(userId: string, id: string): Promise<SdkResponse<FeedViewModel>>;
  follow(userId: string, feedId: string): Promise<SdkResponse<void>>;
  unfollow(userId: string, feedId: string): Promise<SdkResponse<void>>;
  submit(userId: string, feedId: string, postId: string): Promise<SdkResponse<void>>;
}
```

Routes: `POST /api/v1/feeds`, `GET /api/v1/feeds/:id`, `POST /api/v1/feeds/:id/follow`, etc.

### 4. Create `src/clients/svc/v1/comments.ts`

```typescript
export interface CommentsResource {
  create(userId: string, input: CreateCommentDto): Promise<SdkResponse<Comment>>;
  list(userId: string, postId: string, opts?: { cursor?: string; limit?: number }): Promise<SdkResponse<PaginatedResult<Comment>>>;
  delete(userId: string, id: string): Promise<SdkResponse<void>>;
}
```

Routes: `POST /api/v1/comments`, `GET /api/v1/posts/:id/comments`, `DELETE /api/v1/comments/:id`

### 5. Create `src/clients/svc/v1/search.ts`

```typescript
export interface SearchResource {
  search(userId: string, input: { query: string; filters?: Record<string, unknown>; limit?: number }): Promise<SdkResponse<SearchEntity[]>>;
}
```

Route: `POST /api/v1/search`

### 6. Create `src/clients/svc/v1/auth.ts`

```typescript
export interface AuthResource {
  verifySession(sessionCookie: string): Promise<SdkResponse<{ uid: string; claims: Record<string, unknown> }>>;
}
```

Route: `POST /api/v1/auth/verify`

### 7. Create colocated `.spec.ts` for each resource

For each resource, test:
- Correct HTTP method and path called
- Body serialized correctly
- userId passed for auth resolution
- Mock `fetch` returns success → `SdkResponse` with data
- Mock `fetch` returns error → `SdkResponse` with error

---

## Verification

- [ ] 6 resource files created with interface + factory
- [ ] Each method maps to exactly one HTTP request
- [ ] Types imported from existing goodneighbor-core type modules
- [ ] No business logic in resource methods
- [ ] `userId` is first parameter on every method
- [ ] All 6 spec files pass
