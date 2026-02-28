// src/lib/creators/feed-creators.ts
// Feed entity builder functions.

import type { FeedEntityRefs, EntityStats, DbFeed, FeedBehavior, FeedProperties } from '../../types/content-entity.types';
import type { CreateFeedDto } from '../../types/feed.types';
import { buildPostRefs } from './post-creators';

/**
 * Build FeedEntityRefs for a new feed.
 * Extends ContentEntityRefs (from buildPostRefs) with 7 feed-specific fields.
 */
function buildFeedRefs(
  userId: string,
  isPublic: boolean,
  hashtags: string[],
): FeedEntityRefs {
  const baseRefs = buildPostRefs(userId, isPublic, hashtags, []);
  const userSemId = `@uid:${userId}`;

  return {
    ...baseRefs,
    hasModerator: [userSemId],
    hasApprover: [userSemId],
    hasSubmitPermissions: isPublic ? ['@public'] : [userSemId],
    hasConfigureBehaviorPermissions: [userSemId],
    hasMember: [],
    hasSubmission: [],
    hasRejected: [],
  };
}

/**
 * Create a complete DbFeed entity ready for Firestore insertion.
 */
export function createFeedEntity(
  dto: CreateFeedDto,
  userId: string,
): DbFeed {
  const now = new Date().toISOString();
  const hashtags = dto.tags || [];
  const refs = buildFeedRefs(userId, dto.isPublic ?? true, hashtags);

  const searchParts = [
    dto.name,
    dto.description,
    ...hashtags,
  ].filter(Boolean);
  const search = searchParts.join(' ');

  const stats: EntityStats = {
    viewers: 0,
    followers: 0,
    sharers: 0,
    likers: 0,
    comments: 0,
    views: 0,
    reposts: 0,
    quotes: 0,
    annotations: 0,
    tags: hashtags.length,
  };

  const behavior: FeedBehavior = {
    submissionModels: dto.submissionModels || ['direct'],
    approvalModels: dto.approvalModels || ['auto'],
    ownershipModels: dto.ownershipModels || ['single'],
    automatedRules: [],
    contentModel: [],
    flair: [],
  };

  const properties: FeedProperties = {
    displayName: dto.name || '',
    mainContent: dto.description || '',
    tags: hashtags,
    mentions: [],
    rules: dto.rules || [],
  };

  return {
    id: '', // Set by Firestore on write
    type: 'feed',
    subtype: dto.subtype || 'feed',
    name: dto.name || '',
    search,
    refs,
    isPublic: dto.isPublic ?? true,
    isPublished: true,
    timestamps: {
      createdAt: now,
      updatedAt: now,
    },
    metadata: {},
    stats,
    properties,
    behavior,
    childrenFeeds: [],
  };
}
