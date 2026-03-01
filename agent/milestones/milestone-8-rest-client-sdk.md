# Milestone 8: REST Client SDK

**Goal**: Implement a Supabase-style REST client SDK with typed resource wrappers, shared HTTP transport, and a lightweight REST adapter that the goodneighbor app can deploy
**Duration**: 4-5 days
**Dependencies**: M1 (Types), M5 (Core Services), M7 (ServiceContainer, Build)
**Status**: Not Started

---

## Overview

This milestone adds two layers to goodneighbor-core:

1. **REST Adapter** — A thin HTTP handler layer that maps REST routes to existing service methods. This lets the goodneighbor app (`~/goodneighbor`) deploy the core services as HTTP endpoints (e.g., via Hono, Express, or Cloudflare Workers). The adapter produces framework-agnostic handler functions that receive parsed requests and return typed responses.

2. **Client SDK** — Supabase-style typed REST client wrappers following the `SdkResponse<T>` pattern (`{ data, error, throwOnError() }`). Organized by resource group (posts, profiles, feeds, comments, search, auth). Consumers call typed methods instead of writing raw `fetch()` calls.

Both layers are **server-side only**. A browser guard prevents accidental import of credentials into client bundles.

### Architecture

```
┌─────────────────────────────┐
│  Consumer (MCP, Worker, CLI)│
│  client.posts.create(...)   │
└─────────────┬───────────────┘
              │
   ┌──────────▼──────────┐
   │    Client SDK        │
   │  src/clients/svc/v1/ │
   │  (SdkResponse<T>)    │
   └──────────┬──────────┘
              │ fetch()
   ┌──────────▼──────────┐
   │   REST Adapter       │
   │  src/adapter/        │
   │  (route handlers)    │
   └──────────┬──────────┘
              │
   ┌──────────▼──────────┐
   │  Core Services       │
   │  (M5, existing)      │
   └─────────────────────┘
```

### Design Decisions

- **Framework-agnostic adapter**: Handler functions accept `{ params, body, userId }` and return `{ status, body }`. Framework bindings (Hono, Express) are left to the consuming app.
- **Dual auth**: HttpClient supports both `getAuthToken` callback (consumer resolves tokens) and `auth.serviceToken` (SDK generates JWTs via optional `jsonwebtoken` peer dep).
- **No OpenAPI codegen initially**: Types are hand-written from existing service types. OpenAPI spec and type generation can be added later.
- **Resource grouping matches services**: PostsResource ↔ ContentService (posts), FeedsResource ↔ FeedService, ProfilesResource ↔ ProfileService, CommentsResource ↔ CommentService, SearchResource ↔ SearchService, AuthResource ↔ AuthService.
- **Edge-compatible**: No Node.js-only APIs. Uses standard `fetch()` and Web Crypto.

### Patterns Applied

- [REST Client SDK (Overview)](../patterns/core-sdk.rest-client-sdk.md)
- [SDK Response](../patterns/core-sdk.client-response.md) — referenced from core-sdk
- [HTTP Transport](../patterns/core-sdk.client-http-transport.md) — referenced from core-sdk
- [Service Client](../patterns/core-sdk.client-svc.md) — referenced from core-sdk

---

## Deliverables

### 1. Client SDK Infrastructure
- `src/clients/response.ts` — `SdkResponse<T>`, `SdkError`, `createSuccess()`, `createError()`, `fromHttpResponse()`
- `src/clients/http.ts` — `HttpClient` class with dual auth, JSON serialization, error normalization
- `src/clients/guard.ts` — `assertServerSide()` browser guard

### 2. Resource Implementations
- `src/clients/svc/v1/posts.ts` — PostsResource (create, get, list, delete)
- `src/clients/svc/v1/profiles.ts` — ProfilesResource (get, update, search, getBoard)
- `src/clients/svc/v1/feeds.ts` — FeedsResource (create, get, follow, unfollow, submit, list)
- `src/clients/svc/v1/comments.ts` — CommentsResource (create, list, delete)
- `src/clients/svc/v1/search.ts` — SearchResource (search, index)
- `src/clients/svc/v1/auth.ts` — AuthResource (verifySession)

### 3. Client Factory
- `src/clients/svc/v1/index.ts` — `createSvcClient(config)` factory composing all resources

### 4. REST Adapter
- `src/adapter/types.ts` — `AdapterRequest`, `AdapterResponse`, route handler types
- `src/adapter/routes.ts` — Route definitions mapping HTTP method+path to handler functions
- `src/adapter/handlers/` — Handler functions for each resource (posts, profiles, feeds, comments, search, auth)
- `src/adapter/index.ts` — `createRouter(container)` factory wiring handlers to ServiceContainer

### 5. Package Integration
- Updated `package.json` exports: `./clients/svc/v1`, `./adapter`
- Updated `esbuild.build.js` entry points
- Updated root barrel `src/index.ts`

---

## Success Criteria

- [ ] `createSvcClient()` creates a typed client with all 6 resource groups
- [ ] Every resource method returns `SdkResponse<T>` (never throws)
- [ ] `throwOnError()` works for opt-in exception style
- [ ] HttpClient resolves auth via callback or service token
- [ ] Browser guard throws when `window` is defined
- [ ] REST adapter maps all routes to correct service methods
- [ ] Adapter handlers validate required fields and return proper HTTP status codes
- [ ] `npm run build` succeeds with new entry points
- [ ] All new code has colocated `.spec.ts` tests
- [ ] Existing 457 tests still pass

---

## API Routes (Designed)

```
POST   /api/v1/posts              → ContentService.createPost
GET    /api/v1/posts/:id          → ContentService.getPost
DELETE /api/v1/posts/:id          → ContentService.deletePost

POST   /api/v1/feeds              → FeedService.createFeed (via ContentService)
GET    /api/v1/feeds/:id          → ContentService.getFeed
POST   /api/v1/feeds/:id/follow   → FeedService.followFeed
POST   /api/v1/feeds/:id/unfollow → FeedService.unfollowFeed
POST   /api/v1/feeds/:id/submit   → FeedService.submitToFeed

GET    /api/v1/profiles/:uid      → ProfileService.getPublicProfile
PUT    /api/v1/profiles/:uid      → ProfileService.updatePublicProfile
POST   /api/v1/profiles/search    → ProfileService.searchUsers

POST   /api/v1/comments           → CommentService.createComment
GET    /api/v1/posts/:id/comments → CommentService.listComments
DELETE /api/v1/comments/:id       → CommentService.deleteComment

POST   /api/v1/search             → SearchService.search

POST   /api/v1/auth/verify        → AuthService.verifySession
```
