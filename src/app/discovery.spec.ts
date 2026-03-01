// src/app/discovery.spec.ts

import { DiscoveryOperations } from './discovery';
import { createSuccess, createError } from '../clients/response';

function createMockHttp() {
  return { request: jest.fn() };
}

describe('DiscoveryOperations', () => {
  it('should return matching profiles', async () => {
    const http = createMockHttp();
    const ops = new DiscoveryOperations(http as any);
    const mockProfiles = [
      { uid: 'u1', displayName: 'Alice' },
      { uid: 'u2', displayName: 'Alex' },
    ];

    http.request.mockResolvedValueOnce(createSuccess(mockProfiles));

    const result = await ops.discoverUsers('user-1', { query: 'al', limit: 10 });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ profiles: mockProfiles });
    expect(http.request).toHaveBeenCalledWith('POST', '/api/v1/profiles/search', {
      body: { query: 'al', limit: 10 },
      userId: 'user-1',
    });
  });

  it('should return error on service failure', async () => {
    const http = createMockHttp();
    const ops = new DiscoveryOperations(http as any);

    http.request.mockResolvedValueOnce(
      createError({ code: 'internal', message: 'Search failed', status: 500 }),
    );

    const result = await ops.discoverUsers('user-1', { query: 'test' });

    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe('internal');
  });
});
