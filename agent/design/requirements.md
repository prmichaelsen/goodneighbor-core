# Project Requirements

**Project Name**: goodneighbor-core
**Created**: 2026-02-28
**Status**: Active

---

## Overview

goodneighbor-core is a TypeScript library that extracts the platform-agnostic business logic from the goodneighbor Next.js application into a reusable, independently publishable npm package. It provides services for content management, search, profiles, feeds, comments, auth, notifications, and i18n — all decoupled from Next.js so they can be consumed by any deployment target (REST API, MCP server, CLI, client library).

---

## Problem Statement

The goodneighbor Next.js app embeds all business logic directly in API route handlers and React components. This makes it impossible to reuse that logic from other contexts (MCP servers, CLI tools, other services) without duplicating code. Additionally, the codebase contains significant dead code from the cleanbook project (cleaning appointments, Guesty, Mellow integrations) that pollutes the domain model.

---

## Goals and Objectives

### Primary Goals
1. Extract all goodneighbor platform business logic into a standalone TypeScript library
2. Follow core-sdk adapter patterns for clean separation of services, types, config, and errors
3. Exclude all cleanbook-related code (clean appointments, Guesty, Mellow, daily digest, manager notifications, cleaner types)
4. Achieve high test coverage on pure functions and service logic

### Secondary Goals
1. Publish as an npm package consumable by the goodneighbor Next.js app
2. Provide typed exports for all domain types, services, and constants
3. Establish patterns for adding future adapters (MCP, CLI)

---

## Functional Requirements

### Core Features

1. **Content Processing**: Extract hashtags, mentions, URLs from post content. Categorize posts (safety, events, recommendations, lost_found, general). Validate content length and media limits. Build permission refs for visibility control.

2. **Post & Feed Creation**: Create complete DbPost and DbFeed entities from DTOs with all required fields, refs, stats, timestamps. Map DB entities to ViewModels for frontend consumption.

3. **Search Integration**: Wrap Algolia for full-text search with permission-filtered queries. Index/update/delete documents. Configure searchable attributes, facets, and ranking. Support geographic search, facet filters, and highlighting.

4. **Profile Management**: CRUD for public profiles (displayName, username, bio, avatarUrl, location, website) and private profiles (email, phone, preferences). Profile boards with 17 widget types, configurable layouts, and widget templates.

5. **Feed Management**: Create feeds (user, geographic, role, dynamic types). Follow/unfollow. Submit posts to feeds. Moderate submissions (approve/reject).

6. **Comment System**: Create comments on posts. Fetch comments with pagination. Nested replies.

7. **Authentication**: Verify Firebase session cookies. Extract custom claims (isOwnerOf, isOverseerOf). Role-based access checks (owner, overseer).

8. **Notifications**: Send email via Mandrill API. Debug email capture and retrieval for testing. Configurable capture mode.

9. **Internationalization**: Translate 250+ keys across en-US and es-ES. Variable interpolation ({{variableName}}). Locale-specific date formatting. Email subject localization.

### Supporting Features

1. **Firestore Collection Constants**: All 27 collection paths as typed constants
2. **Branded ID Types**: UserId, PostId, FeedId, etc. to prevent accidental mixing
3. **Error Hierarchy**: NotFound, Validation, Unauthorized, Forbidden, Conflict, ExternalService errors with HTTP status mapping
4. **Config Validation**: Zod schemas for Firebase, Algolia, Email, and App config with fail-fast startup validation
5. **Result Type**: Discriminated Ok/Err union for operations with expected failures

---

## Non-Functional Requirements

### Performance
- Content processing functions execute in < 5ms for typical post content
- Search queries delegate to Algolia with no additional overhead beyond filter construction

### Security
- Never log secrets (Firebase service account key, Algolia admin key, Mandrill key)
- Session verification delegates to Firebase Admin SDK
- Permission filtering enforced at the search query level, not post-query

### Testability
- All services testable with mocked dependencies (no real Firebase/Algolia needed for unit tests)
- Pure functions (content processing, mappers, creators) require zero mocking
- 85% coverage target for services, 95% for pure logic

### Compatibility
- Node.js 18+
- TypeScript 5.x
- ESM module output (with CJS fallback via esbuild)
- Zero frontend dependencies (no React, no Redux, no Next.js)

---

## Technical Requirements

### Technology Stack
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+
- **Build**: esbuild (already scaffolded)
- **Test**: Jest with ts-jest (already scaffolded)
- **Validation**: Zod 4.x

### Dependencies
- `firebase-admin` — Firestore CRUD, Auth session verification, Storage
- `zod` — Config schema validation
- `algoliasearch` — Search indexing and querying

### Package Exports
```
goodneighbor-core/types      → All domain types and branded IDs
goodneighbor-core/constants  → Firestore collection paths
goodneighbor-core/errors     → Error classes and codes
goodneighbor-core/services   → All service classes
goodneighbor-core/config     → Config schemas and loader
goodneighbor-core/i18n       → Translation keys and utilities
goodneighbor-core/client     → Future: typed HTTP client
```

---

## User Stories

