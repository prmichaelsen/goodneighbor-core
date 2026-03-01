// src/clients/svc/v1/comments.ts
// CommentsResource — 1:1 mirror of /api/v1/comments routes

import type { HttpClient } from '../../http.js';
import type { SdkResponse } from '../../response.js';
import type { Comment, CreateCommentDto } from '../../../types/comment.types.js';
import type { PaginatedResult } from '../../../types/pagination.types.js';

export interface CommentsResource {
  create(userId: string, input: CreateCommentDto): Promise<SdkResponse<Comment>>;
  list(userId: string, postId: string, opts?: { cursor?: string; limit?: number }): Promise<SdkResponse<PaginatedResult<Comment>>>;
  delete(userId: string, id: string): Promise<SdkResponse<void>>;
}

export function createCommentsResource(http: HttpClient): CommentsResource {
  return {
    create(userId, input) {
      return http.request('POST', '/api/v1/comments', { userId, body: input });
    },
    list(userId, postId, opts) {
      const params: Record<string, string> = {};
      if (opts?.cursor) params.cursor = opts.cursor;
      if (opts?.limit) params.limit = String(opts.limit);
      const query = new URLSearchParams(params).toString();
      const path = `/api/v1/posts/${postId}/comments${query ? `?${query}` : ''}`;
      return http.request('GET', path, { userId });
    },
    delete(userId, id) {
      return http.request('DELETE', `/api/v1/comments/${id}`, { userId });
    },
  };
}
