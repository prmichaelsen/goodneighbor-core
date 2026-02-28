// src/types/common.types.ts
// Branded ID types and semantic ID helpers for goodneighbor-core

// ─── Brand Pattern ────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ─── Branded ID Types ─────────────────────────────────────────────────────

/** Firebase UID branded as a UserId */
export type UserId = Brand<string, 'UserId'>;

/** Post document ID */
export type PostId = Brand<string, 'PostId'>;

/** Feed document ID */
export type FeedId = Brand<string, 'FeedId'>;

/** Comment document ID */
export type CommentId = Brand<string, 'CommentId'>;

/** Feed submission document ID */
export type FeedSubmissionId = Brand<string, 'FeedSubmissionId'>;

/** Search entity document ID (used in the goodneighbor.search collection) */
export type SearchEntityId = Brand<string, 'SearchEntityId'>;

// ─── Factory Functions ────────────────────────────────────────────────────

export function createUserId(id: string): UserId {
  return id as UserId;
}

export function createPostId(id: string): PostId {
  return id as PostId;
}

export function createFeedId(id: string): FeedId {
  return id as FeedId;
}

export function createCommentId(id: string): CommentId {
  return id as CommentId;
}

export function createFeedSubmissionId(id: string): FeedSubmissionId {
  return id as FeedSubmissionId;
}

export function createSearchEntityId(id: string): SearchEntityId {
  return id as SearchEntityId;
}

// ─── Semantic ID Helpers ──────────────────────────────────────────────────

/**
 * System tokens used in refs arrays for visibility and permissions.
 */
export const SYSTEM_TOKENS = {
  /** Public visibility marker — entities with this in hasViewer are visible to all */
  PUBLIC: '@public',
} as const;

/**
 * Creates a user-scoped semantic ID for use in refs arrays.
 * Format: @uid:{firebaseUid}
 *
 * @example formatUserRef("abc123def456") => "@uid:abc123def456"
 */
export function formatUserRef(uid: string): string {
  return `@uid:${uid}`;
}
