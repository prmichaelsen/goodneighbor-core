import { HttpClient } from '../../http';
import { createCommentsResource } from './comments';

jest.mock('../../http');

function mockHttp(): jest.Mocked<HttpClient> {
  return { request: jest.fn() } as any;
}

describe('CommentsResource', () => {
  it('create calls POST /api/v1/comments with body', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { id: 'c1' }, error: null, throwOnError: () => ({}) });
    const comments = createCommentsResource(http);
    await comments.create('user1', { postId: 'p1', content: 'Nice!' });
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/comments', {
      userId: 'user1',
      body: { postId: 'p1', content: 'Nice!' },
    });
  });

  it('list calls GET /api/v1/posts/:id/comments', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { items: [], total: 0 }, error: null, throwOnError: () => ({}) });
    const comments = createCommentsResource(http);
    await comments.list('user1', 'p1');
    expect(http.request).toHaveBeenCalledWith('GET', '/api/v1/posts/p1/comments', { userId: 'user1' });
  });

  it('list passes cursor and limit as query params', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { items: [] }, error: null, throwOnError: () => ({}) });
    const comments = createCommentsResource(http);
    await comments.list('user1', 'p1', { cursor: 'abc', limit: 5 });
    expect(http.request).toHaveBeenCalledWith(
      'GET',
      '/api/v1/posts/p1/comments?cursor=abc&limit=5',
      { userId: 'user1' },
    );
  });

  it('delete calls DELETE /api/v1/comments/:id', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: undefined, error: null, throwOnError: () => undefined });
    const comments = createCommentsResource(http);
    await comments.delete('user1', 'c1');
    expect(http.request).toHaveBeenCalledWith('DELETE', '/api/v1/comments/c1', { userId: 'user1' });
  });
});
