# Good Neighbor Core Library

**Concept**: Extract platform-agnostic business logic from the goodneighbor Next.js app into a reusable core SDK
**Created**: 2026-02-28
**Status**: Design Specification

---

## Overview

goodneighbor-core extracts the business logic, types, and services from the goodneighbor Next.js application into a standalone TypeScript library following the core-sdk adapter pattern. This enables the same logic to be consumed by the Next.js frontend, a standalone REST API, MCP servers, CLI tools, or any other deployment target.

The goodneighbor app is a community/neighborhood platform with content publishing (posts, feeds), user profiles with customizable boards, search (Algolia), Firebase auth/storage, and i18n. The core library captures the domain logic — content processing, permission model, search integration, profile management — independent of Next.js.

**Source**: `/home/prmichaelsen/goodneighbor/src/`
**Target**: `/home/prmichaelsen/.acp/projects/goodneighbor-core/src/`

---

## Problem Statement

The goodneighbor codebase tightly couples business logic to Next.js API routes and React/Redux state. This means:

1. **No reuse**: The same content processing, permission checks, and search logic cannot be used from an MCP server or CLI without duplicating code.
2. **Testing difficulty**: Business logic is interleaved with HTTP request/response handling, making unit testing harder.
3. **Cleanbook leftovers**: The codebase contains unused cleaner/appointment/Guesty/Mellow code that should not be ported.
4. **No typed client SDK**: Consumers must hand-craft HTTP calls with no type safety.

---

## Solution

Build goodneighbor-core as a standalone npm package following the core-sdk patterns:

- **Services** implement business logic with dependency injection (service-base, service-interface patterns)
- **Types** define all domain entities, DTOs, and branded IDs (types-shared, types-result patterns)
- **Config** validates environment variables at startup with Zod schemas (config-schema, config-environment patterns)
- **Errors** use a typed hierarchy mapped to HTTP/MCP status codes (service-error-handling pattern)
- **Adapters** are thin wrappers for REST, MCP, CLI deployment (adapter-* patterns)

---

## Implementation

### Source Architecture

```
src/
├── types/
│   ├── index.ts                    # Barrel export
│   ├── common.types.ts             # Branded IDs: UserId, PostId, FeedId, etc.
│   ├── profile.types.ts            # PublicProfile, PrivateProfile, ProfileFormData
│   ├── profile-board.types.ts      # ProfileBoard, BaseWidget, WidgetType, configs
│   ├── post.types.ts               # DbPost, CreatePostDto, PostViewModel
│   ├── feed.types.ts               # DbFeed, CreateFeedDto, FeedViewModel, FeedSubmission
│   ├── comment.types.ts            # Comment, CommentReply
│   ├── search.types.ts             # SearchParams, SearchResponse, SearchEntityType, filters
│   ├── auth.types.ts               # CustomClaims, ServerUser, ServerSession, AuthResult
│   ├── content-entity.types.ts     # ContentEntityRefs (the permission model)
│   ├── pagination.types.ts         # PaginatedResult, PaginationOptions
│   ├── result.types.ts             # Result<T, E> (already scaffolded)
│   └── utils.types.ts              # DeepPartial, Nullable, etc. (already scaffolded)
│
├── constants/
│   └── collections.ts              # Firestore collection paths (goodneighbor-scoped only)
│
├── errors/
│   ├── index.ts                    # Barrel export
│   ├── base.error.ts               # BaseError (already scaffolded)
│   ├── app-errors.ts               # NotFound, Validation, Unauthorized, Forbidden, Conflict, ExternalService
│   └── error-codes.ts              # Error code → HTTP status mapping
│
├── config/
│   ├── index.ts
│   ├── schema.ts                   # Zod schemas: FirebaseConfig, AlgoliaConfig, EmailConfig, AppConfig
│   └── loader.ts                   # Load and validate from env vars
│
├── services/
│   ├── index.ts
│   ├── base.service.ts             # BaseService (already scaffolded)
│   ├── content.service.ts          # Content processing, post/feed creation
│   ├── content.service.spec.ts
│   ├── search.service.ts           # Algolia search wrapper with permission filtering
│   ├── search.service.spec.ts
│   ├── profile.service.ts          # Public/private profile CRUD, profile boards
│   ├── profile.service.spec.ts
│   ├── feed.service.ts             # Feed create, follow, submit, moderate
│   ├── feed.service.spec.ts
│   ├── comment.service.ts          # Comment create, fetch, replies
│   ├── comment.service.spec.ts
│   ├── auth.service.ts             # Session verification, claims checking
│   ├── auth.service.spec.ts
│   ├── notification.service.ts     # Email sending (Mandrill), debug capture
│   ├── notification.service.spec.ts
│   ├── i18n.service.ts             # Translation with variable interpolation
│   ├── i18n.service.spec.ts
│   └── container.ts                # ServiceContainer wiring
│
├── i18n/
│   ├── index.ts
│   ├── types.ts                    # Language type ("en-US" | "es-ES")
│   ├── keys.ts                     # TranslationKeys enum
│   ├── translations/
│   │   ├── common.ts               # Shared translations
│   │   └── email.ts                # Email-specific translations
│   └── utils.ts                    # formatDateForLanguage, translateEmailSubject
│
├── lib/
│   ├── content-processing.ts       # extractHashtags, extractMentions, extractUrls, categorizePost, validatePostContent, processPostContent
│   ├── creators/
│   │   ├── post-creators.ts        # buildPostRefs, createPostEntity
│   │   └── feed-creators.ts        # createFeedEntity
│   ├── mappers/
│   │   ├── post-mappers.ts         # mapDbPostToViewModel
│   │   └── feed-mappers.ts         # mapDbFeedToViewModel, mapDbFeedSubmissionToViewModel
│   └── algolia.ts                  # Algolia admin/search client, indexing, initializeAlgoliaIndex
│
├── client/
│   ├── index.ts                    # createClient() factory
│   └── ... (future: typed HTTP client per client-svc pattern)
│
└── testing/
    ├── index.ts
    ├── fixtures.ts                 # Test data factories
    └── helpers.ts                  # Test utilities
```

