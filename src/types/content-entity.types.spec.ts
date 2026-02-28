import type {
  SearchEntityRefs,
  ContentEntityRefs,
  FeedEntityRefs,
  SearchEntityType,
  FeedSubtype,
  FeedSubmissionStatus,
  EntityStats,
  SearchEntity,
  ContentEntity,
  DbPost,
  DbFeed,
  DbFeedSubmission,
  ContentEntityProperties,
  FeedProperties,
  FeedBehavior,
} from './content-entity.types';

// ─── Refs Hierarchy ──────────────────────────────────────────────────────

describe('SearchEntityRefs', () => {
  it('should have exactly 6 fields', () => {
    const refs: SearchEntityRefs = {
      hasOwner: [],
      hasViewer: [],
      hasEditPermissions: [],
      hasArchivePermissions: [],
      hasUpdateViewersPermissions: [],
      hasConfigurePropertiesPermissions: [],
    };
    expect(Object.keys(refs)).toHaveLength(6);
  });
});

describe('ContentEntityRefs', () => {
  it('should have exactly 29 fields (6 base + 23 content)', () => {
    const refs: ContentEntityRefs = {
      // 6 from SearchEntityRefs
      hasOwner: [],
      hasViewer: [],
      hasEditPermissions: [],
      hasArchivePermissions: [],
      hasUpdateViewersPermissions: [],
      hasConfigurePropertiesPermissions: [],
      // 23 content/social arrays
      hasFollower: [],
      hasSharer: [],
      hasTag: [],
      hasMention: [],
      hasLiker: [],
      hasSecretLiker: [],
      hasAnonymousLiker: [],
      hasReviewer: [],
      hasCreator: [],
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
      hasAuthor: [],
      hasCollaborator: [],
      hasRelated: [],
    };
    expect(Object.keys(refs)).toHaveLength(29);
  });
});

describe('FeedEntityRefs', () => {
  it('should have exactly 36 fields (29 content + 7 feed)', () => {
    const refs: FeedEntityRefs = {
      // 6 from SearchEntityRefs
      hasOwner: [],
      hasViewer: [],
      hasEditPermissions: [],
      hasArchivePermissions: [],
      hasUpdateViewersPermissions: [],
      hasConfigurePropertiesPermissions: [],
      // 23 from ContentEntityRefs
      hasFollower: [],
      hasSharer: [],
      hasTag: [],
      hasMention: [],
      hasLiker: [],
      hasSecretLiker: [],
      hasAnonymousLiker: [],
      hasReviewer: [],
      hasCreator: [],
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
      hasAuthor: [],
      hasCollaborator: [],
      hasRelated: [],
      // 7 feed-specific
      hasModerator: [],
      hasMember: [],
      hasApprover: [],
      hasSubmitPermissions: [],
      hasConfigureBehaviorPermissions: [],
      hasSubmission: [],
      hasRejected: [],
    };
    expect(Object.keys(refs)).toHaveLength(36);
  });
});

// ─── Type Discriminators ─────────────────────────────────────────────────

describe('SearchEntityType', () => {
  it('should accept all 4 valid types', () => {
    const types: SearchEntityType[] = ['post', 'feed', 'comment', 'feed_submission'];
    expect(types).toHaveLength(4);
  });
});

describe('FeedSubtype', () => {
  it('should accept all 5 valid subtypes', () => {
    const subtypes: FeedSubtype[] = ['user', 'feed', 'dynamic', 'list', 'board'];
    expect(subtypes).toHaveLength(5);
  });
});

describe('FeedSubmissionStatus', () => {
  it('should accept all 4 valid statuses', () => {
    const statuses: FeedSubmissionStatus[] = ['pending', 'approved', 'rejected', 'auto_approved'];
    expect(statuses).toHaveLength(4);
  });
});

// ─── EntityStats ─────────────────────────────────────────────────────────

describe('EntityStats', () => {
  it('should have 10 counter fields', () => {
    const stats: EntityStats = {
      viewers: 0,
      followers: 0,
      sharers: 0,
      likers: 0,
      comments: 0,
      views: 0,
      reposts: 0,
      quotes: 0,
      annotations: 0,
      tags: 0,
    };
    expect(Object.keys(stats)).toHaveLength(10);
  });
});

// ─── Entity Interfaces ───────────────────────────────────────────────────

