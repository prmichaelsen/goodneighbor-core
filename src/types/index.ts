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
