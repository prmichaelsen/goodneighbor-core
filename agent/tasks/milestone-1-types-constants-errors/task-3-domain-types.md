# Task 3: Domain Types (Profile, Post, Feed, Comment, Search, Auth)

**Milestone**: [M1 - Types, Constants & Errors](../../milestones/milestone-1-types-constants-errors.md)
**Estimated Time**: 6 hours
**Dependencies**: Task 1 (Branded IDs, common types), Task 2 (Content entity types)
**Status**: Not Started

---

## Objective

Port all remaining domain types across 8 type files: profile types (PublicProfile, PrivateProfile, ProfileFormData, ProfileBoard, BaseWidget, 17 widget type configs), post/feed/comment DTOs and ViewModels (CreatePostDto, CreateFeedDto, PostViewModel, FeedViewModel, FeedSubmissionViewModel, Comment, CommentReply), search types (AlgoliaSearchParams, SearchResponse, SearchResultItem), auth types (CustomClaims, ServerUser, ServerSession, AuthResult), and pagination types (PaginatedResult, PaginationOptions). This is the largest type-porting task and completes the full type system for goodneighbor-core.

---

## Context

These domain types represent the application-level abstractions that services operate on. They sit on top of the content entity types from Task 2 and the branded IDs from Task 1. The types fall into several categories:

- **Profile types**: User identity and customization. The profile board system has 17 distinct widget types, each with its own configuration interface.
- **Post/Feed/Comment types**: DTOs for creation operations and ViewModels for frontend consumption. ViewModels include computed permission flags (canEdit, canDelete, isLiked) derived from refs.
- **Search types**: Algolia-specific query parameters and response shapes.
- **Auth types**: Firebase custom claims, server-side session, and authentication result.
- **Pagination types**: Generic pagination wrapper used by all list endpoints.

The types should reference branded IDs where appropriate (e.g., PostViewModel.id is PostId) and use the content entity types for database representations.

---

## Steps

### 1. Create profile.types.ts

Create `src/types/profile.types.ts`:

```typescript
import { UserId } from './common.types';
import { Timestamps } from './utils.types';

export interface PublicProfile {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverImageUrl?: string;
  location?: string;
  website?: string;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  timestamps: Timestamps;
}

export interface PrivateProfile {
  uid: string;
  email: string;
  phone?: string;
  preferences: UserPreferences;
  notifications: NotificationPreferences;
  timestamps: Timestamps;
}

export interface UserPreferences {
  language: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  commentNotifications: boolean;
  mentionNotifications: boolean;
  followerNotifications: boolean;
}

export interface ProfileFormData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  location?: string;
  website?: string;
  username?: string;
}
```

### 2. Create profile-board.types.ts

Create `src/types/profile-board.types.ts` with the board structure and all 17 widget types:

```typescript
/**
 * Profile board system.
 * Each user has a customizable profile board composed of typed widgets.
 */

export interface ProfileBoard {
  uid: string;
  widgets: BoardWidget[];
  layout: BoardLayout;
  updatedAt: string;
}

export interface BoardLayout {
  columns: number;
  gap: number;
}

/**
 * Widget type discriminator.
 * Each widget type has its own configuration interface.
 */
export type WidgetType =
  | 'bio'
  | 'links'
  | 'image_gallery'
  | 'featured_post'
  | 'pinned_posts'
  | 'recent_activity'
  | 'followers'
  | 'following'
  | 'feeds'
  | 'badges'
  | 'stats'
  | 'location_map'
  | 'custom_html'
  | 'social_links'
  | 'skills'
  | 'availability'
  | 'contact_form';

export interface BaseWidget {
  id: string;
  type: WidgetType;
  title: string;
  visible: boolean;
  order: number;
  config: WidgetConfig;
}

/**
 * Union of all widget configuration types.
 */
export type WidgetConfig =
  | BioWidgetConfig
  | LinksWidgetConfig
  | ImageGalleryWidgetConfig
  | FeaturedPostWidgetConfig
  | PinnedPostsWidgetConfig
  | RecentActivityWidgetConfig
  | FollowersWidgetConfig
  | FollowingWidgetConfig
  | FeedsWidgetConfig
  | BadgesWidgetConfig
  | StatsWidgetConfig
  | LocationMapWidgetConfig
  | CustomHtmlWidgetConfig
  | SocialLinksWidgetConfig
  | SkillsWidgetConfig
  | AvailabilityWidgetConfig
  | ContactFormWidgetConfig;

export type BoardWidget = BaseWidget;

// -- Widget Configuration Types (17 total) --

export interface BioWidgetConfig {
  maxLength?: number;
  showAvatar?: boolean;
}

export interface LinksWidgetConfig {
  maxLinks?: number;
  links: Array<{ label: string; url: string; icon?: string }>;
}

export interface ImageGalleryWidgetConfig {
  maxImages?: number;
  layout: 'grid' | 'carousel' | 'masonry';
  images: Array<{ url: string; caption?: string }>;
}

export interface FeaturedPostWidgetConfig {
  postId: string;
  showPreview: boolean;
}

export interface PinnedPostsWidgetConfig {
  maxPosts: number;
  postIds: string[];
}

export interface RecentActivityWidgetConfig {
  maxItems: number;
  activityTypes: string[];
}

export interface FollowersWidgetConfig {
  maxDisplay: number;
  showCount: boolean;
}

export interface FollowingWidgetConfig {
  maxDisplay: number;
  showCount: boolean;
}

export interface FeedsWidgetConfig {
  maxDisplay: number;
  feedIds: string[];
}

export interface BadgesWidgetConfig {
  showAll: boolean;
  badgeIds: string[];
}

export interface StatsWidgetConfig {
  metrics: string[];
  showChart: boolean;
}

export interface LocationMapWidgetConfig {
  showMap: boolean;
  zoomLevel: number;
}

export interface CustomHtmlWidgetConfig {
  html: string;
  sanitize: boolean;
}

export interface SocialLinksWidgetConfig {
  platforms: Array<{ platform: string; url: string }>;
}

export interface SkillsWidgetConfig {
  skills: Array<{ name: string; level?: number }>;
  maxDisplay: number;
}

export interface AvailabilityWidgetConfig {
  status: 'available' | 'busy' | 'away' | 'offline';
  message?: string;
  schedule?: Record<string, { start: string; end: string }>;
}

export interface ContactFormWidgetConfig {
  fields: Array<{ name: string; type: 'text' | 'email' | 'textarea'; required: boolean }>;
  recipientEmail: string;
}
```

### 3. Create post.types.ts

Create `src/types/post.types.ts`:

```typescript
import { DbPost, ContentEntityRefs, EntityStats } from './content-entity.types';
import { Timestamps } from './utils.types';

/**
 * DTO for creating a new post.
 * Field mapping to DbPost:
 *   title -> properties.displayName
 *   content -> properties.mainContent
 *   tags -> refs.hasTag and properties.tags
 *   mentions -> refs.hasMention and properties.mentions
 */
export interface CreatePostDto {
  title: string;
  content: string;
  tags?: string[];
  mentions?: string[];
  isPublic?: boolean;
  media?: PostMedia[];
}

export interface PostMedia {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
  altText?: string;
}

/**
 * Post data shaped for frontend consumption.
 * Includes computed permission flags derived from refs and the requesting user context.
 */
export interface PostViewModel {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  tags: string[];
  mentions: string[];
  media: PostMedia[];
  isPublic: boolean;
  isPublished: boolean;
  stats: EntityStats;
  timestamps: Timestamps;
  // Computed permission flags (depend on requesting user)
  canEdit: boolean;
  canDelete: boolean;
  isLiked: boolean;
  isFollowing: boolean;
  isOwner: boolean;
}
```

### 4. Create feed.types.ts

Create `src/types/feed.types.ts`:

```typescript
import { DbFeed, FeedEntityRefs, FeedProperties, FeedBehavior, EntityStats, FeedSubtype } from './content-entity.types';
import { Timestamps } from './utils.types';

/**
 * DTO for creating a new feed.
 */
export interface CreateFeedDto {
  name: string;
  description: string;
  subtype: FeedSubtype;
  rules?: string[];
  isPublic?: boolean;
  parentFeed?: string;
}

/**
 * Feed data shaped for frontend consumption.
 */
export interface FeedViewModel {
  id: string;
  name: string;
  description: string;
  subtype: FeedSubtype;
  rules: string[];
  isPublic: boolean;
  isPublished: boolean;
  stats: EntityStats;
  timestamps: Timestamps;
  parentFeed?: string;
  childrenFeeds: string[];
  behavior: FeedBehavior;
  // Computed permission flags
  isOwner: boolean;
  isModerator: boolean;
  isMember: boolean;
  isFollowing: boolean;
  canPost: boolean;
  canModerate: boolean;
}

/**
 * Feed submission data shaped for frontend consumption.
 */
export interface FeedSubmissionViewModel {
  id: string;
  feedId: string;
  postId: string;
  createdBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  autoApproveReason?: string;
  rejectionReason?: string;
  // Enriched data
  postTitle?: string;
  postAuthorUsername?: string;
}
```

