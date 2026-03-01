// src/web/use-cases/profile.spec.ts

import { setupProfile, viewProfile } from './profile';
import { ServiceContainer, SERVICE_NAMES } from '../../container';
import type { WebSDKContext } from '../context';
import { ok, err } from '../../types/result.types';
import { NotFoundError, ConflictError, ValidationError, ExternalServiceError } from '../../errors/app-errors';

function createMockCtx(mockProfile: Record<string, any> = {}): WebSDKContext {
  const container = new ServiceContainer();
  const mockProfileService = {
    updatePublicProfile: jest.fn(),
    createDefaultBoard: jest.fn(),
    getPublicProfileById: jest.fn(),
    getProfileBoard: jest.fn(),
    ...mockProfile,
  };
  container.registerSingleton(SERVICE_NAMES.PROFILE, () => mockProfileService);
  return { container, userId: 'user-123' };
}

describe('setupProfile', () => {
  it('should update profile and create default board', async () => {
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.updatePublicProfile.mockResolvedValue(ok(undefined));
    profile.createDefaultBoard.mockResolvedValue(ok({ uid: 'user-123', widgets: [], layout: { columns: 2, gap: 16 } }));

    const result = await setupProfile(ctx, { displayName: 'John', bio: 'Hello' });

    expect(result.ok).toBe(true);
    expect(profile.updatePublicProfile).toHaveBeenCalledWith('user-123', { displayName: 'John', bio: 'Hello' });
    expect(profile.createDefaultBoard).toHaveBeenCalledWith('user-123');
  });

  it('should succeed even if board already exists (conflict)', async () => {
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.updatePublicProfile.mockResolvedValue(ok(undefined));
    profile.createDefaultBoard.mockResolvedValue(err(new ConflictError('Board already exists')));

    const result = await setupProfile(ctx, { displayName: 'John' });

    expect(result.ok).toBe(true);
  });

  it('should fail fast if updatePublicProfile fails', async () => {
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.updatePublicProfile.mockResolvedValue(
      err(new ValidationError('Invalid username', { username: ['invalid format'] })),
    );

    const result = await setupProfile(ctx, { username: '!!!' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
    expect(profile.createDefaultBoard).not.toHaveBeenCalled();
  });

  it('should fail if board creation fails with non-conflict error', async () => {
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.updatePublicProfile.mockResolvedValue(ok(undefined));
    profile.createDefaultBoard.mockResolvedValue(err(new ExternalServiceError('Firestore', 'Write failed')));

    const result = await setupProfile(ctx, { displayName: 'John' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EXTERNAL_SERVICE_ERROR');
    }
  });
});

describe('viewProfile', () => {
  it('should fetch profile and board in parallel', async () => {
    const mockProfileData = { uid: 'target-uid', displayName: 'Jane', username: 'jane' };
    const mockBoard = { uid: 'target-uid', widgets: [], layout: { columns: 2, gap: 16 } };
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.getPublicProfileById.mockResolvedValue(ok(mockProfileData));
    profile.getProfileBoard.mockResolvedValue(ok(mockBoard));

    const result = await viewProfile(ctx, 'target-uid');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.profile).toEqual(mockProfileData);
      expect(result.value.board).toEqual(mockBoard);
    }
  });

  it('should return null board if board not found', async () => {
    const mockProfileData = { uid: 'target-uid', displayName: 'Jane' };
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.getPublicProfileById.mockResolvedValue(ok(mockProfileData));
    profile.getProfileBoard.mockResolvedValue(err(new NotFoundError('ProfileBoard', 'target-uid')));

    const result = await viewProfile(ctx, 'target-uid');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.profile).toEqual(mockProfileData);
      expect(result.value.board).toBeNull();
    }
  });

  it('should fail if profile not found', async () => {
    const ctx = createMockCtx();
    const profile = ctx.container.resolve(SERVICE_NAMES.PROFILE) as any;
    profile.getPublicProfileById.mockResolvedValue(err(new NotFoundError('PublicProfile', 'target-uid')));
    profile.getProfileBoard.mockResolvedValue(err(new NotFoundError('ProfileBoard', 'target-uid')));

    const result = await viewProfile(ctx, 'target-uid');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
