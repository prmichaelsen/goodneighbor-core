// src/web/use-cases/content.spec.ts

import { createAndSubmitToFeed, createFeedAndFollow } from './content';
import { ServiceContainer, SERVICE_NAMES } from '../../container';
import type { WebSDKContext } from '../context';
import { ok, err } from '../../types/result.types';
import { ExternalServiceError, NotFoundError, ForbiddenError } from '../../errors/app-errors';

function createMockCtx(overrides: Record<string, any> = {}): WebSDKContext {
  const container = new ServiceContainer();
  const mockContentService = {
    createPost: jest.fn(),
    createFeed: jest.fn(),
    ...overrides.content,
  };
  const mockFeedService = {
    submitToFeed: jest.fn(),
    followFeed: jest.fn(),
    ...overrides.feed,
  };
  container.registerSingleton(SERVICE_NAMES.CONTENT, () => mockContentService);
  container.registerSingleton(SERVICE_NAMES.FEED, () => mockFeedService);
  return { container, userId: 'user-123' };
}

describe('createAndSubmitToFeed', () => {
  it('should create post and submit to feed on success', async () => {
    const mockPost = { id: 'post-1', type: 'post' };
    const mockSubmission = { id: 'sub-1', feedId: 'feed-1', postId: 'post-1' };
    const ctx = createMockCtx();
    const content = ctx.container.resolve(SERVICE_NAMES.CONTENT) as any;
    const feed = ctx.container.resolve(SERVICE_NAMES.FEED) as any;
    content.createPost.mockResolvedValue(ok(mockPost));
    feed.submitToFeed.mockResolvedValue(ok(mockSubmission));

    const result = await createAndSubmitToFeed(ctx, {
      post: { title: 'Test', content: 'Hello' },
      feedId: 'feed-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.post).toEqual(mockPost);
      expect(result.value.submission).toEqual(mockSubmission);
    }
    expect(content.createPost).toHaveBeenCalledWith({ title: 'Test', content: 'Hello' }, 'user-123');
    expect(feed.submitToFeed).toHaveBeenCalledWith('feed-1', 'post-1', 'user-123');
  });

  it('should fail fast if createPost fails', async () => {
    const ctx = createMockCtx();
    const content = ctx.container.resolve(SERVICE_NAMES.CONTENT) as any;
    const feed = ctx.container.resolve(SERVICE_NAMES.FEED) as any;
    content.createPost.mockResolvedValue(err(new ExternalServiceError('Firestore', 'Write failed')));

    const result = await createAndSubmitToFeed(ctx, {
      post: { title: 'Test', content: 'Hello' },
      feedId: 'feed-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EXTERNAL_SERVICE_ERROR');
    }
    expect(feed.submitToFeed).not.toHaveBeenCalled();
  });

  it('should return error if submitToFeed fails', async () => {
    const mockPost = { id: 'post-1', type: 'post' };
    const ctx = createMockCtx();
    const content = ctx.container.resolve(SERVICE_NAMES.CONTENT) as any;
    const feed = ctx.container.resolve(SERVICE_NAMES.FEED) as any;
    content.createPost.mockResolvedValue(ok(mockPost));
    feed.submitToFeed.mockResolvedValue(err(new ForbiddenError('No submit permission')));

    const result = await createAndSubmitToFeed(ctx, {
      post: { title: 'Test', content: 'Hello' },
      feedId: 'feed-1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });
});

describe('createFeedAndFollow', () => {
  it('should create feed and follow it on success', async () => {
    const mockFeed = { id: 'feed-1', type: 'feed', name: 'Test Feed' };
    const ctx = createMockCtx();
    const content = ctx.container.resolve(SERVICE_NAMES.CONTENT) as any;
    const feedSvc = ctx.container.resolve(SERVICE_NAMES.FEED) as any;
    content.createFeed.mockResolvedValue(ok(mockFeed));
    feedSvc.followFeed.mockResolvedValue(ok(undefined));

    const input = { name: 'Test Feed', description: 'A feed', subtype: 'user' as const };
    const result = await createFeedAndFollow(ctx, input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.feed).toEqual(mockFeed);
    }
    expect(feedSvc.followFeed).toHaveBeenCalledWith('feed-1', 'user-123');
  });

  it('should fail fast if createFeed fails', async () => {
    const ctx = createMockCtx();
    const content = ctx.container.resolve(SERVICE_NAMES.CONTENT) as any;
    const feedSvc = ctx.container.resolve(SERVICE_NAMES.FEED) as any;
    content.createFeed.mockResolvedValue(err(new ExternalServiceError('Firestore', 'Write failed')));

    const input = { name: 'Test Feed', description: 'A feed', subtype: 'user' as const };
    const result = await createFeedAndFollow(ctx, input);

    expect(result.ok).toBe(false);
    expect(feedSvc.followFeed).not.toHaveBeenCalled();
  });
});
