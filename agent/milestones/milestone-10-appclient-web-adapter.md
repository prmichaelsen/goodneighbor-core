# Milestone 10: AppClient & Web Adapter

**Status**: Not Started
**Estimated Duration**: 4 days
**Dependencies**: [M1, M5, M7, M8]
**Tasks**: 4 (T39-T42)

---

## Goal

Add a compound operations layer (AppClient) and a use-case web adapter (WebSDKContext + functions) that compose multiple service calls into higher-level workflows, matching remember-core's architecture.

---

## Context

The SvcClient (M8) mirrors REST routes 1:1. The AppClient composes multiple SvcClient calls into user-facing workflows (e.g., "create post and submit to feed" in one call). The web adapter provides use-case functions that wrap services with `Result<T, WebSDKError>` error handling and accept a dependency context.

Pattern references:
- [core-sdk.client-app](../patterns/core-sdk.client-app.md)
- remember-core `src/app/` and `src/web/`

---

## Architecture

```
AppClient (consumer-facing)     Web Adapter (server-side use-cases)
     │                                │
     ▼                                ▼
SvcClient → HTTP → Adapter      WebSDKContext → Services
     │                                │
     ▼                                ▼
 HttpClient                     ServiceContainer
```

**Two complementary layers:**
- **AppClient** — REST client for compound operations (`/api/app/v1/`)
- **Web Adapter** — Server-side use-case functions that call services directly

---

## Compound Operations

### Content Workflows
- `createAndSubmitToFeed(userId, postInput, feedId)` — Create post + submit to feed
- `createFeedAndFollow(userId, feedInput)` — Create feed + auto-follow

### Profile Workflows
- `setupProfile(userId, profileData)` — Create/update profile + ensure default board
- `viewProfile(userId, targetUid)` — Get profile + board in one call

### Discovery Workflows
- `discoverUsers(userId, query, limit)` — Search users + enrich with profiles

---

## Deliverables

1. `src/web/` — WebSDKContext, WebSDKError, use-case functions (~10 operations)
2. `src/app/` — AppClient factory, compound resource implementations
3. `src/adapter/handlers/app.ts` — Route handlers for `/api/app/v1/` endpoints
4. Subpath exports: `./web`, `./app`
5. OpenAPI additions to `docs/openapi.yaml` for app routes

---

## Success Criteria

- [ ] WebSDKContext wraps ServiceContainer services
- [ ] 5+ compound use-case functions implemented
- [ ] AppClient with typed resources for compound operations
- [ ] All tests pass
- [ ] Subpath exports resolve correctly
