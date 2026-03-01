# Task 32: Client Factory & Barrel Exports

**Milestone**: [M8 - REST Client SDK](../../milestones/milestone-8-rest-client-sdk.md)
**Estimated Time**: 2 hours
**Dependencies**: Task 30 (infrastructure), Task 31 (resources)
**Status**: Not Started

---

## Objective

Create `createSvcClient(config)` factory that composes all 6 resources from a shared `HttpClient`, add barrel exports, and wire up `package.json` subpath export for `./clients/svc/v1`.

---

## Context

The factory is the consumer-facing entry point. It calls `assertServerSide()`, creates one `HttpClient` instance, passes it to all resource factories, and returns a typed `SvcClient` interface.

Pattern: [core-sdk.client-svc](../../patterns/core-sdk.client-svc.md) — factory section.

---

## Steps

### 1. Create `src/clients/svc/v1/index.ts`

```typescript
export interface SvcClient {
  posts: PostsResource;
  profiles: ProfilesResource;
  feeds: FeedsResource;
  comments: CommentsResource;
  search: SearchResource;
  auth: AuthResource;
}

export function createSvcClient(config: HttpClientConfig): SvcClient {
  assertServerSide();
  const http = new HttpClient(config);
  return {
    posts: createPostsResource(http),
    profiles: createProfilesResource(http),
    feeds: createFeedsResource(http),
    comments: createCommentsResource(http),
    search: createSearchResource(http),
    auth: createAuthResource(http),
  };
}
```

Re-export all types: `HttpClientConfig`, `SdkResponse`, `SdkError`, all resource interfaces.

### 2. Create `src/clients/index.ts` barrel

Re-export from `./svc/v1/index.ts` and shared modules (`response.ts`, `http.ts`, `guard.ts`).

### 3. Update `package.json` exports

Add:
```json
"./clients/svc/v1": {
  "types": "./dist/clients/svc/v1/index.d.ts",
  "import": "./dist/clients/svc/v1/index.js"
}
```

### 4. Update `esbuild.build.js`

Add entry point: `src/clients/svc/v1/index.ts`

### 5. Create `src/clients/svc/v1/index.spec.ts`

Test:
- `createSvcClient()` returns object with all 6 resource properties
- Resources have expected methods (type-level + runtime checks)
- Browser guard is called (mock `assertServerSide`)

### 6. Verify build

Run `npm run build` — new entry point compiles, declarations generated.

---

## Verification

- [ ] `createSvcClient()` creates client with all 6 resources
- [ ] `assertServerSide()` called at construction time
- [ ] Single `HttpClient` shared across all resources
- [ ] Subpath export `./clients/svc/v1` resolves correctly
- [ ] `npm run build` succeeds
- [ ] Tests pass
