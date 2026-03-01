// src/index.ts
// Root barrel export for goodneighbor-core

// Types
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
  DbFeed,
  DbFeedSubmission,
} from './types/content-entity.types';

export type {
  CreatePostDto,
  PostMedia,
  PostViewModel,
} from './types/post.types';

export type {
  CreateFeedDto,
  FeedViewModel,
  FeedSubmissionViewModel,
} from './types/feed.types';

export type {
  Comment,
  CommentReply,
  CreateCommentDto,
  CreateCommentReplyDto,
} from './types/comment.types';

export type {
  PublicProfile,
  PrivateProfile,
  ProfileFormData,
  UserPreferences,
  NotificationPreferences,
} from './types/profile.types';

export type {
  ProfileBoard,
  BoardLayout,
  BoardWidget,
  WidgetType,
  WidgetConfig,
} from './types/profile-board.types';

export type {
  PaginationOptions,
  PaginatedResult,
} from './types/pagination.types';
export { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from './types/pagination.types';

export type {
  CustomClaims,
  ServerUser,
  ServerSession,
  AuthResult,
} from './types/auth.types';

// Constants
export { COLLECTIONS, COLLECTION_CATEGORIES } from './constants/collections';
export type { CollectionPath } from './constants/collections';

// Errors
export {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  RateLimitError,
  InternalError,
} from './errors/app-errors';

// Config
export type {
  GoodNeighborConfig,
  AppConfig,
  FirebaseConfig,
  AlgoliaConfig,
  EmailConfig,
  AuthConfig,
} from './config/schema';
export { loadConfig, loadTestConfig } from './config/loader';
export { initializeFirebase, resetFirebaseForTesting } from './config/firebase';
export { createAlgoliaAdminClient, createAlgoliaSearchClient } from './config/algolia';
export { Secret } from './config/secrets';

// Services
export { AuthService } from './services/auth.service';
export type { AuthServiceDeps } from './services/auth.service';
export { ContentService } from './services/content.service';
export type { ContentServiceDeps } from './services/content.service';
export { SearchService, DEFAULT_ATTRIBUTES_TO_RETRIEVE } from './services/search.service';
export type { ISearchService, SearchServiceDependencies } from './services/search.service';
export { ProfileService } from './services/profile.service';
export type { ProfileServiceDeps } from './services/profile.service';
export { FeedService } from './services/feed.service';
export type { FeedServiceDeps } from './services/feed.service';
export { CommentService } from './services/comment.service';
export type { CommentServiceDeps } from './services/comment.service';
export { NotificationService } from './services/notification.service';
export type { NotificationServiceDeps } from './services/notification.service';

// Container
export { ServiceContainer, createServiceContainer, SERVICE_NAMES } from './container';
export type { ServiceName, ServiceMap, I18nServiceInterface } from './container';

// I18n
export { translate, formatDate, hasKey, getKeys, translateEmailSubject, formatDateForLanguage, formatDateTimeForLanguage } from './i18n/utils';
export type { Language, TranslationMap, Translations, DateFormatOptions } from './i18n/types';

// Lib
export { AlgoliaFilters } from './lib/algolia-filters';
export { ALGOLIA_INDEX_SETTINGS } from './lib/algolia-index-settings';
export { createPostEntity, buildPostRefs } from './lib/creators/post-creators';
export { createFeedEntity } from './lib/creators/feed-creators';
export { mapDbPostToViewModel } from './lib/mappers/post-mappers';
export type { UserContext } from './lib/mappers/post-mappers';
export { mapDbFeedToViewModel, mapDbFeedSubmissionToViewModel } from './lib/mappers/feed-mappers';
export {
  extractHashtags,
  extractMentions,
  extractUrls,
  categorizePost,
  validatePostContent,
  processPostContent,
} from './lib/content-processing';
export type { PostCategory, ProcessedContent, ValidatedPost } from './lib/content-processing';

// Client SDK types (runtime via ./clients/svc/v1 subpath export)
export type {
  SvcClient,
  SdkResponse,
  SdkError,
  HttpClientConfig,
  PostsResource,
  ProfilesResource,
  FeedsResource,
  CommentsResource,
  SearchResource,
  AuthResource,
  VerifySessionResult,
} from './clients/svc/v1/index';

// Adapter types (runtime via ./adapter subpath export)
export type {
  AdapterRequest,
  AdapterResponse,
  RouteHandler,
  Route,
} from './adapter/types';