### 5. Create comment.types.ts

Create `src/types/comment.types.ts`:

```typescript
import { Timestamps } from './utils.types';

/**
 * Comment on a post.
 */
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  timestamps: Timestamps;
  replyCount: number;
  likeCount: number;
  isLiked: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Reply to a comment.
 */
export interface CommentReply {
  id: string;
  commentId: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  timestamps: Timestamps;
  likeCount: number;
  isLiked: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * DTO for creating a comment.
 */
export interface CreateCommentDto {
  postId: string;
  content: string;
}

/**
 * DTO for creating a reply to a comment.
 */
export interface CreateCommentReplyDto {
  commentId: string;
  content: string;
}
```

### 6. Create search.types.ts

Create `src/types/search.types.ts`:

```typescript
import { SearchEntityType } from './content-entity.types';

/**
 * Parameters for an Algolia search query.
 * Maps to Algolia's SearchParams with goodneighbor-specific filters.
 */
export interface AlgoliaSearchParams {
  query: string;
  page?: number;
  hitsPerPage?: number;
  filters?: string;
  facetFilters?: string[][];
  attributesToRetrieve?: string[];
  attributesToHighlight?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
  aroundLatLng?: string;
  aroundRadius?: number;
  typoTolerance?: boolean | 'min' | 'strict';
}

/**
 * Search response wrapper.
 */
export interface SearchResponse<T = SearchResultItem> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  facets?: Record<string, Record<string, number>>;
}

/**
 * Individual search result hit.
 */
export interface SearchResultItem {
  objectID: string;
  type: SearchEntityType;
  name: string;
  search: string;
  isPublic: boolean;
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  _highlightResult?: Record<string, HighlightResult>;
}

export interface HighlightResult {
  value: string;
  matchLevel: 'none' | 'partial' | 'full';
  matchedWords: string[];
}

/**
 * Goodneighbor-specific search filter options.
 * Used to build Algolia facetFilters from user context and query params.
 */
export interface SearchFilterOptions {
  userId?: string;
  entityTypes?: SearchEntityType[];
  tags?: string[];
  isPublic?: boolean;
  feedId?: string;
}
```

### 7. Create auth.types.ts

Create `src/types/auth.types.ts`:

```typescript
/**
 * Firebase custom claims attached to user tokens.
 * Used for role-based access control.
 */
export interface CustomClaims {
  isOwnerOf?: string[];
  isOverseerOf?: string[];
  [key: string]: any;
}

/**
 * Server-side representation of an authenticated user.
 * Derived from verifying a Firebase session cookie.
 */
export interface ServerUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  customClaims: CustomClaims;
}

/**
 * Server session containing the authenticated user and session metadata.
 */
export interface ServerSession {
  user: ServerUser;
  expiresAt: string;
  createdAt: string;
}

/**
 * Result of an authentication operation (login, session verification).
 */
export interface AuthResult {
  success: boolean;
  user?: ServerUser;
  session?: ServerSession;
  error?: string;
}
```

### 8. Create pagination.types.ts

Create `src/types/pagination.types.ts`:

```typescript
/**
 * Options for paginated queries.
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated result wrapper.
 * Generic over the item type T.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
}

/**
 * Default pagination values.
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
```

### 9. Update types/index.ts Barrel Export

Update `src/types/index.ts` to export all type modules:

```typescript
export * from './common.types';
export * from './result.types';
export * from './utils.types';
export * from './content-entity.types';
export * from './profile.types';
export * from './profile-board.types';
export * from './post.types';
export * from './feed.types';
export * from './comment.types';
export * from './search.types';
export * from './auth.types';
export * from './pagination.types';
```

### 10. Verify All Types Compile

Run `npm run typecheck` to verify the full type system compiles without errors.

---

## Verification