### Key Domain Concepts

#### ContentEntityRefs (Permission Model)

This is the central permission model from goodneighbor. Every entity (post, feed, etc.) carries refs arrays that control access:

```typescript
interface ContentEntityRefs {
  hasViewer: string[];              // "@public" or ["@uid:{firebaseUid}"] for visibility
  hasOwner: string[];               // ["@uid:{firebaseUid}"]
  hasFollower: string[];
  hasSharer: string[];
  hasLiker: string[];
  hasTag: string[];                 // hashtags (plain strings)
  hasMention: string[];             // UIDs resolved from @username at creation time
  hasAuthor: string[];
  hasCreator: string[];
  hasCollaborator: string[];
  hasEditPermissions: string[];
  hasArchivePermissions: string[];
  hasUpdateViewersPermissions: string[];
  hasConfigurePropertiesPermissions: string[];
}
// Semantic IDs use @uid:{firebaseUid} format (not usernames) to avoid
// fan-out updates on username changes. @public is the only system token.
```
```

This maps directly to Algolia facets for permission-filtered search.

#### Unified Search Collection

All content entities live in a single Firestore collection (`goodneighbor.search`) with a `type` discriminator. Algolia mirrors this with faceted search across entity types.

#### Content Processing Pipeline

```
CreatePostDto
  → validatePostContent()      # length/media limits
  → processPostContent()       # extract hashtags, mentions, URLs, categorize
  → buildPostRefs()            # construct permission refs
  → createPostEntity()         # build DbPost with all fields
  → indexDocument()            # push to Algolia
  → Firestore write            # persist to SEARCH collection
