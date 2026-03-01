import { createFeed, getFeed, followFeed, unfollowFeed, submitToFeed } from './feeds';
import { ok, err } from '../../types/result.types';
import { NotFoundError, ExternalServiceError } from '../../errors/app-errors';
import type { AdapterRequest } from '../types';

function mockContentService() {
  return { createFeed: jest.fn(), getFeed: jest.fn() };
}
function mockFeedService() {
  return { followFeed: jest.fn(), unfollowFeed: jest.fn(), submitToFeed: jest.fn() };
}

function makeReq(overrides: Partial<AdapterRequest> = {}): AdapterRequest {
  return { method: 'POST', path: '/', params: {}, body: undefined, userId: 'user1', ...overrides };
}

describe('feeds handlers', () => {
  it('createFeed returns 201', async () => {
    const svc = mockContentService();
    svc.createFeed.mockResolvedValue(ok({ id: 'f1' }));
    const handler = createFeed(svc as any);
    const res = await handler(makeReq({ body: { name: 'Feed', description: 'D', subtype: 'community' } }));
    expect(res.status).toBe(201);
  });

  it('getFeed returns 200', async () => {
    const svc = mockContentService();
    svc.getFeed.mockResolvedValue(ok({ id: 'f1' }));
    const handler = getFeed(svc as any);
    const res = await handler(makeReq({ params: { id: 'f1' } }));
    expect(res.status).toBe(200);
  });

  it('getFeed returns 404', async () => {
    const svc = mockContentService();
    svc.getFeed.mockResolvedValue(err(new NotFoundError('Feed', 'missing')));
    const handler = getFeed(svc as any);
    const res = await handler(makeReq({ params: { id: 'missing' } }));
    expect(res.status).toBe(404);
  });

  it('followFeed returns 204', async () => {
    const svc = mockFeedService();
    svc.followFeed.mockResolvedValue(ok(undefined));
    const handler = followFeed(svc as any);
    const res = await handler(makeReq({ params: { id: 'f1' } }));
    expect(res.status).toBe(204);
  });

  it('unfollowFeed returns 204', async () => {
    const svc = mockFeedService();
    svc.unfollowFeed.mockResolvedValue(ok(undefined));
    const handler = unfollowFeed(svc as any);
    const res = await handler(makeReq({ params: { id: 'f1' } }));
    expect(res.status).toBe(204);
  });

  it('submitToFeed returns 204', async () => {
    const svc = mockFeedService();
    svc.submitToFeed.mockResolvedValue(ok(undefined));
    const handler = submitToFeed(svc as any);
    const res = await handler(makeReq({ params: { id: 'f1' }, body: { postId: 'p1' } }));
    expect(res.status).toBe(204);
  });
});
