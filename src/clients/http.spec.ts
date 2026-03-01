import { HttpClient } from './http';
import type { HttpClientConfig } from './http';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function jsonResponse(status: number, body?: unknown): Response {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: `Status ${status}`,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('HttpClient', () => {
  const baseConfig: HttpClientConfig = {
    baseUrl: 'https://api.example.com',
    getAuthToken: async (userId: string) => `token-${userId}`,
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('makes GET request and returns success', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { id: '1' }));
    const client = new HttpClient(baseConfig);
    const result = await client.request('GET', '/api/v1/posts/1', { userId: 'user1' });
    expect(result.data).toEqual({ id: '1' });
    expect(result.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/posts/1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer token-user1',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('makes POST request with JSON body', async () => {
    mockFetch.mockResolvedValue(jsonResponse(201, { id: '2' }));
    const client = new HttpClient(baseConfig);
    const body = { title: 'Hello' };
    const result = await client.request('POST', '/api/v1/posts', { userId: 'user1', body });
    expect(result.data).toEqual({ id: '2' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/posts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
  });

  it('sets Authorization header via getAuthToken', async () => {
    const config: HttpClientConfig = {
      baseUrl: 'https://api.example.com',
      getAuthToken: async () => 'my-custom-token',
    };
    mockFetch.mockResolvedValue(jsonResponse(200, {}));
    const client = new HttpClient(config);
    await client.request('GET', '/test', { userId: 'u1' });
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer my-custom-token');
  });

  it('skips auth header when no userId', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, {}));
    const client = new HttpClient(baseConfig);
    await client.request('GET', '/test');
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  it('returns SdkResponse error for non-2xx', async () => {
    mockFetch.mockResolvedValue(jsonResponse(404, { message: 'Not found' }));
    const client = new HttpClient(baseConfig);
    const result = await client.request('GET', '/api/v1/posts/999', { userId: 'u1' });
    expect(result.data).toBeNull();
    expect(result.error!.code).toBe('not_found');
    expect(result.error!.status).toBe(404);
  });

  it('returns network_error on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('DNS resolution failed'));
    const client = new HttpClient(baseConfig);
    const result = await client.request('GET', '/test', { userId: 'u1' });
    expect(result.data).toBeNull();
    expect(result.error!.code).toBe('network_error');
    expect(result.error!.status).toBe(0);
    expect(result.error!.message).toContain('DNS resolution failed');
  });

  it('returns auth_error when getAuthToken fails', async () => {
    const config: HttpClientConfig = {
      baseUrl: 'https://api.example.com',
      getAuthToken: async () => { throw new Error('Token expired'); },
    };
    const client = new HttpClient(config);
    const result = await client.request('GET', '/test', { userId: 'u1' });
    expect(result.error!.code).toBe('auth_error');
    expect(result.error!.message).toContain('Token expired');
  });

  it('returns auth_error when no auth configured', async () => {
    const config: HttpClientConfig = {
      baseUrl: 'https://api.example.com',
    };
    const client = new HttpClient(config);
    const result = await client.request('GET', '/test', { userId: 'u1' });
    expect(result.error!.code).toBe('auth_error');
    expect(result.error!.message).toContain('No auth configured');
  });

  it('strips trailing slash from baseUrl', async () => {
    const config: HttpClientConfig = {
      baseUrl: 'https://api.example.com/',
      getAuthToken: async () => 'tok',
    };
    mockFetch.mockResolvedValue(jsonResponse(200, {}));
    const client = new HttpClient(config);
    await client.request('GET', '/test', { userId: 'u1' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.anything(),
    );
  });
});
