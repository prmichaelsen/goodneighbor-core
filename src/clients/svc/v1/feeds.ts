// src/clients/svc/v1/feeds.ts
// FeedsResource — 1:1 mirror of /api/v1/feeds routes

import type { HttpClient } from '../../http.js';
import type { SdkResponse } from '../../response.js';
import type { CreateFeedDto, FeedViewModel } from '../../../types/feed.types.js';
import type { DbFeed } from '../../../types/content-entity.types.js';

export interface FeedsResource {
  create(userId: string, input: CreateFeedDto): Promise<SdkResponse<DbFeed>>;
  get(userId: string, id: string): Promise<SdkResponse<FeedViewModel>>;
  follow(userId: string, feedId: string): Promise<SdkResponse<void>>;
  unfollow(userId: string, feedId: string): Promise<SdkResponse<void>>;
  submit(userId: string, feedId: string, postId: string): Promise<SdkResponse<void>>;
}

export function createFeedsResource(http: HttpClient): FeedsResource {
  return {
    create(userId, input) {
      return http.request('POST', '/api/v1/feeds', { userId, body: input });
    },
    get(userId, id) {
      return http.request('GET', `/api/v1/feeds/${id}`, { userId });
    },
    follow(userId, feedId) {
      return http.request('POST', `/api/v1/feeds/${feedId}/follow`, { userId });
    },
    unfollow(userId, feedId) {
      return http.request('POST', `/api/v1/feeds/${feedId}/unfollow`, { userId });
    },
    submit(userId, feedId, postId) {
      return http.request('POST', `/api/v1/feeds/${feedId}/submit`, { userId, body: { postId } });
    },
  };
}
