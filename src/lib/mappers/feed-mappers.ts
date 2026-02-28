// src/lib/mappers/feed-mappers.ts
// Map database feed entities to user-facing view models with permission flags.

import type { DbFeed, DbFeedSubmission } from '../../types/content-entity.types';
import type { FeedViewModel, FeedSubmissionViewModel } from '../../types/feed.types';
import type { UserContext } from './post-mappers';

/**
 * Map a database feed entity to a user-facing view model.
 * Derives permission flags by checking refs arrays.
 */
export function mapDbFeedToViewModel(
  dbFeed: DbFeed,
  userContext: UserContext | null,
): FeedViewModel {
  const userSemId = userContext ? `@uid:${userContext.userId}` : null;

  const isOwner = userSemId
    ? dbFeed.refs.hasOwner.includes(userSemId)
    : false;
  const canModerate = userSemId
    ? dbFeed.refs.hasModerator.includes(userSemId)
    : false;
  const isModerator = canModerate;
  const canEdit = userSemId
    ? dbFeed.refs.hasEditPermissions.includes(userSemId)
    : false;
  const isFollowing = userSemId
    ? dbFeed.refs.hasFollower.includes(userSemId)
    : false;
  const isMember = userSemId
    ? dbFeed.refs.hasMember.includes(userSemId)
    : false;

  // canPost is true if the feed allows public submissions OR the user has submit permissions
  const canPost = dbFeed.refs.hasSubmitPermissions.includes('@public')
    || (userSemId ? dbFeed.refs.hasSubmitPermissions.includes(userSemId) : false);

  return {
    id: dbFeed.id,
    name: dbFeed.properties.displayName,
    description: dbFeed.properties.mainContent,
    subtype: dbFeed.subtype,
    rules: dbFeed.properties.rules,
    isPublic: dbFeed.isPublic,
    isPublished: dbFeed.isPublished,
    stats: dbFeed.stats,
    timestamps: dbFeed.timestamps,
    parentFeed: dbFeed.parentFeed,
    childrenFeeds: dbFeed.childrenFeeds,
    behavior: dbFeed.behavior,
    isOwner,
    isModerator,
    isMember,
    isFollowing,
    canPost,
    canModerate,
  };
}

/**
 * Map a database feed submission to a view model.
 */
export function mapDbFeedSubmissionToViewModel(
  sub: DbFeedSubmission,
): FeedSubmissionViewModel {
  return {
    id: sub.id,
    feedId: sub.feedId,
    postId: sub.postId,
    createdBy: sub.createdBy,
    status: sub.status,
    submittedAt: sub.submittedAt,
    reviewedAt: sub.reviewedAt,
    reviewedBy: sub.reviewedBy,
    autoApproveReason: sub.autoApproveReason,
    rejectionReason: sub.rejectionReason,
  };
}
