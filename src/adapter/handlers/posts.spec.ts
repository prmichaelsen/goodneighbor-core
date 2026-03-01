import { createPost, getPost, deletePost } from './posts';
import { ok, err } from '../../types/result.types';
import { NotFoundError, ValidationError } from '../../errors/app-errors';
import type { AdapterRequest } from '../types';

function mockContentService() {
  return {
    createPost: jest.fn(),
    getPost: jest.fn(),
    getFeed: jest.fn(),
    createFeed: jest.fn(),
    mapPostToViewModel: jest.fn(),
    mapFeedToViewModel: jest.fn(),
  };
}

function makeReq(overrides: Partial<AdapterRequest> = {}): AdapterRequest {
  return {
    method: 'GET',
    path: '/api/v1/posts/1',
    params: {},
    body: undefined,
    userId: 'user1',
    ...overrides,
  };
}

describe('posts handlers', () => {
  describe('createPost', () => {
    it('returns 201 on success', async () => {
      const svc = mockContentService();
      svc.createPost.mockResolvedValue(ok({ id: 'p1' }));
      const handler = createPost(svc as any);
      const res = await handler(makeReq({ body: { title: 'Hi', content: 'World' } }));
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 'p1' });
    });

    it('returns 400 on validation error', async () => {
      const svc = mockContentService();
      svc.createPost.mockResolvedValue(err(new ValidationError('Title required')));
      const handler = createPost(svc as any);
      const res = await handler(makeReq({ body: {} }));
      expect(res.status).toBe(400);
    });
  });

  describe('getPost', () => {
    it('returns 200 on success', async () => {
      const svc = mockContentService();
      svc.getPost.mockResolvedValue(ok({ id: 'p1', title: 'Hello' }));
      const handler = getPost(svc as any);
      const res = await handler(makeReq({ params: { id: 'p1' } }));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'p1', title: 'Hello' });
    });

    it('returns 404 when not found', async () => {
      const svc = mockContentService();
      svc.getPost.mockResolvedValue(err(new NotFoundError('Post', 'missing')));
      const handler = getPost(svc as any);
      const res = await handler(makeReq({ params: { id: 'missing' } }));
      expect(res.status).toBe(404);
    });
  });

  describe('deletePost', () => {
    it('returns 501 not implemented', async () => {
      const handler = deletePost();
      const res = await handler(makeReq({ params: { id: 'p1' } }));
      expect(res.status).toBe(501);
    });
  });
});
