// src/app/content.spec.ts

import { ContentOperations } from './content';
import { createSuccess, createError } from '../clients/response';

function createMockHttp() {
  return { request: jest.fn() };
}

describe('ContentOperations', () => {
  describe('createAndSubmitToFeed', () => {
    it('should create post and submit to feed', async () => {
      const http = createMockHttp();
      const ops = new ContentOperations(http as any);
      const mockPost = { id: 'post-1', type: 'post' };

      http.request
        .mockResolvedValueOnce(createSuccess(mockPost))
        .mockResolvedValueOnce(createSuccess(undefined));

      const result = await ops.createAndSubmitToFeed('user-1', {
        post: { title: 'Test', content: 'Hello' } as any,
        feedId: 'feed-1',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ post: mockPost });
      expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/posts', {
        body: { title: 'Test', content: 'Hello' },
        userId: 'user-1',
      });
      expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/feeds/feed-1/submit', {
        body: { postId: 'post-1' },
        userId: 'user-1',
      });
    });

    it('should fail fast if post creation fails', async () => {
      const http = createMockHttp();
      const ops = new ContentOperations(http as any);

      http.request.mockResolvedValueOnce(
        createError({ code: 'internal', message: 'Write failed', status: 500 }),
      );

      const result = await ops.createAndSubmitToFeed('user-1', {
        post: { title: 'Test' } as any,
        feedId: 'feed-1',
      });

      expect(result.error).not.toBeNull();
      expect(result.error!.code).toBe('internal');
      expect(http.request).toHaveBeenCalledTimes(1);
    });

    it('should return error if submit fails', async () => {
      const http = createMockHttp();
      const ops = new ContentOperations(http as any);
      const mockPost = { id: 'post-1', type: 'post' };

      http.request
        .mockResolvedValueOnce(createSuccess(mockPost))
        .mockResolvedValueOnce(
          createError({ code: 'forbidden', message: 'No permission', status: 403 }),
        );

      const result = await ops.createAndSubmitToFeed('user-1', {
        post: { title: 'Test' } as any,
        feedId: 'feed-1',
      });

      expect(result.error).not.toBeNull();
      expect(result.error!.code).toBe('forbidden');
    });
  });

  describe('createFeedAndFollow', () => {
    it('should create feed and follow it', async () => {
      const http = createMockHttp();
      const ops = new ContentOperations(http as any);
      const mockFeed = { id: 'feed-1', name: 'Test Feed' };

      http.request
        .mockResolvedValueOnce(createSuccess(mockFeed))
        .mockResolvedValueOnce(createSuccess(undefined));

      const result = await ops.createFeedAndFollow('user-1', {
        name: 'Test Feed',
        description: 'A feed',
      } as any);

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ feed: mockFeed });
      expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/feeds/feed-1/follow', {
        userId: 'user-1',
      });
    });

    it('should fail fast if feed creation fails', async () => {
      const http = createMockHttp();
      const ops = new ContentOperations(http as any);

      http.request.mockResolvedValueOnce(
        createError({ code: 'internal', message: 'Write failed', status: 500 }),
      );

      const result = await ops.createFeedAndFollow('user-1', {
        name: 'Test Feed',
      } as any);

      expect(result.error).not.toBeNull();
      expect(http.request).toHaveBeenCalledTimes(1);
    });
  });
});
