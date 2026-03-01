// src/adapter/handlers/app.ts
// Compound operation handlers for /api/app/v1/ routes
// These call services directly for server-side composition (single HTTP round-trip).

import type { ContentService } from '../../services/content.service';
import type { ProfileService } from '../../services/profile.service';
import type { FeedService } from '../../services/feed.service';
import type { AdapterRequest, AdapterResponse, RouteHandler } from '../types';
import { resultToResponse } from '../result-mapper';
import type { CreatePostDto } from '../../types/post.types';
import type { CreateFeedDto } from '../../types/feed.types';
import type { ProfileFormData } from '../../types/profile.types';

export function appCreateAndSubmitToFeed(
  content: ContentService,
  feed: FeedService,
): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const { post: postDto, feedId } = req.body as { post: CreatePostDto; feedId: string };

    const postResult = await content.createPost(postDto, req.userId);
    if (!postResult.ok) return resultToResponse(postResult);

    const submitResult = await feed.submitToFeed(feedId, postResult.value.id, req.userId);
    if (!submitResult.ok) return resultToResponse(submitResult);

    return { status: 201, body: { post: postResult.value } };
  };
}

export function appCreateFeedAndFollow(
  content: ContentService,
  feed: FeedService,
): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const dto = req.body as CreateFeedDto;

    const feedResult = await content.createFeed(dto, req.userId);
    if (!feedResult.ok) return resultToResponse(feedResult);

    await feed.followFeed(feedResult.value.id, req.userId);

    return { status: 201, body: { feed: feedResult.value } };
  };
}

export function appSetupProfile(profile: ProfileService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const input = req.body as Partial<ProfileFormData>;

    const updateResult = await profile.updatePublicProfile(req.userId, input);
    if (!updateResult.ok) return resultToResponse(updateResult);

    const boardResult = await profile.createDefaultBoard(req.userId);
    if (!boardResult.ok && boardResult.error.kind !== 'conflict') {
      return resultToResponse(boardResult);
    }

    return { status: 200, body: updateResult.value };
  };
}

export function appViewProfile(profile: ProfileService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const targetUid = req.params.uid;

    const [profileResult, boardResult] = await Promise.all([
      profile.getPublicProfileById(targetUid),
      profile.getProfileBoard(targetUid),
    ]);

    if (!profileResult.ok) return resultToResponse(profileResult);

    const board = boardResult.ok ? boardResult.value : null;

    return { status: 200, body: { profile: profileResult.value, board } };
  };
}

export function appDiscoverUsers(profile: ProfileService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const { query, limit } = req.body as { query: string; limit?: number };

    const result = await profile.searchUsers(query, limit);
    if (!result.ok) return resultToResponse(result);

    return { status: 200, body: { profiles: result.value } };
  };
}
