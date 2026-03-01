import { HttpClient } from '../../http';
import { createSearchResource } from './search';

jest.mock('../../http');

function mockHttp(): jest.Mocked<HttpClient> {
  return { request: jest.fn() } as any;
}

describe('SearchResource', () => {
  it('search calls POST /api/v1/search with body', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: [], error: null, throwOnError: () => [] });
    const search = createSearchResource(http);
    await search.search('user1', { query: 'hello', limit: 10 });
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/search', {
      userId: 'user1',
      body: { query: 'hello', limit: 10 },
    });
  });

  it('search passes filters', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: [], error: null, throwOnError: () => [] });
    const search = createSearchResource(http);
    await search.search('user1', { query: 'test', filters: { type: 'post' } });
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/search', {
      userId: 'user1',
      body: { query: 'test', filters: { type: 'post' } },
    });
  });
});
