import { HttpClient } from '../../http';
import { createProfilesResource } from './profiles';

jest.mock('../../http');

function mockHttp(): jest.Mocked<HttpClient> {
  return { request: jest.fn() } as any;
}

describe('ProfilesResource', () => {
  it('get calls GET /api/v1/profiles/:uid', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { uid: 'u1' }, error: null, throwOnError: () => ({}) });
    const profiles = createProfilesResource(http);
    await profiles.get('user1', 'u1');
    expect(http.request).toHaveBeenCalledWith('GET', '/api/v1/profiles/u1', { userId: 'user1' });
  });

  it('update calls PUT /api/v1/profiles/:uid with body', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { uid: 'u1' }, error: null, throwOnError: () => ({}) });
    const profiles = createProfilesResource(http);
    await profiles.update('user1', 'u1', { displayName: 'New Name' });
    expect(http.request).toHaveBeenCalledWith('PUT', '/api/v1/profiles/u1', {
      userId: 'user1',
      body: { displayName: 'New Name' },
    });
  });

  it('search calls POST /api/v1/profiles/search', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: [], error: null, throwOnError: () => [] });
    const profiles = createProfilesResource(http);
    await profiles.search('user1', { query: 'john', limit: 10 });
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/profiles/search', {
      userId: 'user1',
      body: { query: 'john', limit: 10 },
    });
  });
});
