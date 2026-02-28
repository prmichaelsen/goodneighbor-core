// src/types/comment.types.ts

import { Timestamps } from './utils.types';

/**
 * Comment on a post.
 */
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  timestamps: Timestamps;
  replyCount: number;
  likeCount: number;
  isLiked: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Reply to a comment.
 */
export interface CommentReply {
  id: string;
  commentId: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  timestamps: Timestamps;
  likeCount: number;
  isLiked: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * DTO for creating a comment.
 */
export interface CreateCommentDto {
  postId: string;
  content: string;
}

/**
 * DTO for creating a reply to a comment.
 */
export interface CreateCommentReplyDto {
  commentId: string;
  content: string;
}
