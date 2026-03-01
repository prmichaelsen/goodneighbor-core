import { FeedService } from './feed.service';
import type { ISearchService } from './search.service';
import type { CreateFeedDto } from '../types/feed.types';
import { COLLECTIONS } from '../constants/collections';

jest.mock('@prmichaelsen/firebase-admin-sdk-v8', () => ({
  setDocument: jest.fn(),
  getDocument: jest.fn(),
  updateDocument: jest.fn(),
  FieldValue: {
    arrayUnion: jest.fn((...args: any[]) => ({ _type: 'arrayUnion', values: args })),
    arrayRemove: jest.fn((...args: any[]) => ({ _type: 'arrayRemove', values: args })),
    increment: jest.fn((n: number) => ({ _type: 'increment', value: n })),
  },
}));

const sdk = require('@prmichaelsen/firebase-admin-sdk-v8');

function createMockSearchService(): ISearchService {
  return {
    search: jest.fn().mockResolvedValue({ ok: true, value: { hits: [] } }),
    indexDocument: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    indexDocuments: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    updateDocument: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    deleteDocument: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    deleteDocuments: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
    initializeIndex: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
  };
}

function createService() {
  const searchService = createMockSearchService();
  const logger = { error: jest.fn() };
  const service = new FeedService({ searchService, logger });
  return { service, searchService, logger };
}

const validFeedDto: CreateFeedDto = {
  name: 'Test Feed',
  description: 'A test feed',
  subtype: 'feed',
  isPublic: true,
};

const mockFeedDoc = {
  type: 'feed',
  id: 'feed-1',
  subtype: 'feed',
  refs: {
    hasOwner: ['@uid:owner-1'],
    hasFollower: [],
    hasSubmitPermissions: ['@public'],
    hasModerator: ['@uid:owner-1'],
    hasSubmission: [],
    hasRejected: [],
    hasMember: [],
    hasApprover: ['@uid:owner-1'],
    hasConfigureBehaviorPermissions: ['@uid:owner-1'],
    hasViewer: ['@public'],
    hasEditPermissions: ['@uid:owner-1'],
    hasArchivePermissions: ['@uid:owner-1'],
    hasUpdateViewersPermissions: ['@uid:owner-1'],
    hasConfigurePropertiesPermissions: ['@uid:owner-1'],
  },
};