### As the goodneighbor Next.js app
1. I want to import ContentService so that API routes are thin wrappers around service calls
2. I want to import all domain types so that frontend and backend share the same type definitions
3. I want to import collection constants so that Firestore paths are defined in one place

### As an MCP server
1. I want to import SearchService so that AI agents can search goodneighbor content
2. I want to import ProfileService so that AI agents can look up user profiles
3. I want to import ContentService so that AI agents can create posts

### As a developer
1. I want unit-testable services so that I can verify business logic without running Firebase emulators
2. I want typed errors so that I can handle failure cases exhaustively
3. I want Zod-validated config so that misconfiguration fails at startup, not at runtime

---

## Constraints

### Technical Constraints
- Must use Firebase Admin SDK (existing production database)
- Must use Algolia (existing production search index)
- Must produce ESM output compatible with Next.js 14+
- Cannot introduce new runtime dependencies beyond firebase-admin, zod, algoliasearch

### Scope Constraints
- **Excluded**: Clean appointments, Guesty integration, Mellow integration, daily digest, manager notifications, cleaner types and collections, property management
- **Excluded**: React components, Redux slices/thunks, Next.js middleware, frontend hooks
- **Excluded**: Store/e-commerce features (products, orders, carts) — deferred to future

---

## Success Criteria

### MVP Success Criteria
- [ ] All domain types ported and exported (profiles, posts, feeds, comments, search, auth, content-entity refs)
- [ ] Collection constants ported (27 paths, cleanbook excluded)
- [ ] Content processing functions ported with unit tests (extract, categorize, validate, process)
- [ ] Post/feed creators and mappers ported with unit tests
- [ ] Config schemas defined and validated with Zod
- [ ] Error hierarchy implemented with HTTP status mapping
- [ ] Package builds and exports correctly via esbuild
- [ ] 85%+ test coverage on ported code

### Full Release Success Criteria
- [ ] All 8 services implemented (Content, Search, Profile, Feed, Comment, Auth, Notification, I18n)
- [ ] ServiceContainer wires all services with dependency injection
- [ ] Integration tests pass against Firebase emulator
- [ ] goodneighbor Next.js app successfully imports and uses goodneighbor-core
- [ ] Duplicated code removed from goodneighbor app
- [ ] npm package published and versioned

---

## Out of Scope

1. **Cleanbook features**: Clean appointments, Guesty, Mellow, daily digest, manager notifications — dead code from prior project
2. **Frontend code**: React components, Redux state, Next.js pages/middleware, CSS/Tailwind
3. **Store/e-commerce**: Products, orders, carts, addresses — deferred
4. **Adapters**: REST, MCP, CLI adapters — future milestone after core services are stable
5. **Client SDK**: Typed HTTP client — future milestone
6. **WebSocket/real-time**: Chat sessions, WebSocket streaming — stays in Next.js app

---

## Assumptions

1. Firebase Admin SDK and Algolia client are acceptable runtime dependencies for the core library
2. The goodneighbor Next.js app will be updated to import from goodneighbor-core after the library is stable
3. The existing content-entity refs permission model is correct and does not need redesign
4. i18n only needs en-US and es-ES for now (cleanbook-specific translation keys will be excluded)
5. The unified search collection (goodneighbor.search) pattern will continue to be used

---

## Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Type incompatibility between core and Next.js app | High | Medium | Share types from core as single source of truth; update app imports incrementally |
| Firebase Admin SDK version mismatch | Medium | Low | Pin compatible version range; test against goodneighbor app's firebase-admin version |
| Algolia client breaking changes | Medium | Low | Pin algoliasearch version; wrap in SearchService abstraction |
| Scope creep from cleanbook leftovers | Low | Medium | Strict exclusion list; review each ported file against scope |
| ESM/CJS compatibility issues | Medium | Medium | Test imports from both module systems; use esbuild dual output if needed |

---

## Timeline

### Phase 1: Foundation
- Types, constants, errors, config schemas
- Content processing pure functions
- Post/feed creators and mappers
- Unit tests for all pure logic

### Phase 2: Services
- ContentService, SearchService, ProfileService
- FeedService, CommentService, AuthService
- NotificationService, I18nService
- ServiceContainer wiring
- Unit tests with mocked dependencies

### Phase 3: Integration & Publishing
- Integration tests against Firebase emulator
- Package build and export verification
- npm publish
- goodneighbor Next.js app integration
- Remove duplicated code from app

---

## Stakeholders

| Role | Name/Team | Responsibilities |
|------|-----------|------------------|
| Product Owner | Patrick Michaelsen | Define requirements, prioritize features |
| Lead Developer | Patrick Michaelsen | Architecture, implementation |
| Primary Consumer | goodneighbor Next.js app | First integration target |
| Future Consumers | MCP servers, CLI tools | Additional deployment targets |

---

## References

- `agent/design/local.goodneighbor-core.md` — Architecture design document
- `agent/design/core-sdk.architecture.md` — Core SDK adapter pattern reference
- `agent/patterns/core-sdk.*.md` — 30 implementation patterns
- `/home/prmichaelsen/goodneighbor/src/` — Source application to port from

---

**Status**: Active
**Last Updated**: 2026-02-28
**Next Review**: After Phase 1 completion
