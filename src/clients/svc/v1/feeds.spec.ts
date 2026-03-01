import { HttpClient } from '../../http';
import { createFeedsResource } from './feeds';

jest.mock('../../http');

function mockHttp(): jest.Mocked<HttpClient> {
  return { request: jest.fn() } as any;
}

describe('FeedsResource', () => {
  it('create calls POST /api/v1/feeds', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { id: 'f1' }, error: null, throwOnError: () => ({}) });
    const feeds = createFeedsResource(http);
    await feeds.create('user1', { name: 'Feed', description: 'Desc', subtype: 'community' as any });
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/feeds', {
      userId: 'user1',
      body: { name: 'Feed', description: 'Desc', subtype: 'community' },
    });
  });

  it('get calls GET /api/v1/feeds/:id', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { id: 'f1' }, error: null, throwOnError: () => ({}) });
    const feeds = createFeedsResource(http);
    await feeds.get('user1', 'f1');
    expect(http.request).toHaveBeenCalledWith('GET', '/api/v1/feeds/f1', { userId: 'user1' });
  });

  it('follow calls POST /api/v1/feeds/:id/follow', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: undefined, error: null, throwOnError: () => undefined });
    const feeds = createFeedsResource(http);
    await feeds.follow('user1', 'f1');
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/feeds/f1/follow', { userId: 'user1' });
  });

  it('unfollow calls POST /api/v1/feeds/:id/unfollow', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: undefined, error: null, throwOnError: () => undefined });
    const feeds = createFeedsResource(http);
    await feeds.unfollow('user1', 'f1');
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/feeds/f1/unfollow', { userId: 'user1' });
  });

  it('submit calls POST /api/v1/feeds/:id/submit with postId', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: undefined, error: null, throwOnError: () => undefined });
    const feeds = createFeedsResource(http);
    await feeds.submit('user1', 'f1', 'p1');
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/feeds/f1/submit', {
      userId: 'user1',
      body: { postId: 'p1' },
    });
  });
});
