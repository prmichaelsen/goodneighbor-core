// src/adapter/handlers/posts.ts
// Post route handlers

import type { ContentService } from '../../services/content.service';
import type { AdapterRequest, AdapterResponse, RouteHandler } from '../types';
import { resultToResponse } from '../result-mapper';
import type { CreatePostDto } from '../../types/post.types';

export function createPost(service: ContentService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const dto = req.body as CreatePostDto;
    const result = await service.createPost(dto, req.userId);
    return resultToResponse(result, 201);
  };
}

export function getPost(service: ContentService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const result = await service.getPost(req.params.id);
    return resultToResponse(result);
  };
}

export function deletePost(): RouteHandler {
  return async (): Promise<AdapterResponse> => {
    return {
      status: 501,
      body: { error: 'NOT_IMPLEMENTED', message: 'deletePost is not yet implemented' },
    };
  };
}
