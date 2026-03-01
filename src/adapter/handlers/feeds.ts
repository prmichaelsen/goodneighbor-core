// src/adapter/handlers/feeds.ts
// Feed route handlers

import type { ContentService } from '../../services/content.service';
import type { FeedService } from '../../services/feed.service';
import type { AdapterRequest, AdapterResponse, RouteHandler } from '../types';
import { resultToResponse } from '../result-mapper';
import type { CreateFeedDto } from '../../types/feed.types';

export function createFeed(service: ContentService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const dto = req.body as CreateFeedDto;
    const result = await service.createFeed(dto, req.userId);
    return resultToResponse(result, 201);
  };
}

export function getFeed(service: ContentService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const result = await service.getFeed(req.params.id);
    return resultToResponse(result);
  };
}

export function followFeed(service: FeedService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const result = await service.followFeed(req.params.id, req.userId);
    return resultToResponse(result, 204);
  };
}

export function unfollowFeed(service: FeedService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const result = await service.unfollowFeed(req.params.id, req.userId);
    return resultToResponse(result, 204);
  };
}

export function submitToFeed(service: FeedService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const { postId } = req.body as { postId: string };
    const result = await service.submitToFeed(req.params.id, postId, req.userId);
    return resultToResponse(result, 204);
  };
}
