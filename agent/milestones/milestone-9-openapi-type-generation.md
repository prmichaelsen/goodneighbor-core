# Milestone 9: OpenAPI Spec, Type Generation & Health

**Status**: Not Started
**Estimated Duration**: 3 days
**Dependencies**: [M1, M8]
**Tasks**: 4 (T35-T38)

---

## Goal

Define the goodneighbor REST API contract as an OpenAPI 3.0 spec, generate TypeScript types from that spec, refactor client SDK resources to use generated types (single source of truth), and add a health/version endpoint.

---

## Context

Currently all request/response types are hand-written in `src/types/` and duplicated in client resource interfaces. The OpenAPI spec becomes the single source of truth — `openapi-typescript` generates types that both client and adapter code reference. This prevents drift between server and client.

Pattern reference: [core-sdk.client-type-generation](../patterns/core-sdk.client-type-generation.md)

---

## Architecture

```
docs/openapi.yaml          ← Source of truth (hand-written spec)
        │
        ▼
openapi-typescript          ← Build step: npm run generate:types
        │
        ▼
src/clients/svc/v1/types.generated.ts  ← Committed, auto-generated
        │
        ▼
src/clients/svc/v1/*.ts     ← Resources import generated types
src/adapter/handlers/*.ts   ← Adapter references same types
```

---

## API Routes (16 existing + 2 new)

### Existing (from M8)
```
POST   /api/v1/posts              → ContentService.createPost
GET    /api/v1/posts/:id          → ContentService.getPost
DELETE /api/v1/posts/:id          → (not implemented)
POST   /api/v1/feeds              → ContentService.createFeed
GET    /api/v1/feeds/:id          → ContentService.getFeed
POST   /api/v1/feeds/:id/follow   → FeedService.followFeed
POST   /api/v1/feeds/:id/unfollow → FeedService.unfollowFeed
POST   /api/v1/feeds/:id/submit   → FeedService.submitToFeed
GET    /api/v1/profiles/:uid      → ProfileService.getPublicProfile
PUT    /api/v1/profiles/:uid      → ProfileService.updatePublicProfile
POST   /api/v1/profiles/search    → ProfileService.searchUsers
POST   /api/v1/comments           → CommentService.createComment
GET    /api/v1/posts/:id/comments → CommentService.getComments
DELETE /api/v1/comments/:id       → (not implemented)
POST   /api/v1/search             → SearchService.search
POST   /api/v1/auth/verify        → AuthService.verifySession
```

### New
```
GET    /health                    → { status, timestamp }
GET    /version                   → { version, environment }
```

---

## Deliverables

1. `docs/openapi.yaml` — OpenAPI 3.0 spec defining all routes, schemas, error responses
2. `src/clients/svc/v1/types.generated.ts` — Auto-generated types (committed)
3. `npm run generate:types` script
4. Client resources refactored to import from generated types
5. Health resource + adapter handler
6. CI validation script (regenerate + diff check)

---

## Success Criteria

- [ ] `docs/openapi.yaml` validates with OpenAPI linter
- [ ] `npm run generate:types` produces `types.generated.ts`
- [ ] Client resources use generated types (no hand-written request/response interfaces)
- [ ] Health endpoint returns version from package.json
- [ ] `npm run build` succeeds
- [ ] All tests pass
