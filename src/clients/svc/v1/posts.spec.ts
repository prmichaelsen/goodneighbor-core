import { HttpClient } from '../../http';
import { createPostsResource } from './posts';

jest.mock('../../http');

function mockHttp(): jest.Mocked<HttpClient> {
  return { request: jest.fn() } as any;
}

describe('PostsResource', () => {
  it('create calls POST /api/v1/posts with body', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { id: 'p1' }, error: null, throwOnError: () => ({ id: 'p1' }) });
    const posts = createPostsResource(http);
    const result = await posts.create('user1', { title: 'Hi', content: 'Hello' });
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/posts', {
      userId: 'user1',
      body: { title: 'Hi', content: 'Hello' },
    });
    expect(result.data).toEqual({ id: 'p1' });
  });

  it('get calls GET /api/v1/posts/:id', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { id: 'p1', title: 'Hi' }, error: null, throwOnError: () => ({}) });
    const posts = createPostsResource(http);
    await posts.get('user1', 'p1');
    expect(http.request).toHaveBeenCalledWith('GET', '/api/v1/posts/p1', { userId: 'user1' });
  });

  it('delete calls DELETE /api/v1/posts/:id', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: undefined, error: null, throwOnError: () => undefined });
    const posts = createPostsResource(http);
    await posts.delete('user1', 'p1');
    expect(http.request).toHaveBeenCalledWith('DELETE', '/api/v1/posts/p1', { userId: 'user1' });
  });

  it('returns error SdkResponse from http client', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: null, error: { code: 'not_found', message: 'Not found', status: 404 }, throwOnError: () => { throw new Error(); } });
    const posts = createPostsResource(http);
    const result = await posts.get('user1', 'missing');
    expect(result.data).toBeNull();
    expect(result.error!.code).toBe('not_found');
  });
});
