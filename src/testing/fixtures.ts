// src/testing/fixtures.ts
// Test data factories for goodneighbor-core testing.

import type { CreatePostDto } from '../types/post.types';
import type { CreateFeedDto } from '../types/feed.types';
import type { PublicProfile } from '../types/profile.types';
import type { CreateCommentDto } from '../types/comment.types';

/**
 * Create a test post DTO with defaults.
 */
export function createTestPost(overrides: Partial<CreatePostDto> = {}): CreatePostDto {
  return {
    title: 'Test Post',
    content: 'This is test content for integration testing.',
    isPublic: true,
    ...overrides,
  };
}

/**
 * Create a test public profile with defaults.
 */
export function createTestPublicProfile(
  uid: string,
  overrides: Partial<PublicProfile> = {},
): PublicProfile {
  const now = new Date().toISOString();
  return {
    uid,
    username: `testuser_${uid.slice(0, 8)}`,
    displayName: 'Test User',
    bio: 'A test user profile',
    avatarUrl: '',
    isVerified: false,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    timestamps: { createdAt: now, updatedAt: now },
    ...overrides,
  };
}

/**
 * Create a test feed DTO with defaults.
 */
export function createTestFeed(overrides: Partial<CreateFeedDto> = {}): CreateFeedDto {
  return {
    name: 'Test Feed',
    description: 'A test feed for integration testing.',
    subtype: 'feed',
    isPublic: true,
    ...overrides,
  };
}

/**
 * Create a test comment DTO with defaults.
 */
export function createTestComment(overrides: Partial<CreateCommentDto> = {}): CreateCommentDto {
  return {
    postId: 'test-post-id',
    content: 'This is a test comment.',
    ...overrides,
  };
}