```

### Services Detail

#### ContentService
**Port from**: `lib/content-processing.ts`, `lib/creators/post-creators.ts`, `lib/creators/feed-creators.ts`, `lib/mappers/post-mappers.ts`, `lib/mappers/feed-mappers.ts`

- `validatePostContent(dto)` → `Result<ValidatedPost, ValidationError>`
- `processPostContent(dto)` → processed content with hashtags, mentions, URLs, category
- `createPost(dto, userId)` → `Result<DbPost, ValidationError>`
- `createFeed(dto, userId)` → `Result<DbFeed, ValidationError>`
- `mapPostToViewModel(dbPost, userContext)` → `PostViewModel`
- `mapFeedToViewModel(dbFeed, userContext)` → `FeedViewModel`

#### SearchService
**Port from**: `lib/search.ts`, `lib/algolia.ts`

- `search(params, userContext)` → `Result<SearchResponse, ExternalServiceError>`
- `indexDocument(doc)` → `Result<void, ExternalServiceError>`
- `indexDocuments(docs)` → `Result<void, ExternalServiceError>`
- `deleteDocument(id)` → `Result<void, ExternalServiceError>`
- `initializeIndex()` → configure searchable attributes, facets, ranking

#### ProfileService
**Port from**: Profile API routes

- `getPublicProfile(username)` → `Result<PublicProfile, NotFoundError>`
- `updatePublicProfile(userId, data)` → `Result<PublicProfile, ValidationError>`
- `getPrivateProfile(userId)` → `Result<PrivateProfile, NotFoundError>`
- `updatePrivateProfile(userId, data)` → `Result<PrivateProfile, ValidationError>`
- `getProfileBoard(userId)` → `Result<ProfileBoard, NotFoundError>`
- `createDefaultBoard(userId)` → `Result<ProfileBoard, ConflictError>`
- `updateBoard(userId, data)` → `Result<ProfileBoard, ValidationError>`

#### FeedService
**Port from**: Feed API routes, `lib/creators/feed-creators.ts`

- `createFeed(dto, userId)` → `Result<DbFeed, ValidationError>`
- `getFeed(feedId)` → `Result<FeedViewModel, NotFoundError>`
- `followFeed(feedId, userId)` → `Result<void, NotFoundError>`
- `unfollowFeed(feedId, userId)` → `Result<void, NotFoundError>`
- `submitToFeed(feedId, postId, userId)` → `Result<FeedSubmission, ForbiddenError>`

#### CommentService
**Port from**: Comment API routes

- `createComment(postId, content, userId)` → `Result<Comment, ValidationError>`
- `getComments(postId, pagination)` → `Result<PaginatedResult<Comment>, NotFoundError>`

#### AuthService
**Port from**: `lib/auth-server.ts`

- `verifySession(sessionCookie)` → `Result<ServerUser, UnauthorizedError>`
- `isOwner(claims, appName)` → `boolean`
- `isOverseer(claims, appName)` → `boolean`
- `requireOwner(session)` → `Result<ServerUser, ForbiddenError>`

#### NotificationService
**Port from**: `lib/notification-utils.ts`

- `sendEmail(to, subject, html, options)` → `Result<void, ExternalServiceError>`
- `storeDebugEmail(to, subject, html)` → `Result<string, Error>`
- `getDebugEmails(limit, filters?)` → `Result<DebugEmail[], Error>`

#### I18nService
**Port from**: `lib/i18n/`

- `translate(key, language, variables?)` → `string`
- `formatDate(date, language)` → `string`
- Languages: `"en-US" | "es-ES"`
- 250+ translation keys

### Collections to Port (excluding cleanbook)

```typescript
// Profile
PUBLIC_PROFILES = "goodneighbor/collections/public-profiles"
PRIVATE_PROFILES = "goodneighbor/collections/private-profiles"
PROFILE_BOARDS = "goodneighbor/collections/profile-boards"
USERS = "goodneighbor/collections/users"

// Auth
PASSWORD_RESETS = "goodneighbor/collections/password-resets"
EMAIL_VERIFICATIONS = "goodneighbor/collections/email-verifications"

// Content
SEARCH = "goodneighbor.search"
SEARCH_DB_ID_MAPPINGS = "goodneighbor/collections/search-id-mappings"
POST_COMMENTS = "goodneighbor/collections/post-comments"
COMMENT_REPLIES = "goodneighbor/collections/comment-replies"

// Relationships
FEED_SUBMISSIONS = "goodneighbor/collections/feed-submissions"
FEED_FOLLOWERS = "goodneighbor/collections/feed-followers"
FEED_MODERATORS = "goodneighbor/collections/feed-moderators"
USER_VOTES = "goodneighbor/collections/user-votes"

// Store
PRODUCTS = "goodneighbor/collections/products"
STORE_SETTINGS = "goodneighbor/collections/store-settings"
ORDERS = "goodneighbor/collections/orders"
CARTS = "goodneighbor/collections/carts"
ADDRESSES = "goodneighbor/collections/addresses"

