import { HttpClient } from '../../http';
import { createAuthResource } from './auth';

jest.mock('../../http');

function mockHttp(): jest.Mocked<HttpClient> {
  return { request: jest.fn() } as any;
}

describe('AuthResource', () => {
  it('verifySession calls POST /api/v1/auth/verify with sessionCookie', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: { uid: 'u1', claims: {} }, error: null, throwOnError: () => ({}) });
    const auth = createAuthResource(http);
    await auth.verifySession('cookie123');
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/auth/verify', {
      body: { sessionCookie: 'cookie123' },
    });
  });

  it('returns error for invalid session', async () => {
    const http = mockHttp();
    http.request.mockResolvedValue({ data: null, error: { code: 'unauthorized', message: 'Invalid', status: 401 }, throwOnError: () => { throw new Error(); } });
    const auth = createAuthResource(http);
    const result = await auth.verifySession('bad');
    expect(result.data).toBeNull();
    expect(result.error!.code).toBe('unauthorized');
  });
});
