// src/web/use-cases/discovery.spec.ts

import { discoverUsers } from './discovery';
import { ServiceContainer, SERVICE_NAMES } from '../../container';
import type { WebSDKContext } from '../context';
import { ok, err } from '../../types/result.types';
import { ExternalServiceError } from '../../errors/app-errors';

function createMockCtx(): WebSDKContext {
  const container = new ServiceContainer();
  const mockProfileService = {
    searchUsers: jest.fn(),
  };
  container.registerSingleton(SERVICE_NAMES.PROFILE, () => mockProfileService);
  return { container, userId: 'user-123' };
}

describe('discoverUsers', () => {
  it('should return matching profiles', async () => {
    const mockProfiles = [
      { uid: 'u1', displayName: 'Alice', username: 'alice' },
      { uid: 'u2', displayName: 'Alex', username: 'alex' },
    ];
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.searchUsers.mockResolvedValue(ok(mockProfiles));

    const result = await discoverUsers(ctx, { query: 'al', limit: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.profiles).toEqual(mockProfiles);
      expect(result.value.profiles).toHaveLength(2);
    }
    expect(profile.searchUsers).toHaveBeenCalledWith('al', 10);
  });

  it('should pass undefined limit when not specified', async () => {
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.searchUsers.mockResolvedValue(ok([]));

    await discoverUsers(ctx, { query: 'test' });

    expect(profile.searchUsers).toHaveBeenCalledWith('test', undefined);
  });

  it('should return WebSDKError on service failure', async () => {
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.searchUsers.mockResolvedValue(err(new ExternalServiceError('Firestore', 'Query failed')));

    const result = await discoverUsers(ctx, { query: 'test' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EXTERNAL_SERVICE_ERROR');
    }
  });
});
