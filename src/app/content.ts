// src/app/content.ts
// Content compound operations — chains /api/v1/ REST endpoints

import type { HttpClient } from '../clients/http.js';
import type { SdkResponse } from '../clients/response.js';
import { createSuccess, createError } from '../clients/response.js';
import type { CreatePostDto, DbPost, CreateFeedDto, DbFeed } from '../clients/svc/v1/types.js';

export class ContentOperations {
  constructor(private http: HttpClient) {}

  /**
   * Create a post and submit it to a feed in one operation.
   * Fails fast if post creation fails.
   */
  async createAndSubmitToFeed(
    userId: string,
    input: { post: CreatePostDto; feedId: string },
  ): Promise<SdkResponse<{ post: DbPost }>> {
    const postResult = await this.http.request<DbPost>('POST', '/api/v1/posts', {
      body: input.post,
      userId,
    });
    if (postResult.error) return createError(postResult.error);

    const submitResult = await this.http.request<void>(
      'POST',
      `/api/v1/feeds/${input.feedId}/submit`,
      { body: { postId: postResult.data!.id }, userId },
    );
    if (submitResult.error) return createError(submitResult.error);

    return createSuccess({ post: postResult.data! });
  }

  /**
   * Create a feed and auto-follow it.
   * Fails fast if feed creation fails.
   */
  async createFeedAndFollow(
    userId: string,
    input: CreateFeedDto,
  ): Promise<SdkResponse<{ feed: DbFeed }>> {
    const feedResult = await this.http.request<DbFeed>('POST', '/api/v1/feeds', {
      body: input,
      userId,
    });
    if (feedResult.error) return createError(feedResult.error);

    await this.http.request<void>(
      'POST',
      `/api/v1/feeds/${feedResult.data!.id}/follow`,
      { userId },
    );

    return createSuccess({ feed: feedResult.data! });
  }
}
