import { createFeedEntity } from './feed-creators';

describe('createFeedEntity', () => {
  const userId = 'feedcreator123';

  describe('feed-specific refs for public feeds', () => {
    const dto = {
      name: 'Neighborhood Watch',
      description: 'Community safety feed',
      isPublic: true as const,
      subtype: 'feed' as const,
    };

    it('should set hasModerator to creator', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasModerator).toEqual([`@uid:${userId}`]);
    });

    it('should set hasApprover to creator', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasApprover).toEqual([`@uid:${userId}`]);
    });

    it('should set hasSubmitPermissions to @public for public feeds', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasSubmitPermissions).toEqual(['@public']);
    });

    it('should set hasConfigureBehaviorPermissions to creator', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasConfigureBehaviorPermissions).toEqual([`@uid:${userId}`]);
    });

    it('should initialize hasMember as empty', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasMember).toEqual([]);
    });

    it('should initialize hasSubmission as empty', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasSubmission).toEqual([]);
    });

    it('should initialize hasRejected as empty', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasRejected).toEqual([]);
    });
  });

  describe('feed-specific refs for private feeds', () => {
    const dto = {
      name: 'Private Board',
      description: 'Invite only',
      isPublic: false as const,
      subtype: 'board' as const,
    };

    it('should set hasSubmitPermissions to @uid:{userId} for private feeds', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasSubmitPermissions).toEqual([`@uid:${userId}`]);
    });

    it('should set hasViewer to @uid:{userId} for private feeds', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasViewer).toEqual([`@uid:${userId}`]);
    });
  });

  describe('inherited ContentEntityRefs', () => {
    const dto = {
      name: 'Test Feed',
      description: 'Testing',
      isPublic: true as const,
      subtype: 'feed' as const,
    };

    it('should inherit all ownership refs from buildPostRefs', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasOwner).toEqual([`@uid:${userId}`]);
      expect(feed.refs.hasAuthor).toEqual([`@uid:${userId}`]);
      expect(feed.refs.hasCreator).toEqual([`@uid:${userId}`]);
    });

    it('should inherit all permission refs from buildPostRefs', () => {
      const feed = createFeedEntity(dto, userId);
      expect(feed.refs.hasEditPermissions).toEqual([`@uid:${userId}`]);
      expect(feed.refs.hasArchivePermissions).toEqual([`@uid:${userId}`]);
    });

    it('should have 36 total refs fields (29 inherited + 7 feed-specific)', () => {
      const feed = createFeedEntity(dto, userId);
      expect(Object.keys(feed.refs)).toHaveLength(36);
    });
  });

  describe('feed entity fields', () => {
    const dto = {
      name: 'Neighborhood Watch',
      description: 'Community safety feed',
      isPublic: true as const,
      subtype: 'feed' as const,
      tags: ['safety', 'community'],
      rules: ['Be respectful', 'No spam'],
    };

    it('should set type to "feed"', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.type).toBe('feed');
    });

    it('should set subtype from dto', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.subtype).toBe('feed');
    });

    it('should set properties.displayName from dto.name', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.properties.displayName).toBe('Neighborhood Watch');
    });

    it('should set properties.mainContent from dto.description', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.properties.mainContent).toBe('Community safety feed');
    });

    it('should set properties.rules from dto', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.properties.rules).toEqual(['Be respectful', 'No spam']);
    });

    it('should set properties.tags from dto.tags', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.properties.tags).toEqual(['safety', 'community']);
    });

    it('should initialize behavior with defaults', () => {
      const simpleDtoWithoutBehavior = {
        name: 'Simple Feed',
        description: 'Basic',
        isPublic: true as const,
        subtype: 'feed' as const,
      };
      const feed = createFeedEntity(simpleDtoWithoutBehavior, 'user1');
      expect(feed.behavior.submissionModels).toEqual(['direct']);
      expect(feed.behavior.approvalModels).toEqual(['auto']);
      expect(feed.behavior.ownershipModels).toEqual(['single']);
    });

    it('should initialize childrenFeeds as empty', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.childrenFeeds).toEqual([]);
    });

    it('should initialize stats with zeros', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.stats.viewers).toBe(0);
      expect(feed.stats.followers).toBe(0);
      expect(feed.stats.likers).toBe(0);
    });

    it('should set stats.tags to hashtag count', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.stats.tags).toBe(2);
    });

    it('should build search text from name, description, and tags', () => {
      const feed = createFeedEntity(dto, 'user1');
      expect(feed.search).toContain('Neighborhood Watch');
      expect(feed.search).toContain('Community safety feed');
      expect(feed.search).toContain('safety');
    });
  });
});
