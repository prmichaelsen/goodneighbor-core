// src/lib/creators/post-creators.ts
// Post entity builder functions.

import type { ContentEntityRefs, EntityStats, DbPost } from '../../types/content-entity.types';
import type { CreatePostDto } from '../../types/post.types';
import type { ProcessedContent } from '../content-processing';

/**
 * Build ContentEntityRefs for a new post.
 *
 * Semantic ID format: @uid:{firebaseUid} for all user references.
 * Visibility: @public for public posts, @uid:{userId} for private posts.
 */
export function buildPostRefs(
  userId: string,
  isPublic: boolean,
  hashtags: string[],
  mentionUids: string[],
): ContentEntityRefs {
  const userSemId = `@uid:${userId}`;

  return {
    // Visibility
    hasViewer: isPublic ? ['@public'] : [userSemId],

    // Ownership & authoring
    hasOwner: [userSemId],
    hasAuthor: [userSemId],
    hasCreator: [userSemId],
    hasCollaborator: [userSemId],

    // Permissions (initially only the creator)
    hasEditPermissions: [userSemId],
    hasArchivePermissions: [userSemId],
    hasUpdateViewersPermissions: [userSemId],
    hasConfigurePropertiesPermissions: [userSemId],

    // Content associations
    hasTag: hashtags,
    hasMention: mentionUids,

    // Social interactions (initialized empty)
    hasFollower: [],
    hasSharer: [],
    hasLiker: [],
    hasSecretLiker: [],
    hasAnonymousLiker: [],
    hasReviewer: [],
    hasBeenViewedBy: [],
    hasFlair: [],
    hasSupporter: [],
    hasComments: [],
    hasCommenter: [],
    hasQuote: [],
    hasQuoter: [],
    hasAnnotation: [],
    hasAnnotator: [],
    hasRepost: [],
    hasReposter: [],
    hasRelated: [],
  };
}

/**
 * Create a complete DbPost entity ready for Firestore insertion.
 */
export function createPostEntity(
  dto: CreatePostDto,
  userId: string,
  processed: ProcessedContent,
): DbPost {
  const now = new Date().toISOString();
  const refs = buildPostRefs(userId, dto.isPublic ?? true, processed.hashtags, processed.mentions);

  const searchParts = [
    dto.title,
    dto.content,
    ...processed.hashtags,
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
    tags: processed.hashtags.length,
  };

  return {
    id: '', // Set by Firestore on write
    type: 'post',
    name: dto.title || '',
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
    properties: {
      displayName: dto.title || '',
      mainContent: dto.content,
      tags: processed.hashtags,
      mentions: processed.mentions,
    },
  };
}
