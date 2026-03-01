import { ContentService } from './content.service';
import type { ISearchService } from './search.service';
import type { CreatePostDto } from '../types/post.types';
import type { CreateFeedDto } from '../types/feed.types';
import { COLLECTIONS } from '../constants/collections';

jest.mock('@prmichaelsen/firebase-admin-sdk-v8', () => ({
  setDocument: jest.fn(),
  getDocument: jest.fn(),
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
  const service = new ContentService({ searchService, logger });
  return { service, searchService, logger };
}

const validPostDto: CreatePostDto = {
  title: 'Test Post',
  content: 'This is test content for a post',
  isPublic: true,
};

const validFeedDto: CreateFeedDto = {
  name: 'Test Feed',
  description: 'A test feed',
  subtype: 'feed',
  isPublic: true,
};

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sdk.setDocument.mockResolvedValue(undefined);
    sdk.getDocument.mockResolvedValue(null);
  });

  describe('createPost', () => {
    it('should create a post and return the entity', async () => {
      const { service } = createService();
      const result = await service.createPost(validPostDto, 'user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe('post');
        expect(result.value.id).toBeTruthy();
        expect(result.value.properties.mainContent).toBe(validPostDto.content);
        expect(result.value.refs.hasOwner).toContain('@uid:user-1');
      }
    });

    it('should write to Firestore SEARCH collection', async () => {
      const { service } = createService();
      await service.createPost(validPostDto, 'user-1');
      expect(sdk.setDocument).toHaveBeenCalledWith(
        COLLECTIONS.SEARCH,
        expect.any(String),
        expect.objectContaining({ type: 'post' }),
      );
    });

    it('should trigger non-blocking Algolia indexing', async () => {
      const { service, searchService } = createService();
      await service.createPost(validPostDto, 'user-1');
      expect(searchService.indexDocument).toHaveBeenCalled();
    });

    it('should return ValidationError for empty content', async () => {
      const { service } = createService();
      const result = await service.createPost({ ...validPostDto, content: '' }, 'user-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('required');
      }
    });

    it('should return ExternalServiceError on Firestore failure', async () => {
      sdk.setDocument.mockRejectedValue(new Error('Network error'));
      const { service } = createService();
      const result = await service.createPost(validPostDto, 'user-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Network error');
      }
    });

    it('should log and not throw on Algolia indexing failure', async () => {
      const { service, searchService, logger } = createService();
      (searchService.indexDocument as jest.Mock).mockRejectedValue(new Error('Algolia down'));
      await service.createPost(validPostDto, 'user-1');
      // Wait for the non-blocking catch
      await new Promise((r) => setTimeout(r, 10));
      expect(logger.error).toHaveBeenCalledWith(
        'Non-blocking Algolia indexing failed',
        expect.any(Object),
      );
    });
  });

  describe('createFeed', () => {
    it('should create a feed and return the entity', async () => {
      const { service } = createService();
      const result = await service.createFeed(validFeedDto, 'user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe('feed');
        expect(result.value.id).toBeTruthy();
        expect(result.value.subtype).toBe('feed');
      }
    });

    it('should write to Firestore SEARCH collection', async () => {
      const { service } = createService();
      await service.createFeed(validFeedDto, 'user-1');
      expect(sdk.setDocument).toHaveBeenCalledWith(
        COLLECTIONS.SEARCH,
        expect.any(String),
        expect.objectContaining({ type: 'feed' }),
      );
    });

    it('should return ExternalServiceError on Firestore failure', async () => {
      sdk.setDocument.mockRejectedValue(new Error('write failed'));
      const { service } = createService();
      const result = await service.createFeed(validFeedDto, 'user-1');
      expect(result.ok).toBe(false);
    });
  });

  describe('getPost', () => {
    it('should return a post when found', async () => {
      const mockPost = { type: 'post', id: 'p1', properties: { mainContent: 'hello' } };
      sdk.getDocument.mockResolvedValue(mockPost);
      const { service } = createService();
      const result = await service.getPost('p1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('p1');
      }
    });

    it('should return NotFoundError when document is null', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const { service } = createService();
      const result = await service.getPost('missing');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return NotFoundError when type is not post', async () => {
      sdk.getDocument.mockResolvedValue({ type: 'feed', id: 'f1' });
      const { service } = createService();
      const result = await service.getPost('f1');
      expect(result.ok).toBe(false);
    });

    it('should return ExternalServiceError on Firestore failure', async () => {
      sdk.getDocument.mockRejectedValue(new Error('read failed'));
      const { service } = createService();
      const result = await service.getPost('p1');
      expect(result.ok).toBe(false);
    });
  });

  describe('getFeed', () => {
    it('should return a feed when found', async () => {
      const mockFeed = { type: 'feed', id: 'f1', subtype: 'feed' };
      sdk.getDocument.mockResolvedValue(mockFeed);
      const { service } = createService();
      const result = await service.getFeed('f1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('f1');
      }
    });

    it('should return NotFoundError when not found', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const { service } = createService();
      const result = await service.getFeed('missing');
      expect(result.ok).toBe(false);
    });

    it('should return NotFoundError when type is not feed', async () => {
      sdk.getDocument.mockResolvedValue({ type: 'post', id: 'p1' });
      const { service } = createService();
      const result = await service.getFeed('p1');
      expect(result.ok).toBe(false);
    });
  });

  describe('mapPostToViewModel', () => {
    it('should delegate to mapDbPostToViewModel', () => {
      const { service } = createService();
      const mockPost: any = {
        id: 'p1', type: 'post', name: '', search: '',
        refs: { hasOwner: [], hasEditPermissions: [], hasArchivePermissions: [],
          hasLiker: [], hasFollower: [], hasViewer: [], hasUpdateViewersPermissions: [],
          hasConfigurePropertiesPermissions: [], hasSharer: [], hasTag: [], hasMention: [],
          hasSecretLiker: [], hasAnonymousLiker: [], hasReviewer: [], hasCreator: [],
          hasBeenViewedBy: [], hasFlair: [], hasSupporter: [], hasComments: [],
          hasCommenter: [], hasQuote: [], hasQuoter: [], hasAnnotation: [],
          hasAnnotator: [], hasRepost: [], hasReposter: [], hasAuthor: [],
          hasCollaborator: [], hasRelated: [] },
        isPublic: true, isPublished: true,
        timestamps: { createdAt: '', updatedAt: '' },
        metadata: {}, stats: { viewers: 0, followers: 0, sharers: 0, likers: 0,
          comments: 0, views: 0, reposts: 0, quotes: 0, annotations: 0, tags: 0 },
        properties: { displayName: 'Test', mainContent: 'Content', tags: [], mentions: [] },
      };
      const vm = service.mapPostToViewModel(mockPost, { userId: 'user-1' });
      expect(vm.id).toBe('p1');
      expect(vm.title).toBe('Test');
    });
  });
});
