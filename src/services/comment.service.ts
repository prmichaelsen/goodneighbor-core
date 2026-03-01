// src/services/comment.service.ts
// CommentService handles comment creation, retrieval, and parent entity updates.

import type { Result } from '../types/result.types';
import { ok, err } from '../types/result.types';
import type { Comment, CommentReply, CreateCommentDto, CreateCommentReplyDto } from '../types/comment.types';
import type { PaginationOptions, PaginatedResult } from '../types/pagination.types';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../types/pagination.types';
import { ValidationError, NotFoundError, ExternalServiceError } from '../errors/app-errors';
import { COLLECTIONS } from '../constants/collections';
import {
  setDocument,
  getDocument,
  queryDocuments,
  batchWrite,
  FieldValue,
} from '@prmichaelsen/firebase-admin-sdk-v8';

const MAX_COMMENT_LENGTH = 5000;

export interface CommentServiceDeps {
  logger?: {
    error(message: string, context?: Record<string, unknown>): void;
  };
}

export class CommentService {
  private logger: CommentServiceDeps['logger'];

  constructor(deps: CommentServiceDeps = {}) {
    this.logger = deps.logger;
  }

  async createComment(
    postId: string,
    content: string,
    userId: string,
  ): Promise<Result<Comment, ValidationError | NotFoundError | ExternalServiceError>> {
    if (!content || content.trim().length === 0) {
      return err(new ValidationError('Comment content is required'));
    }
    if (content.length > MAX_COMMENT_LENGTH) {
      return err(new ValidationError(`Comment exceeds maximum length of ${MAX_COMMENT_LENGTH} characters`));
    }

    try {
      // Verify post exists
      const post = await getDocument(COLLECTIONS.SEARCH, postId);
      if (!post) {
        return err(new NotFoundError('Post', postId));
      }

      const commentId = crypto.randomUUID();
      const now = new Date().toISOString();
      const userSemId = `@uid:${userId}`;

      const comment: Record<string, any> = {
        id: commentId,
        postId,
        authorId: userId,
        authorUsername: '',
        authorDisplayName: '',
        authorAvatarUrl: '',
        content: content.trim(),
        timestamps: { createdAt: now, updatedAt: now },
        replyCount: 0,
        likeCount: 0,
        isLiked: false,
        canEdit: false,
        canDelete: false,
      };

      // Atomic batch: create comment + update parent entity refs
      await batchWrite([
        {
          type: 'set' as const,
          collectionPath: COLLECTIONS.POST_COMMENTS,
          documentId: commentId,
          data: comment,
        },
        {
          type: 'update' as const,
          collectionPath: COLLECTIONS.SEARCH,
          documentId: postId,
          data: {
            'refs.hasComments': FieldValue.arrayUnion(commentId),
            'refs.hasCommenter': FieldValue.arrayUnion(userSemId),
            'stats.comments': FieldValue.increment(1),
          },
        },
      ]);

      return ok(comment as unknown as Comment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore write failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async getComments(
    postId: string,
    options: PaginationOptions = {},
  ): Promise<Result<PaginatedResult<Comment>, ExternalServiceError>> {
    try {
      const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
      const queryOpts: Record<string, any> = {
        where: [{ field: 'postId', op: '==', value: postId }],
        orderBy: [{ field: 'timestamps.createdAt', direction: 'DESCENDING' }],
        limit: limit + 1, // Fetch one extra to determine hasNextPage
      };

      if (options.cursor) {
        queryOpts.startAfter = [options.cursor];
      }

      const results = await queryDocuments(COLLECTIONS.POST_COMMENTS, queryOpts);

      const hasNextPage = results.length > limit;
      const items = results.slice(0, limit).map((r) => ({
        ...r.data,
        id: r.id,
      })) as unknown as Comment[];

      const nextCursor = hasNextPage && items.length > 0
        ? (items[items.length - 1].timestamps.createdAt)
        : undefined;

      return ok({
        items,
        total: 0, // Firestore cannot efficiently count
        page: options.page ?? 1,
        limit,
        hasNextPage,
        hasPreviousPage: !!options.cursor,
        nextCursor,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore query failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async createReply(
    commentId: string,
    content: string,
    userId: string,
  ): Promise<Result<CommentReply, ValidationError | NotFoundError | ExternalServiceError>> {
    if (!content || content.trim().length === 0) {
      return err(new ValidationError('Reply content is required'));
    }
    if (content.length > MAX_COMMENT_LENGTH) {
      return err(new ValidationError(`Reply exceeds maximum length of ${MAX_COMMENT_LENGTH} characters`));
    }

    try {
      // Verify comment exists
      const comment = await getDocument(COLLECTIONS.POST_COMMENTS, commentId);
      if (!comment) {
        return err(new NotFoundError('Comment', commentId));
      }

      const replyId = crypto.randomUUID();
      const now = new Date().toISOString();

      const reply: Record<string, any> = {
        id: replyId,
        commentId,
        postId: comment.postId ?? '',
        authorId: userId,
        authorUsername: '',
        authorDisplayName: '',
        authorAvatarUrl: '',
        content: content.trim(),
        timestamps: { createdAt: now, updatedAt: now },
        likeCount: 0,
        isLiked: false,
        canEdit: false,
        canDelete: false,
      };

      // Atomic batch: create reply + update parent comment
      await batchWrite([
        {
          type: 'set' as const,
          collectionPath: COLLECTIONS.COMMENT_REPLIES,
          documentId: replyId,
          data: reply,
        },
        {
          type: 'update' as const,
          collectionPath: COLLECTIONS.POST_COMMENTS,
          documentId: commentId,
          data: {
            replyCount: FieldValue.increment(1),
          },
        },
      ]);

      return ok(reply as unknown as CommentReply);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore write failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }
}
