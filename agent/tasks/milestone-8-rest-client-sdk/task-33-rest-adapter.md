# Task 33: REST Adapter (Route Handlers)

**Milestone**: [M8 - REST Client SDK](../../milestones/milestone-8-rest-client-sdk.md)
**Estimated Time**: 5 hours
**Dependencies**: Task 26 (ServiceContainer), Task 3 (domain types)
**Status**: Not Started

---

## Objective

Implement a framework-agnostic REST adapter layer that maps HTTP routes to existing service methods. The adapter produces handler functions that the goodneighbor app can wire into any HTTP framework (Hono, Express, Cloudflare Workers).

---

## Context

The goodneighbor app (`~/goodneighbor`) needs to expose the core services as HTTP endpoints. Rather than coupling to a specific framework, the adapter defines a generic `AdapterRequest` / `AdapterResponse` contract. Framework bindings are trivial one-liners in the consuming app.

The adapter uses the `ServiceContainer` from M7 to resolve services. Each handler:
1. Extracts params/body/userId from `AdapterRequest`
2. Calls the appropriate service method
3. Maps the `Result<T, E>` return to HTTP status + JSON body
4. Returns `AdapterResponse`

---

## Steps

### 1. Create `src/adapter/types.ts`

```typescript
export interface AdapterRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  body: unknown;
  userId: string;         // Extracted from auth middleware
  query?: Record<string, string>;
}

export interface AdapterResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export type RouteHandler = (req: AdapterRequest) => Promise<AdapterResponse>;

export interface Route {
  method: string;
  path: string;        // e.g. '/api/v1/posts/:id'
  handler: RouteHandler;
}
```

### 2. Create `src/adapter/handlers/posts.ts`

Handler functions for:
- `createPost(req)` → `ContentService.createPost(dto, userId)` → 201 or 400/500
- `getPost(req)` → `ContentService.getPost(id)` → 200 or 404
- `deletePost(req)` → delete logic → 204 or 404

Map `Result.ok` → success status, `Result.error` → error status based on error `kind`:
- `validation` → 400
- `not_found` → 404
- `unauthorized` → 401
- `forbidden` → 403
- `external_service` → 502
- default → 500

### 3. Create `src/adapter/handlers/profiles.ts`

- `getProfile(req)` → `ProfileService.getPublicProfile(uid)` → 200/404
- `updateProfile(req)` → `ProfileService.updatePublicProfile(uid, data)` → 200/400
- `searchProfiles(req)` → `ProfileService.searchUsers(query, limit)` → 200

### 4. Create `src/adapter/handlers/feeds.ts`

- `createFeed(req)` → 201/400
- `getFeed(req)` → 200/404
- `followFeed(req)` → 204/404
- `unfollowFeed(req)` → 204/404
- `submitToFeed(req)` → 204/400

### 5. Create `src/adapter/handlers/comments.ts`

- `createComment(req)` → 201/400
- `listComments(req)` → 200 (with cursor pagination params from query)
- `deleteComment(req)` → 204/404

### 6. Create `src/adapter/handlers/search.ts`

- `searchEntities(req)` → 200

### 7. Create `src/adapter/handlers/auth.ts`

- `verifySession(req)` → 200/401

### 8. Create `src/adapter/routes.ts`

```typescript
export function createRoutes(container: ServiceContainer): Route[] {
  const content = container.resolve('content') as ContentService;
  const profile = container.resolve('profile') as ProfileService;
  // ... resolve all services

  return [
    { method: 'POST', path: '/api/v1/posts', handler: createPost(content) },
    { method: 'GET', path: '/api/v1/posts/:id', handler: getPost(content) },
    // ... all routes from milestone doc
  ];
}
```

### 9. Create `src/adapter/index.ts` barrel

Export: `createRoutes`, types, handler factories.

### 10. Create colocated `.spec.ts` files

Test each handler with mocked services:
- Success path → correct status code and body shape
- Error path → correct error status and message
- Missing required fields → 400
- Service returns `err(NotFoundError)` → 404

---

## Verification

- [ ] `AdapterRequest`/`AdapterResponse` types defined
- [ ] All 16 routes from milestone doc have handler functions
- [ ] `createRoutes(container)` wires all handlers to resolved services
- [ ] Result→HTTP status mapping is consistent across all handlers
- [ ] All handler spec files pass
- [ ] No framework dependencies (no Hono, Express, etc.)
