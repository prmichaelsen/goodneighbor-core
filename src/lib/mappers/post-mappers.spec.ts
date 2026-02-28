import { mapDbPostToViewModel } from './post-mappers';
import type { DbPost, ContentEntityRefs } from '../../types/content-entity.types';

function createTestRefs(overrides: Partial<ContentEntityRefs> = {}): ContentEntityRefs {
  return {
    hasOwner: ['@uid:owner1'],
    hasViewer: ['@public'],
    hasEditPermissions: ['@uid:owner1'],
    hasArchivePermissions: ['@uid:owner1'],
    hasUpdateViewersPermissions: ['@uid:owner1'],
    hasConfigurePropertiesPermissions: ['@uid:owner1'],
    hasAuthor: ['@uid:owner1'],
    hasCreator: ['@uid:owner1'],
    hasCollaborator: ['@uid:owner1'],
    hasTag: ['test'],
    hasMention: [],
    hasFollower: ['@uid:follower1'],
    hasSharer: [],
    hasLiker: ['@uid:liker1'],
    hasSecretLiker: [],
    hasAnonymousLiker: [],
    hasReviewer: [],
    hasBeenViewedBy: [],
    hasFlair: [],
    hasSupporter: [],
    hasComments: [],
    hasCommenter: [],
    hasQuote: [],
    hasQuoter: [],
    hasAnnotation: [],
    hasAnnotator: [],
    hasRepost: [],
    hasReposter: [],
    hasRelated: [],
    ...overrides,
  };
}

function createTestDbPost(overrides: Partial<DbPost> = {}): DbPost {
  return {
    id: 'post-1',
    type: 'post',
    name: 'Test Post',
    search: 'test content',
    isPublic: true,
    isPublished: true,
    timestamps: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    metadata: {},
    stats: { viewers: 0, followers: 0, sharers: 0, likers: 0, comments: 0, views: 0, reposts: 0, quotes: 0, annotations: 0, tags: 0 },
    properties: {
      displayName: 'Test Post',
      mainContent: 'Test content body',
      tags: ['test'],
      mentions: [],
    },
    refs: createTestRefs(),
    ...overrides,
  };
}

describe('mapDbPostToViewModel', () => {
  describe('as post owner', () => {
    it('should set canEdit to true', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), { userId: 'owner1' });
      expect(vm.canEdit).toBe(true);
    });

    it('should set canDelete to true', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), { userId: 'owner1' });
      expect(vm.canDelete).toBe(true);
    });

    it('should set isOwner to true', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), { userId: 'owner1' });
      expect(vm.isOwner).toBe(true);
    });
  });

  describe('as non-owner user', () => {
    it('should set canEdit to false', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), { userId: 'other-user' });
      expect(vm.canEdit).toBe(false);
    });

    it('should set canDelete to false', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), { userId: 'other-user' });
      expect(vm.canDelete).toBe(false);
    });

    it('should set isOwner to false', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), { userId: 'other-user' });
      expect(vm.isOwner).toBe(false);
    });
  });

  describe('social flags', () => {
    it('should set isLiked to true when user is in hasLiker', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), { userId: 'liker1' });
      expect(vm.isLiked).toBe(true);
    });

    it('should set isLiked to false when user is not in hasLiker', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), { userId: 'other-user' });
      expect(vm.isLiked).toBe(false);
    });

    it('should set isFollowing to true when user is in hasFollower', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), { userId: 'follower1' });
      expect(vm.isFollowing).toBe(true);
    });
  });

  describe('unauthenticated user', () => {
    it('should set all permission flags to false', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), null);
      expect(vm.canEdit).toBe(false);
      expect(vm.canDelete).toBe(false);
      expect(vm.isLiked).toBe(false);
      expect(vm.isFollowing).toBe(false);
      expect(vm.isOwner).toBe(false);
    });
  });

  describe('field mapping', () => {
    it('should map properties.displayName to title', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), null);
      expect(vm.title).toBe('Test Post');
    });

    it('should map properties.mainContent to content', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), null);
      expect(vm.content).toBe('Test content body');
    });

    it('should include stats', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), null);
      expect(vm.stats).toBeDefined();
    });

    it('should include timestamps', () => {
      const vm = mapDbPostToViewModel(createTestDbPost(), null);
      expect(vm.timestamps.createdAt).toBe('2026-01-01T00:00:00Z');
    });
  });
});
