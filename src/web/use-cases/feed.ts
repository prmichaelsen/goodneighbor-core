// src/web/use-cases/feed.ts
// Feed-related compound workflows

import type { Result } from '../../types';
import type { DbFeed } from '../../types/content-entity.types';
import { SERVICE_NAMES } from '../../container';
import type { WebSDKContext } from '../context';
import type { WebSDKError } from '../error';
import { toWebSDKError } from '../error';

/**
 * Get a feed by ID with full details.
 * Uses ContentService.getFeed for the entity lookup.
 */
export async function getFeedDetails(
  ctx: WebSDKContext,
  feedId: string,
): Promise<Result<{ feed: DbFeed }, WebSDKError>> {
  const content = ctx.container.resolve(SERVICE_NAMES.CONTENT);

  const result = await content.getFeed(feedId);
  if (!result.ok) {
    return { ok: false, error: toWebSDKError(result.error) };
  }

  return { ok: true, value: { feed: result.value } };
}
