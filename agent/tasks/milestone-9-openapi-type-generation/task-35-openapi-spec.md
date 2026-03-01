# Task 35: OpenAPI 3.0 Specification

**Milestone**: [M9 - OpenAPI Spec, Type Generation & Health](../../milestones/milestone-9-openapi-type-generation.md)
**Estimated Time**: 4 hours
**Dependencies**: Tasks 1-3 (types), Task 33 (adapter routes)
**Status**: Not Started

---

## Objective

Write a complete OpenAPI 3.0 spec (`docs/openapi.yaml`) defining all 16 existing REST routes + 2 health endpoints, with request/response schemas matching existing TypeScript types.

---

## Context

The spec becomes the single source of truth for the API contract. Schemas must match the existing types in `src/types/` exactly. The spec will be used by `openapi-typescript` to generate client types (Task 36).

---

## Steps

### 1. Create `docs/openapi.yaml`

Define:
- `openapi: 3.0.3`
- `info`: title, version (from package.json), description
- `servers`: localhost, production placeholder

### 2. Define component schemas

Map existing TypeScript types to OpenAPI schemas:
- `CreatePostDto`, `PostViewModel`, `DbPost`
- `CreateFeedDto`, `FeedViewModel`, `DbFeed`
- `CreateCommentDto`, `Comment`, `PaginatedResult`
- `PublicProfile`, `ProfileFormData`
- `AlgoliaSearchParams`, `SearchResponse`, `SearchResultItem`
- `ServerUser`, `CustomClaims`
- `SdkError` (error response shape)

### 3. Define all paths

18 endpoints (16 existing + 2 health):
- Posts: POST/GET/DELETE `/api/v1/posts`
- Feeds: POST/GET `/api/v1/feeds`, follow/unfollow/submit
- Profiles: GET/PUT `/api/v1/profiles/:uid`, POST search
- Comments: POST/GET/DELETE
- Search: POST `/api/v1/search`
- Auth: POST `/api/v1/auth/verify`
- Health: GET `/health`, GET `/version`

### 4. Define error responses

Reusable error response components:
- 400 (ValidationError), 401, 403, 404, 409, 429, 500, 502

### 5. Validate spec

Run `npx @redocly/cli lint docs/openapi.yaml` or equivalent.

---

## Verification

- [ ] All 18 routes defined with correct methods
- [ ] Request body schemas match existing TypeScript DTOs
- [ ] Response schemas match existing TypeScript view models
- [ ] Error responses use consistent SdkError shape
- [ ] Spec validates without errors