describe('DbPost', () => {
  it('should have type "post" and content entity fields', () => {
    const post: DbPost = {
      id: 'post_1',
      type: 'post',
      name: 'Test Post',
      search: 'searchable text',
      refs: {
        hasOwner: ['@uid:user1'],
        hasViewer: ['@public'],
        hasEditPermissions: ['@uid:user1'],
        hasArchivePermissions: ['@uid:user1'],
        hasUpdateViewersPermissions: ['@uid:user1'],
        hasConfigurePropertiesPermissions: ['@uid:user1'],
        hasFollower: [],
        hasSharer: [],
        hasTag: ['safety'],
        hasMention: [],
        hasLiker: [],
        hasSecretLiker: [],
        hasAnonymousLiker: [],
        hasReviewer: [],
        hasCreator: ['@uid:user1'],
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
        hasAuthor: ['@uid:user1'],
        hasCollaborator: ['@uid:user1'],
        hasRelated: [],
      },
      isPublic: true,
      isPublished: true,
      timestamps: { createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      metadata: {},
      stats: {
        viewers: 0, followers: 0, sharers: 0, likers: 0,
        comments: 0, views: 0, reposts: 0, quotes: 0,
        annotations: 0, tags: 1,
      },
      properties: {
        displayName: 'Test Post',
        mainContent: 'Post body',
        tags: ['safety'],
        mentions: [],
      },
    };
    expect(post.type).toBe('post');
    expect(post.refs.hasOwner).toContain('@uid:user1');
    expect(post.refs.hasViewer).toContain('@public');
  });
});

describe('DbFeed', () => {
  it('should use FeedEntityRefs (not ContentEntityRefs)', () => {
    const feed: DbFeed = {
      id: 'feed_1',
      type: 'feed',
      name: 'Test Feed',
      subtype: 'feed',
      childrenFeeds: [],
      search: '',
      refs: {
        hasOwner: ['@uid:user1'],
        hasViewer: ['@public'],
        hasEditPermissions: ['@uid:user1'],
        hasArchivePermissions: ['@uid:user1'],
        hasUpdateViewersPermissions: ['@uid:user1'],
        hasConfigurePropertiesPermissions: ['@uid:user1'],
        hasFollower: [],
        hasSharer: [],
        hasTag: [],
        hasMention: [],
        hasLiker: [],
        hasSecretLiker: [],
        hasAnonymousLiker: [],
        hasReviewer: [],
        hasCreator: ['@uid:user1'],
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
        hasAuthor: ['@uid:user1'],
        hasCollaborator: ['@uid:user1'],
        hasRelated: [],
        // Feed-specific refs
        hasModerator: ['@uid:user1'],
        hasMember: [],
        hasApprover: ['@uid:user1'],
        hasSubmitPermissions: ['@public'],
        hasConfigureBehaviorPermissions: ['@uid:user1'],
        hasSubmission: [],
        hasRejected: [],
      },
      isPublic: true,
      isPublished: true,
      timestamps: { createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      metadata: {},
      stats: {
        viewers: 0, followers: 0, sharers: 0, likers: 0,
        comments: 0, views: 0, reposts: 0, quotes: 0,
        annotations: 0, tags: 0,
      },
      properties: {
        displayName: 'Test Feed',
        mainContent: '',
        tags: [],
        mentions: [],
        rules: ['Be kind'],
      },
      behavior: {
        submissionModels: [],
        approvalModels: [],
        ownershipModels: [],
        automatedRules: [],
        contentModel: [],
        flair: [],
      },
    };
    expect(feed.type).toBe('feed');
    expect(feed.refs.hasModerator).toContain('@uid:user1');
    expect(feed.subtype).toBe('feed');
  });
});

describe('DbFeedSubmission', () => {
  it('should extend SearchEntity (not ContentEntity)', () => {
    const submission: DbFeedSubmission = {
      id: 'sub_1',
      type: 'feed_submission',
      name: 'Submission',
      feedId: 'feed_1',
      postId: 'post_1',
      createdBy: 'user1',
      status: 'pending',
      submittedAt: '2024-01-01T00:00:00Z',
    };
    expect(submission.type).toBe('feed_submission');
    expect(submission.status).toBe('pending');
    // Should NOT have content entity fields
    expect((submission as any).refs).toBeUndefined();
    expect((submission as any).stats).toBeUndefined();
  });
});