describe('FeedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sdk.setDocument.mockResolvedValue(undefined);
    sdk.getDocument.mockResolvedValue(null);
    sdk.updateDocument.mockResolvedValue(undefined);
  });

  describe('createFeed', () => {
    it('should create a feed entity', async () => {
      const { service } = createService();
      const result = await service.createFeed(validFeedDto, 'user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe('feed');
        expect(result.value.id).toBeTruthy();
      }
    });

    it('should write to Firestore', async () => {
      const { service } = createService();
      await service.createFeed(validFeedDto, 'user-1');
      expect(sdk.setDocument).toHaveBeenCalledWith(
        COLLECTIONS.SEARCH,
        expect.any(String),
        expect.objectContaining({ type: 'feed' }),
      );
    });

    it('should trigger Algolia indexing', async () => {
      const { service, searchService } = createService();
      await service.createFeed(validFeedDto, 'user-1');
      expect(searchService.indexDocument).toHaveBeenCalled();
    });

    it('should return error on Firestore failure', async () => {
      sdk.setDocument.mockRejectedValue(new Error('write failed'));
      const { service } = createService();
      const result = await service.createFeed(validFeedDto, 'user-1');
      expect(result.ok).toBe(false);
    });
  });

  describe('getFeed', () => {
    it('should return feed when found', async () => {
      sdk.getDocument.mockResolvedValue(mockFeedDoc);
      const { service } = createService();
      const result = await service.getFeed('feed-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe('feed');
      }
    });

    it('should return NotFoundError when not found', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const { service } = createService();
      const result = await service.getFeed('missing');
      expect(result.ok).toBe(false);
    });

    it('should return NotFoundError when type is not feed', async () => {
      sdk.getDocument.mockResolvedValue({ type: 'post' });
      const { service } = createService();
      const result = await service.getFeed('not-a-feed');
      expect(result.ok).toBe(false);
    });
  });

  describe('followFeed', () => {
    it('should add user to followers with atomic operations', async () => {
      sdk.getDocument.mockResolvedValue(mockFeedDoc);
      const { service } = createService();
      const result = await service.followFeed('feed-1', 'user-1');
      expect(result.ok).toBe(true);
      expect(sdk.updateDocument).toHaveBeenCalledWith(
        COLLECTIONS.SEARCH,
        'feed-1',
        expect.objectContaining({
          'refs.hasFollower': expect.objectContaining({ _type: 'arrayUnion' }),
          'stats.followers': expect.objectContaining({ _type: 'increment', value: 1 }),
        }),
      );
    });

    it('should return NotFoundError if feed does not exist', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const { service } = createService();
      const result = await service.followFeed('missing', 'user-1');
      expect(result.ok).toBe(false);
    });
  });

  describe('unfollowFeed', () => {
    it('should remove user from followers with atomic operations', async () => {
      sdk.getDocument.mockResolvedValue(mockFeedDoc);
      const { service } = createService();
      const result = await service.unfollowFeed('feed-1', 'user-1');
      expect(result.ok).toBe(true);
      expect(sdk.updateDocument).toHaveBeenCalledWith(
        COLLECTIONS.SEARCH,
        'feed-1',
        expect.objectContaining({
          'refs.hasFollower': expect.objectContaining({ _type: 'arrayRemove' }),
          'stats.followers': expect.objectContaining({ _type: 'increment', value: -1 }),
        }),
      );
    });

    it('should return NotFoundError if feed does not exist', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const { service } = createService();
      const result = await service.unfollowFeed('missing', 'user-1');
      expect(result.ok).toBe(false);
    });
  });

  describe('submitToFeed', () => {
    it('should create a submission when user has permission (public feed)', async () => {
      sdk.getDocument.mockResolvedValue(mockFeedDoc);
      const { service } = createService();
      const result = await service.submitToFeed('feed-1', 'post-1', 'user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.feedId).toBe('feed-1');
        expect(result.value.postId).toBe('post-1');
        expect(result.value.status).toBe('pending');
      }
    });

    it('should write submission to FEED_SUBMISSIONS collection', async () => {
      sdk.getDocument.mockResolvedValue(mockFeedDoc);
      const { service } = createService();
      await service.submitToFeed('feed-1', 'post-1', 'user-1');
      expect(sdk.setDocument).toHaveBeenCalledWith(
        COLLECTIONS.FEED_SUBMISSIONS,
        expect.any(String),
        expect.objectContaining({ type: 'feed_submission' }),
      );
    });

    it('should update feed refs with submission ID', async () => {
      sdk.getDocument.mockResolvedValue(mockFeedDoc);
      const { service } = createService();
      await service.submitToFeed('feed-1', 'post-1', 'user-1');
      expect(sdk.updateDocument).toHaveBeenCalledWith(
        COLLECTIONS.SEARCH,
        'feed-1',
        expect.objectContaining({
          'refs.hasSubmission': expect.objectContaining({ _type: 'arrayUnion' }),
        }),
      );
    });

    it('should return ForbiddenError when user lacks permissions', async () => {
      const privateFeed = {
        ...mockFeedDoc,
        refs: { ...mockFeedDoc.refs, hasSubmitPermissions: ['@uid:owner-1'] },
      };
      sdk.getDocument.mockResolvedValue(privateFeed);
      const { service } = createService();
      const result = await service.submitToFeed('feed-1', 'post-1', 'random-user');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('submit permissions');
      }
    });

    it('should return NotFoundError when feed does not exist', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const { service } = createService();
      const result = await service.submitToFeed('missing', 'post-1', 'user-1');
      expect(result.ok).toBe(false);
    });
  });
});
