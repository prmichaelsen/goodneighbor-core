// src/types/post.types.ts

import { EntityStats } from './content-entity.types';
import { Timestamps } from './utils.types';

/**
 * DTO for creating a new post.
 * Field mapping to DbPost:
 *   title -> properties.displayName
 *   content -> properties.mainContent
 *   tags -> refs.hasTag and properties.tags
 *   mentions -> refs.hasMention and properties.mentions
 */
export interface CreatePostDto {
  title: string;
  content: string;
  tags?: string[];
  mentions?: string[];
  isPublic?: boolean;
  media?: PostMedia[];
}

export interface PostMedia {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
  altText?: string;
}

/**
 * Post data shaped for frontend consumption.
 * Includes computed permission flags derived from refs and the requesting user context.
 */
export interface PostViewModel {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  tags: string[];
  mentions: string[];
  media: PostMedia[];
  isPublic: boolean;
  isPublished: boolean;
  stats: EntityStats;
  timestamps: Timestamps;
  // Computed permission flags (depend on requesting user)
  canEdit: boolean;
  canDelete: boolean;
  isLiked: boolean;
  isFollowing: boolean;
  isOwner: boolean;
}
