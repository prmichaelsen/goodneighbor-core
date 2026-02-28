import {
  createUserId,
  createPostId,
  createFeedId,
  createCommentId,
  createFeedSubmissionId,
  createSearchEntityId,
  formatUserRef,
  SYSTEM_TOKENS,
} from './common.types';

describe('Branded ID types', () => {
  it('should create branded IDs from strings', () => {
    const userId = createUserId('abc123');
    const postId = createPostId('post-1');
    const feedId = createFeedId('feed-1');
    const commentId = createCommentId('comment-1');
    const feedSubId = createFeedSubmissionId('sub-1');
    const searchId = createSearchEntityId('search-1');

    expect(userId).toBe('abc123');
    expect(postId).toBe('post-1');
    expect(feedId).toBe('feed-1');
    expect(commentId).toBe('comment-1');
    expect(feedSubId).toBe('sub-1');
    expect(searchId).toBe('search-1');
  });

  it('should be plain strings at runtime', () => {
    const userId = createUserId('abc123');
    expect(typeof userId).toBe('string');
    expect(userId.length).toBe(6);
    expect(userId.toUpperCase()).toBe('ABC123');
  });

  it('should work with string operations', () => {
    const postId = createPostId('post-abc');
    expect(postId.startsWith('post-')).toBe(true);
    expect(postId.includes('abc')).toBe(true);
  });
});

describe('SYSTEM_TOKENS', () => {
  it('should expose @public token', () => {
    expect(SYSTEM_TOKENS.PUBLIC).toBe('@public');
  });

  it('should be a frozen-like const', () => {
    // as const ensures literal type
    const token: '@public' = SYSTEM_TOKENS.PUBLIC;
    expect(token).toBe('@public');
  });
});

describe('formatUserRef', () => {
  it('should format user ref with @uid: prefix', () => {
    expect(formatUserRef('abc123')).toBe('@uid:abc123');
  });

  it('should handle various UID formats', () => {
    expect(formatUserRef('XyZ789AbC')).toBe('@uid:XyZ789AbC');
    expect(formatUserRef('user-with-dashes')).toBe('@uid:user-with-dashes');
    expect(formatUserRef('123')).toBe('@uid:123');
  });

  it('should handle empty string', () => {
    expect(formatUserRef('')).toBe('@uid:');
  });
});
