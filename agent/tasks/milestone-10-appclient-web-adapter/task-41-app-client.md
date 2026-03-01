# Task 41: AppClient Factory & Resources

**Milestone**: [M10 - AppClient & Web Adapter](../../milestones/milestone-10-appclient-web-adapter.md)
**Estimated Time**: 4 hours
**Dependencies**: Task 30 (HttpClient), Task 33 (adapter routes)
**Status**: Not Started

---

## Objective

Create the AppClient — a use-case-oriented REST client that composes multiple API calls into compound operations. The AppClient calls HTTP endpoints directly (not through SvcClient) per the core-sdk.client-app pattern.

---

## Context

Per the pattern, the AppClient:
- Groups methods by **use case**, not REST resource
- Calls REST endpoints directly via HttpClient (decoupled from SvcClient)
- Returns `SdkResponse<T>` like SvcClient
- Fails fast on intermediate errors

---

## Steps

### 1. Create `src/app/content.ts`

```typescript
export class ContentOperations {
  constructor(private http: HttpClient) {}

  async createAndSubmitToFeed(
    userId: string,
    input: { post: CreatePostDto; feedId: string },
  ): Promise<SdkResponse<{ post: DbPost }>> {
    const post = await this.http.request('POST', '/api/v1/posts', { body: input.post, userId });
    if (post.error) return createError(post.error);

    await this.http.request('POST', `/api/v1/feeds/${input.feedId}/submit`, {
      body: { postId: post.data!.id }, userId,
    });
    return post;
  }

  async createFeedAndFollow(userId: string, input: CreateFeedDto): Promise<SdkResponse<DbFeed>> {
    const feed = await this.http.request('POST', '/api/v1/feeds', { body: input, userId });
    if (feed.error) return createError(feed.error);

    await this.http.request('POST', `/api/v1/feeds/${feed.data!.id}/follow`, { userId });
    return feed;
  }
}
```

### 2. Create `src/app/profiles.ts`

```typescript
export class ProfileOperations {
  constructor(private http: HttpClient) {}

  async setupProfile(userId: string, input: ProfileFormData): Promise<SdkResponse<PublicProfile>> { ... }
  async viewProfile(userId: string, targetUid: string): Promise<SdkResponse<{ profile: PublicProfile }>> { ... }
}
```

### 3. Create `src/app/discovery.ts`

```typescript
export class DiscoveryOperations {
  constructor(private http: HttpClient) {}

  async discoverUsers(userId: string, input: { query: string; limit?: number }): Promise<SdkResponse<{ profiles: PublicProfile[] }>> { ... }
}
```

### 4. Create `src/app/index.ts` — AppClient factory

```typescript
export interface AppClient {
  content: ContentOperations;
  profiles: ProfileOperations;
  discovery: DiscoveryOperations;
}

export function createAppClient(config: HttpClientConfig): AppClient {
  assertServerSide();
  const http = new HttpClient(config);
  return {
    content: new ContentOperations(http),
    profiles: new ProfileOperations(http),
    discovery: new DiscoveryOperations(http),
  };
}
```

### 5. Create adapter handlers for `/api/app/v1/` routes

`src/adapter/handlers/app.ts`:
- Route handlers for compound operations that call services directly
- Add to `createRoutes()` in `src/adapter/routes.ts`

### 6. Create colocated specs

- Test each operation class with mocked HttpClient
- Test fail-fast on intermediate errors
- Test createAppClient factory

---

## Verification

- [ ] AppClient with 3 operation groups (content, profiles, discovery)
- [ ] 5+ compound methods following fail-fast pattern
- [ ] Uses HttpClient directly (not SvcClient)
- [ ] `/api/app/v1/` adapter routes registered
- [ ] All tests pass
