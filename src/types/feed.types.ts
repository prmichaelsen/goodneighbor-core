// src/types/feed.types.ts

import { FeedSubtype, FeedBehavior, EntityStats } from './content-entity.types';
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
