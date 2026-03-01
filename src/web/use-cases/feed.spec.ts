// src/web/use-cases/feed.spec.ts

import { getFeedDetails } from './feed';
import { ServiceContainer, SERVICE_NAMES } from '../../container';
import type { WebSDKContext } from '../context';
import { ok, err } from '../../types/result.types';
import { NotFoundError, ExternalServiceError } from '../../errors/app-errors';

function createMockCtx(): WebSDKContext {
  const container = new ServiceContainer();
  const mockContentService = {
    getFeed: jest.fn(),
  };
  container.registerSingleton(SERVICE_NAMES.CONTENT, () => mockContentService);
  return { container, userId: 'user-123' };
}

describe('getFeedDetails', () => {
  it('should return feed on success', async () => {
    const mockFeed = { id: 'feed-1', type: 'feed', name: 'Test Feed' };
    const ctx = createMockCtx();
    const content = ctx.container.resolve(SERVICE_NAMES.CONTENT) as any;
    content.getFeed.mockResolvedValue(ok(mockFeed));

    const result = await getFeedDetails(ctx, 'feed-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.feed).toEqual(mockFeed);
    }
    expect(content.getFeed).toHaveBeenCalledWith('feed-1');
  });

  it('should return error when feed not found', async () => {
    const ctx = createMockCtx();
    const content = ctx.container.resolve(SERVICE_NAMES.CONTENT) as any;
    content.getFeed.mockResolvedValue(err(new NotFoundError('Feed', 'feed-1')));

    const result = await getFeedDetails(ctx, 'feed-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should return error on service failure', async () => {
    const ctx = createMockCtx();
    const content = ctx.container.resolve(SERVICE_NAMES.CONTENT) as any;
    content.getFeed.mockResolvedValue(err(new ExternalServiceError('Firestore', 'Read failed')));

    const result = await getFeedDetails(ctx, 'feed-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EXTERNAL_SERVICE_ERROR');
    }
  });
});
