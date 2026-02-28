// src/lib/mappers/post-mappers.ts
// Map database post entities to user-facing view models with permission flags.

import type { DbPost } from '../../types/content-entity.types';
import type { PostViewModel } from '../../types/post.types';

export interface UserContext {
  userId: string;
}

/**
 * Map a database post entity to a user-facing view model.
 * Derives permission flags by checking refs arrays for @uid:{userId}.
 * When userContext is null (unauthenticated), all flags default to false.
 */
export function mapDbPostToViewModel(
  dbPost: DbPost,
  userContext: UserContext | null,
): PostViewModel {
  const userSemId = userContext ? `@uid:${userContext.userId}` : null;

  const canEdit = userSemId
    ? dbPost.refs.hasEditPermissions.includes(userSemId)
    : false;
  const canDelete = userSemId
    ? dbPost.refs.hasArchivePermissions.includes(userSemId)
    : false;
  const isLiked = userSemId
    ? dbPost.refs.hasLiker.includes(userSemId)
    : false;
  const isFollowing = userSemId
    ? dbPost.refs.hasFollower.includes(userSemId)
    : false;
  const isOwner = userSemId
    ? dbPost.refs.hasOwner.includes(userSemId)
    : false;

  return {
    id: dbPost.id,
    title: dbPost.properties.displayName,
    content: dbPost.properties.mainContent,
    authorId: '',
    authorUsername: '',
    authorDisplayName: '',
    authorAvatarUrl: '',
    tags: dbPost.properties.tags,
    mentions: dbPost.properties.mentions,
    media: [],
    isPublic: dbPost.isPublic,
    isPublished: dbPost.isPublished,
    stats: dbPost.stats,
    timestamps: dbPost.timestamps,
    canEdit,
    canDelete,
    isLiked,
    isFollowing,
    isOwner,
  };
}
