// src/clients/svc/v1/types.ts
// Convenience type aliases over generated OpenAPI types.
// Import from this file instead of types.generated.ts directly.

import type { components } from './types.generated';

// ── Post Types ────────────────────────────────────────────────────────
export type CreatePostDto = components['schemas']['CreatePostDto'];
export type PostMedia = components['schemas']['PostMedia'];
export type DbPost = components['schemas']['DbPost'];
export type PostViewModel = components['schemas']['PostViewModel'];

// ── Feed Types ────────────────────────────────────────────────────────
export type CreateFeedDto = components['schemas']['CreateFeedDto'];
export type DbFeed = components['schemas']['DbFeed'];
export type FeedViewModel = components['schemas']['FeedViewModel'];
export type FeedBehavior = components['schemas']['FeedBehavior'];

// ── Profile Types ─────────────────────────────────────────────────────
export type PublicProfile = components['schemas']['PublicProfile'];
export type ProfileFormData = components['schemas']['ProfileFormData'];

// ── Comment Types ─────────────────────────────────────────────────────
export type CreateCommentDto = components['schemas']['CreateCommentDto'];
export type Comment = components['schemas']['Comment'];
export type PaginatedCommentResult = components['schemas']['PaginatedCommentResult'];

// ── Search Types ──────────────────────────────────────────────────────
export type AlgoliaSearchParams = components['schemas']['AlgoliaSearchParams'];
export type SearchResultItem = components['schemas']['SearchResultItem'];
export type HighlightResult = components['schemas']['HighlightResult'];

// ── Auth Types ────────────────────────────────────────────────────────
export type VerifySessionResult = components['schemas']['VerifySessionResult'];

// ── Health Types ──────────────────────────────────────────────────────
export type HealthCheckResponse = components['schemas']['HealthCheckResponse'];
export type VersionResponse = components['schemas']['VersionResponse'];

// ── Shared Types ──────────────────────────────────────────────────────
export type Timestamps = components['schemas']['Timestamps'];
export type EntityStats = components['schemas']['EntityStats'];
export type ContentEntityProperties = components['schemas']['ContentEntityProperties'];
export type ContentEntityRefs = components['schemas']['ContentEntityRefs'];
export type FeedEntityRefs = components['schemas']['FeedEntityRefs'];
export type FeedProperties = components['schemas']['FeedProperties'];
export type SearchEntityRefs = components['schemas']['SearchEntityRefs'];

// ── Error Types ───────────────────────────────────────────────────────
export type SdkError = components['schemas']['SdkError'];

// ── Re-export generated paths & operations for advanced use ───────────
export type { paths, operations, components } from './types.generated';
