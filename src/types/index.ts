// src/types/index.ts

// Branded IDs and semantic ID helpers (goodneighbor-specific)
export type {
  UserId,
  PostId,
  FeedId,
  CommentId,
  FeedSubmissionId,
  SearchEntityId,
} from './common.types';

export {
  createUserId,
  createPostId,
  createFeedId,
  createCommentId,
  createFeedSubmissionId,
  createSearchEntityId,
  formatUserRef,
  SYSTEM_TOKENS,
} from './common.types';

// Result type
export type { Result, Ok, Err } from './result.types';
export {
  ok,
  err,
  isOk,
  isErr,
  mapOk,
  mapErr,
  andThen,
  getOrElse,
  tryCatch,
  tryCatchAsync,
} from './result.types';

// Content entity types & refs hierarchy
export type {
  SearchEntityType,
  FeedSubtype,
  FeedSubmissionStatus,
  SearchEntityRefs,
  ContentEntityRefs,
  FeedEntityRefs,
  SearchEntity,
  ContentEntityProperties,
  EntityStats,
  ContentEntity,
  DbPost,
  FeedProperties,
  FeedBehavior,
  AggregationRule,
  DbFeed,
  DbFeedSubmission,
} from './content-entity.types';

// Profile types
export type {
  PublicProfile,
  PrivateProfile,
  UserPreferences,
  NotificationPreferences,
  ProfileFormData,
} from './profile.types';

// Profile board types
export type {
  ProfileBoard,
  BoardLayout,
  WidgetType,
  BaseWidget,
  WidgetConfig,
  BoardWidget,
  BioWidgetConfig,
  LinksWidgetConfig,
  ImageGalleryWidgetConfig,
  FeaturedPostWidgetConfig,
  PinnedPostsWidgetConfig,
  RecentActivityWidgetConfig,
  FollowersWidgetConfig,
  FollowingWidgetConfig,
  FeedsWidgetConfig,
  BadgesWidgetConfig,
  StatsWidgetConfig,
  LocationMapWidgetConfig,
  CustomHtmlWidgetConfig,
  SocialLinksWidgetConfig,
  SkillsWidgetConfig,
  AvailabilityWidgetConfig,
  ContactFormWidgetConfig,
} from './profile-board.types';

// Post types
export type {
  CreatePostDto,
  PostMedia,
  PostViewModel,
} from './post.types';

// Feed types
export type {
  CreateFeedDto,
  FeedViewModel,
  FeedSubmissionViewModel,
} from './feed.types';

// Comment types
export type {
  Comment,
  CommentReply,
  CreateCommentDto,
  CreateCommentReplyDto,
} from './comment.types';

// Search types
export type {
  AlgoliaSearchParams,
  SearchResponse,
  SearchResultItem,
  HighlightResult,
  SearchFilterOptions,
} from './search.types';

// Auth types
export type {
  CustomClaims,
  ServerUser,
  ServerSession,
  AuthResult,
} from './auth.types';

// Pagination types
export type {
  PaginationOptions,
  PaginatedResult,
} from './pagination.types';
export {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from './pagination.types';

// Generic utilities
export type {
  DeepPartial,
  Nullable,
  Optional,
  Maybe,
  Awaited,
  AsyncReturnType,
  RequireFields,
  OptionalFields,
  Values,
  Constructor,
  Immutable,
  KeysOfType,
  Timestamps,
} from './utils.types';
