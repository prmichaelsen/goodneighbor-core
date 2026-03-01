// src/adapter/handlers/comments.ts
// Comment route handlers

import type { CommentService } from '../../services/comment.service';
import type { AdapterRequest, AdapterResponse, RouteHandler } from '../types';
import { resultToResponse } from '../result-mapper';

export function createComment(service: CommentService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const { postId, content } = req.body as { postId: string; content: string };
    const result = await service.createComment(postId, content, req.userId);
    return resultToResponse(result, 201);
  };
}

export function listComments(service: CommentService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const cursor = req.query?.cursor;
    const limit = req.query?.limit ? Number(req.query.limit) : undefined;
    const result = await service.getComments(req.params.id, { cursor, limit });
    return resultToResponse(result);
  };
}

export function deleteComment(): RouteHandler {
  return async (): Promise<AdapterResponse> => {
    return {
      status: 501,
      body: { error: 'NOT_IMPLEMENTED', message: 'deleteComment is not yet implemented' },
    };
  };
}
