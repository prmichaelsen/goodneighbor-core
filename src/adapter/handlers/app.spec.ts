// src/adapter/handlers/app.spec.ts

import {
  appCreateAndSubmitToFeed,
  appCreateFeedAndFollow,
  appSetupProfile,
  appViewProfile,
  appDiscoverUsers,
} from './app';
import { ok, err } from '../../types/result.types';
import { ExternalServiceError, ForbiddenError, NotFoundError, ConflictError, ValidationError } from '../../errors/app-errors';
import type { AdapterRequest } from '../types';

function makeReq(overrides: Partial<AdapterRequest> = {}): AdapterRequest {
  return {
    method: 'POST',
    path: '/api/app/v1/test',
    params: {},
    body: {},
    userId: 'user-123',
    ...overrides,
  };
}

describe('appCreateAndSubmitToFeed', () => {
  it('should create post and submit to feed', async () => {
    const content = { createPost: jest.fn() };
    const feed = { submitToFeed: jest.fn() };
    const mockPost = { id: 'post-1', title: 'Test' };
    content.createPost.mockResolvedValue(ok(mockPost));
    feed.submitToFeed.mockResolvedValue(ok(undefined));

    const handler = appCreateAndSubmitToFeed(content as any, feed as any);
    const result = await handler(makeReq({
      body: { post: { title: 'Test', content: 'Hello' }, feedId: 'feed-1' },
    }));

    expect(result.status).toBe(201);
    expect(result.body).toEqual({ post: mockPost });
    expect(feed.submitToFeed).toHaveBeenCalledWith('feed-1', 'post-1', 'user-123');
  });

  it('should fail fast if createPost fails', async () => {
    const content = { createPost: jest.fn() };
    const feed = { submitToFeed: jest.fn() };
    content.createPost.mockResolvedValue(err(new ExternalServiceError('Firestore', 'Write failed')));

    const handler = appCreateAndSubmitToFeed(content as any, feed as any);
    const result = await handler(makeReq({
      body: { post: { title: 'Test' }, feedId: 'feed-1' },
    }));

    expect(result.status).toBe(502);
    expect(feed.submitToFeed).not.toHaveBeenCalled();
  });
});

describe('appCreateFeedAndFollow', () => {
  it('should create feed and follow it', async () => {
    const content = { createFeed: jest.fn() };
    const feed = { followFeed: jest.fn() };
    const mockFeed = { id: 'feed-1', name: 'Test Feed' };
    content.createFeed.mockResolvedValue(ok(mockFeed));
    feed.followFeed.mockResolvedValue(ok(undefined));

    const handler = appCreateFeedAndFollow(content as any, feed as any);
    const result = await handler(makeReq({
      body: { name: 'Test Feed', description: 'A feed' },
    }));

    expect(result.status).toBe(201);
    expect(result.body).toEqual({ feed: mockFeed });
    expect(feed.followFeed).toHaveBeenCalledWith('feed-1', 'user-123');
  });

  it('should fail fast if createFeed fails', async () => {
    const content = { createFeed: jest.fn() };
    const feed = { followFeed: jest.fn() };
    content.createFeed.mockResolvedValue(err(new ExternalServiceError('Firestore', 'Write failed')));

    const handler = appCreateFeedAndFollow(content as any, feed as any);
    const result = await handler(makeReq({
      body: { name: 'Test Feed' },
    }));

    expect(result.status).toBe(502);
    expect(feed.followFeed).not.toHaveBeenCalled();
  });
});

describe('appSetupProfile', () => {
  it('should update profile and create board', async () => {
    const profile = {
      updatePublicProfile: jest.fn(),
      createDefaultBoard: jest.fn(),
    };
    profile.updatePublicProfile.mockResolvedValue(ok({ uid: 'user-123', displayName: 'John' }));
    profile.createDefaultBoard.mockResolvedValue(ok({ uid: 'user-123', widgets: [] }));

    const handler = appSetupProfile(profile as any);
    const result = await handler(makeReq({ body: { displayName: 'John' } }));

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ uid: 'user-123', displayName: 'John' });
  });

  it('should succeed if board already exists (conflict)', async () => {
    const profile = {
      updatePublicProfile: jest.fn(),
      createDefaultBoard: jest.fn(),
    };
    profile.updatePublicProfile.mockResolvedValue(ok({ uid: 'user-123', displayName: 'John' }));
    profile.createDefaultBoard.mockResolvedValue(err(new ConflictError('Board already exists')));

    const handler = appSetupProfile(profile as any);
    const result = await handler(makeReq({ body: { displayName: 'John' } }));

    expect(result.status).toBe(200);
  });

  it('should fail if updatePublicProfile fails', async () => {
    const profile = {
      updatePublicProfile: jest.fn(),
      createDefaultBoard: jest.fn(),
    };
    profile.updatePublicProfile.mockResolvedValue(
      err(new ValidationError('Invalid', { username: ['bad'] })),
    );

    const handler = appSetupProfile(profile as any);
    const result = await handler(makeReq({ body: { username: '!!!' } }));

    expect(result.status).toBe(400);
    expect(profile.createDefaultBoard).not.toHaveBeenCalled();
  });
});

describe('appViewProfile', () => {
  it('should fetch profile and board in parallel', async () => {
    const mockProfile = { uid: 'target', displayName: 'Jane' };
    const mockBoard = { uid: 'target', widgets: [] };
    const profile = {
      getPublicProfileById: jest.fn().mockResolvedValue(ok(mockProfile)),
      getProfileBoard: jest.fn().mockResolvedValue(ok(mockBoard)),
    };

    const handler = appViewProfile(profile as any);
    const result = await handler(makeReq({ params: { uid: 'target' } }));

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ profile: mockProfile, board: mockBoard });
  });

  it('should return null board if not found', async () => {
    const mockProfile = { uid: 'target', displayName: 'Jane' };
    const profile = {
      getPublicProfileById: jest.fn().mockResolvedValue(ok(mockProfile)),
      getProfileBoard: jest.fn().mockResolvedValue(err(new NotFoundError('Board', 'target'))),
    };

    const handler = appViewProfile(profile as any);
    const result = await handler(makeReq({ params: { uid: 'target' } }));

    expect(result.status).toBe(200);
    expect((result.body as any).board).toBeNull();
  });

  it('should fail if profile not found', async () => {
    const profile = {
      getPublicProfileById: jest.fn().mockResolvedValue(err(new NotFoundError('Profile', 'target'))),
      getProfileBoard: jest.fn().mockResolvedValue(err(new NotFoundError('Board', 'target'))),
    };

    const handler = appViewProfile(profile as any);
    const result = await handler(makeReq({ params: { uid: 'target' } }));

    expect(result.status).toBe(404);
  });
});

describe('appDiscoverUsers', () => {
  it('should search and return profiles', async () => {
    const mockProfiles = [{ uid: 'u1', displayName: 'Alice' }];
    const profile = {
      searchUsers: jest.fn().mockResolvedValue(ok(mockProfiles)),
    };

    const handler = appDiscoverUsers(profile as any);
    const result = await handler(makeReq({ body: { query: 'al', limit: 10 } }));

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ profiles: mockProfiles });
    expect(profile.searchUsers).toHaveBeenCalledWith('al', 10);
  });

  it('should return error on failure', async () => {
    const profile = {
      searchUsers: jest.fn().mockResolvedValue(err(new ExternalServiceError('Algolia', 'Failed'))),
    };

    const handler = appDiscoverUsers(profile as any);
    const result = await handler(makeReq({ body: { query: 'test' } }));

    expect(result.status).toBe(502);
  });
});