// System
SYSTEM_SETTINGS = "goodneighbor/collections/system-settings"
WEBHOOK_EVENTS = "goodneighbor/collections/webhook-events"
DEBUG_EMAILS = "goodneighbor/collections/debug-emails"
CHAT_SESSIONS = "goodneighbor/collections/chat-sessions"
CHAT_MESSAGES = "goodneighbor/collections/chat-messages"
WAITLIST_CODES = "goodneighbor/collections/waitlist-codes"
EDITOR = "goodneighbor/collections/editor"
```

### Config Schema

```typescript
const AppConfigSchema = z.object({
  env: z.enum(["development", "staging", "production"]),
  appName: z.string().default("goodneighbor"),
  appUrl: z.string().url(),
});

const FirebaseConfigSchema = z.object({
  serviceAccountKey: z.string(), // Secret<string> at runtime
  projectId: z.string().optional(),
});

const AlgoliaConfigSchema = z.object({
  appId: z.string(),
  adminApiKey: z.string(),       // Secret<string> at runtime
  searchApiKey: z.string(),
  indexName: z.string().default("goodneighbor_search"),
});

const EmailConfigSchema = z.object({
  mandrillApiKey: z.string().optional(), // Secret<string>
  supportEmail: z.string().email(),
  fromName: z.string().default("Good Neighbor"),
});

const GoodNeighborConfigSchema = z.object({
  app: AppConfigSchema,
  firebase: FirebaseConfigSchema,
  algolia: AlgoliaConfigSchema,
  email: EmailConfigSchema,
});
```

---

## Benefits

- **Reusability**: Same content processing, search, and permission logic across Next.js, MCP, CLI
- **Testability**: Services unit-testable with mocked dependencies, no HTTP layer
- **Type safety**: Branded IDs, Result types, Zod-validated config prevent runtime errors
- **Clean codebase**: Cleanbook leftovers excluded; only goodneighbor platform code ported
- **Client SDK**: Future typed client for external consumers

---

## Trade-offs

- **Migration effort**: Porting from Next.js API routes to service pattern requires rewriting route handlers as thin adapter calls
- **Firebase coupling**: Services depend on Firebase Admin SDK; abstracting further (repository pattern) adds complexity we don't need yet
- **Algolia coupling**: SearchService directly wraps Algolia; if we switch search providers we'd need to change the service internals (acceptable for now)

---

## Dependencies

### Runtime
- `firebase-admin` — Firestore, Auth, Storage
- `zod` — Config validation, schema definitions
- `algoliasearch` — Search indexing and querying

### Dev
- `typescript`, `jest`, `ts-jest`, `esbuild` — Already scaffolded by core-sdk package

---

## Testing Strategy

- **Unit tests** for each service (`.spec.ts` colocated), mock Firebase and Algolia
- **Content processing** fully unit-testable (pure functions)
- **Mappers** fully unit-testable (pure functions)
- **Integration tests** for Firebase read/write and Algolia indexing against emulators
- **Coverage target**: 85% for services, 95% for pure logic (content-processing, mappers)

---

## Migration Path

1. Port types and constants first (no behavior, just definitions)
2. Port pure functions (content-processing, creators, mappers) — easiest to test
3. Port services with Firebase/Algolia dependencies
4. Wire up ServiceContainer
5. Create adapter examples (REST routes that delegate to services)
6. Integrate back into goodneighbor Next.js app by importing from goodneighbor-core
7. Remove duplicated code from goodneighbor app

---

## Future Considerations

- **Store/e-commerce services**: Products, orders, carts (lower priority)
- **MCP adapter**: Expose content/search as MCP tools for AI agents
- **CLI adapter**: Admin operations from command line
- **Client SDK**: Typed HTTP client following client-svc/client-app patterns
- **Event system**: Pub/sub for cross-service events (post created → index in Algolia)

---

**Status**: Design Specification — Ready for Planning
**Recommendation**: Proceed with `@acp-plan` to create milestones and tasks from this design
**Related Documents**:
- `agent/design/core-sdk.architecture.md` — Core SDK adapter pattern reference
- `agent/patterns/core-sdk.*.md` — 30 implementation patterns to follow
