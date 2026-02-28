import { buildPostRefs, createPostEntity } from './post-creators';

describe('buildPostRefs', () => {
  const userId = 'abc123def456';

  describe('public posts', () => {
    it('should set hasViewer to ["@public"]', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasViewer).toEqual(['@public']);
    });
  });

  describe('private posts', () => {
    it('should set hasViewer to ["@uid:{userId}"]', () => {
      const refs = buildPostRefs(userId, false, [], []);
      expect(refs.hasViewer).toEqual([`@uid:${userId}`]);
    });
  });

  describe('ownership refs', () => {
    it('should set hasOwner with @uid: format', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasOwner).toEqual([`@uid:${userId}`]);
    });

    it('should set hasAuthor with @uid: format', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasAuthor).toEqual([`@uid:${userId}`]);
    });

    it('should set hasCreator with @uid: format', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasCreator).toEqual([`@uid:${userId}`]);
    });

    it('should set hasCollaborator with @uid: format', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasCollaborator).toEqual([`@uid:${userId}`]);
    });
  });

  describe('permission refs', () => {
    it('should set all permission arrays to creator', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasEditPermissions).toEqual([`@uid:${userId}`]);
      expect(refs.hasArchivePermissions).toEqual([`@uid:${userId}`]);
      expect(refs.hasUpdateViewersPermissions).toEqual([`@uid:${userId}`]);
      expect(refs.hasConfigurePropertiesPermissions).toEqual([`@uid:${userId}`]);
    });
  });

  describe('content association refs', () => {
    it('should set hasTag from hashtags', () => {
      const refs = buildPostRefs(userId, true, ['safety', 'alert'], []);
      expect(refs.hasTag).toEqual(['safety', 'alert']);
    });

    it('should set hasMention from mentionUids', () => {
      const refs = buildPostRefs(userId, true, [], ['uid1', 'uid2']);
      expect(refs.hasMention).toEqual(['uid1', 'uid2']);
    });
  });

  describe('social interaction refs', () => {
    it('should initialize all social arrays as empty', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(refs.hasFollower).toEqual([]);
      expect(refs.hasSharer).toEqual([]);
      expect(refs.hasLiker).toEqual([]);
      expect(refs.hasSecretLiker).toEqual([]);
      expect(refs.hasAnonymousLiker).toEqual([]);
      expect(refs.hasReviewer).toEqual([]);
      expect(refs.hasBeenViewedBy).toEqual([]);
      expect(refs.hasFlair).toEqual([]);
      expect(refs.hasSupporter).toEqual([]);
      expect(refs.hasComments).toEqual([]);
      expect(refs.hasCommenter).toEqual([]);
      expect(refs.hasQuote).toEqual([]);
      expect(refs.hasQuoter).toEqual([]);
      expect(refs.hasAnnotation).toEqual([]);
      expect(refs.hasAnnotator).toEqual([]);
      expect(refs.hasRepost).toEqual([]);
      expect(refs.hasReposter).toEqual([]);
      expect(refs.hasRelated).toEqual([]);
    });
  });

  describe('refs field count', () => {
    it('should have exactly 29 fields (ContentEntityRefs)', () => {
      const refs = buildPostRefs(userId, true, [], []);
      expect(Object.keys(refs)).toHaveLength(29);
    });
  });
});

describe('createPostEntity', () => {
  const userId = 'abc123def456';
  const dto = {
    title: 'Safety Alert',
    content: 'Watch out for suspicious activity on Main St',
    isPublic: true as const,
  };
  const processed = {
    hashtags: ['safety', 'alert'],
    mentions: ['alice123'],
    urls: ['https://example.com'],
    category: 'safety' as const,
  };

  it('should set type to "post"', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.type).toBe('post');
  });

  it('should map title to properties.displayName', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.properties.displayName).toBe('Safety Alert');
  });

  it('should map content to properties.mainContent', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.properties.mainContent).toBe(dto.content);
  });

  it('should set properties.tags from processed hashtags', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.properties.tags).toEqual(['safety', 'alert']);
  });

  it('should set properties.mentions from processed mentions', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.properties.mentions).toEqual(['alice123']);
  });

  it('should build correct refs', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.refs.hasViewer).toEqual(['@public']);
    expect(entity.refs.hasOwner).toEqual([`@uid:${userId}`]);
    expect(entity.refs.hasTag).toEqual(['safety', 'alert']);
  });

  it('should initialize stats with zeros', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.stats.viewers).toBe(0);
    expect(entity.stats.followers).toBe(0);
    expect(entity.stats.likers).toBe(0);
    expect(entity.stats.comments).toBe(0);
    expect(entity.stats.views).toBe(0);
  });

  it('should set stats.tags to hashtag count', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.stats.tags).toBe(2);
  });

  it('should set timestamps', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.timestamps.createdAt).toBeTruthy();
    expect(entity.timestamps.updatedAt).toBeTruthy();
    expect(entity.timestamps.createdAt).toBe(entity.timestamps.updatedAt);
  });

  it('should build search text from title, content, and hashtags', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.search).toContain('Safety Alert');
    expect(entity.search).toContain(dto.content);
    expect(entity.search).toContain('safety');
  });

  it('should set isPublic from dto', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.isPublic).toBe(true);
  });

  it('should set isPublished to true', () => {
    const entity = createPostEntity(dto, userId, processed);
    expect(entity.isPublished).toBe(true);
  });
});

describe('semantic ID format', () => {
  it('should use @uid: prefix for all user ID refs', () => {
    const userId = 'testuser123';
    const refs = buildPostRefs(userId, true, [], []);
    const expectedId = `@uid:${userId}`;

    expect(refs.hasOwner[0]).toBe(expectedId);
    expect(refs.hasAuthor[0]).toBe(expectedId);
    expect(refs.hasCreator[0]).toBe(expectedId);
    expect(refs.hasCollaborator[0]).toBe(expectedId);
    expect(refs.hasEditPermissions[0]).toBe(expectedId);
    expect(refs.hasArchivePermissions[0]).toBe(expectedId);
    expect(refs.hasUpdateViewersPermissions[0]).toBe(expectedId);
    expect(refs.hasConfigurePropertiesPermissions[0]).toBe(expectedId);
  });

  it('should use @public for public post visibility', () => {
    const refs = buildPostRefs('user1', true, [], []);
    expect(refs.hasViewer).toEqual(['@public']);
  });

  it('should use @uid: for private post visibility', () => {
    const refs = buildPostRefs('user1', false, [], []);
    expect(refs.hasViewer).toEqual(['@uid:user1']);
  });
});
