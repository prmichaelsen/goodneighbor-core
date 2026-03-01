// src/web/use-cases/content.ts
// Compound content workflows

import type { Result } from '../../types';
import type { CreatePostDto } from '../../types/post.types';
import type { CreateFeedDto } from '../../types/feed.types';
import type { DbPost, DbFeed, DbFeedSubmission } from '../../types/content-entity.types';
import { SERVICE_NAMES } from '../../container';
import type { WebSDKContext } from '../context';
import type { WebSDKError } from '../error';
import { toWebSDKError } from '../error';

/**
 * Create a post and submit it to a feed in one operation.
 * Fail fast: if createPost fails, submitToFeed is not attempted.
 */
export async function createAndSubmitToFeed(
  ctx: WebSDKContext,
  input: { post: CreatePostDto; feedId: string },
): Promise<Result<{ post: DbPost; submission: DbFeedSubmission }, WebSDKError>> {
  const content = ctx.container.resolve(SERVICE_NAMES.CONTENT);
  const feed = ctx.container.resolve(SERVICE_NAMES.FEED);

  // Step 1: Create the post
  const postResult = await content.createPost(input.post, ctx.userId);
  if (!postResult.ok) {
    return { ok: false, error: toWebSDKError(postResult.error) };
  }

  // Step 2: Submit post to feed
  const submitResult = await feed.submitToFeed(input.feedId, postResult.value.id, ctx.userId);
  if (!submitResult.ok) {
    return { ok: false, error: toWebSDKError(submitResult.error) };
  }

  return { ok: true, value: { post: postResult.value, submission: submitResult.value } };
}

/**
 * Create a feed and automatically follow it.
 * Fail fast: if createFeed fails, followFeed is not attempted.
 */
export async function createFeedAndFollow(
  ctx: WebSDKContext,
  input: CreateFeedDto,
): Promise<Result<{ feed: DbFeed }, WebSDKError>> {
  const content = ctx.container.resolve(SERVICE_NAMES.CONTENT);
  const feedService = ctx.container.resolve(SERVICE_NAMES.FEED);

  // Step 1: Create the feed
  const feedResult = await content.createFeed(input, ctx.userId);
  if (!feedResult.ok) {
    return { ok: false, error: toWebSDKError(feedResult.error) };
  }

  // Step 2: Follow the newly created feed
  const followResult = await feedService.followFeed(feedResult.value.id, ctx.userId);
  if (!followResult.ok) {
    return { ok: false, error: toWebSDKError(followResult.error) };
  }

  return { ok: true, value: { feed: feedResult.value } };
}