- [ ] `src/types/profile.types.ts` exists with PublicProfile, PrivateProfile, ProfileFormData, UserPreferences, NotificationPreferences
- [ ] `src/types/profile-board.types.ts` exists with ProfileBoard, BaseWidget, WidgetType (17 values), and all 17 widget config interfaces
- [ ] `src/types/post.types.ts` exists with CreatePostDto, PostMedia, PostViewModel
- [ ] `src/types/feed.types.ts` exists with CreateFeedDto, FeedViewModel, FeedSubmissionViewModel
- [ ] `src/types/comment.types.ts` exists with Comment, CommentReply, CreateCommentDto, CreateCommentReplyDto
- [ ] `src/types/search.types.ts` exists with AlgoliaSearchParams, SearchResponse, SearchResultItem, HighlightResult, SearchFilterOptions
- [ ] `src/types/auth.types.ts` exists with CustomClaims, ServerUser, ServerSession, AuthResult
- [ ] `src/types/pagination.types.ts` exists with PaginationOptions, PaginatedResult, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT
- [ ] `src/types/index.ts` barrel exports all 12 type modules
- [ ] TypeScript compiles without errors
- [ ] No cleanbook types present (no clean appointments, Guesty, Mellow, daily digest, manager notifications, cleaner types)
- [ ] WidgetType has exactly 17 values

---

## Expected Output

**File Structure**:
```
src/types/
├── __tests__/
│   ├── common.types.spec.ts         # From Task 1
│   ├── result.types.spec.ts         # From Task 1
│   └── content-entity.types.spec.ts # From Task 2
├── index.ts                         # UPDATED: Full barrel export (12 modules)
├── common.types.ts                  # From Task 1
├── result.types.ts                  # From Task 1
├── utils.types.ts                   # From Task 1
├── content-entity.types.ts          # From Task 2
├── profile.types.ts                 # NEW
├── profile-board.types.ts           # NEW
├── post.types.ts                    # NEW
├── feed.types.ts                    # NEW
├── comment.types.ts                 # NEW
├── search.types.ts                  # NEW
├── auth.types.ts                    # NEW
└── pagination.types.ts              # NEW
```

**Key Files Created**:
- `src/types/profile.types.ts`: User profile types for public/private profile CRUD
- `src/types/profile-board.types.ts`: Profile board and widget system with 17 widget types
- `src/types/post.types.ts`: Post creation DTO and frontend ViewModel
- `src/types/feed.types.ts`: Feed creation DTO, ViewModel, and submission ViewModel
- `src/types/comment.types.ts`: Comment and reply types with creation DTOs
- `src/types/search.types.ts`: Algolia search parameters and response types
- `src/types/auth.types.ts`: Firebase auth types for server-side session management
- `src/types/pagination.types.ts`: Generic pagination types with defaults

---

## Common Issues and Solutions

### Issue 1: WidgetConfig union type too large for type inference
**Symptom**: TypeScript IntelliSense becomes slow or imprecise on WidgetConfig
**Solution**: This is expected with large union types. Consumers should narrow via the `type` discriminator on BaseWidget before accessing `config`. Consider using a generic `Widget<T extends WidgetType>` mapped type in the future if ergonomics become a problem.

### Issue 2: PostViewModel circular dependency with content-entity types
**Symptom**: Import cycles between post.types.ts and content-entity.types.ts
**Solution**: PostViewModel should import from content-entity.types.ts (EntityStats, etc.) but content-entity.types.ts should never import from post.types.ts. The dependency is one-directional.

### Issue 3: SearchResponse generic defaults mask type errors
**Symptom**: `SearchResponse` used without generic parameter silently defaults to `SearchResultItem`
**Solution**: The default generic `T = SearchResultItem` is intentional for convenience. Consumers can specify a different hit type: `SearchResponse<CustomHit>`.

---

## Resources

- Design doc: `agent/design/local.goodneighbor-core.md` -- Service interfaces define which types each service operates on
- Design doc: `agent/design/requirements.md` -- Functional requirements reference the type names
- `@prmichaelsen/goodneighbor-types` v1.6.0 -- Cross-reference for profile and widget types

---

## Notes

- This is the largest task in Milestone 1. Consider breaking it into sub-sessions if needed.
- The 17 widget types are an estimate based on the WidgetType union. Cross-reference with the source goodneighbor app if the exact widget configurations differ.
- PostViewModel and FeedViewModel include computed permission flags (canEdit, canDelete, isLiked, etc.). These are computed by mapper functions in Milestone 3, not stored in the database.
- The existing shared.types.ts scaffold file may need to be removed or emptied after this task, since all types are now in their dedicated files.
- Auth types use Firebase-specific concepts (custom claims, session cookies). These will be wrapped by AuthService in Milestone 5.

---

**Next Task**: [Task 4: Firestore Collection Constants](./task-4-collection-constants.md)
**Related Design Docs**: `agent/design/local.goodneighbor-core.md`, `agent/design/requirements.md`
**Estimated Completion Date**: TBD
