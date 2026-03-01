// src/adapter/routes.ts
// Wire all routes to service methods via ServiceContainer

import type { ServiceContainer } from '../container';
import { SERVICE_NAMES } from '../container';
import type { Route } from './types';

import { createPost, getPost, deletePost } from './handlers/posts';
import { getProfile, updateProfile, searchProfiles } from './handlers/profiles';
import { createFeed, getFeed, followFeed, unfollowFeed, submitToFeed } from './handlers/feeds';
import { createComment, listComments, deleteComment } from './handlers/comments';
import { searchEntities } from './handlers/search';
import { verifySession } from './handlers/auth';

/**
 * Create all REST routes wired to services resolved from the container.
 * Returns an array of Route objects that can be mounted in any HTTP framework.
 */
export function createRoutes(container: ServiceContainer): Route[] {
  const content = container.resolve(SERVICE_NAMES.CONTENT);
  const profile = container.resolve(SERVICE_NAMES.PROFILE);
  const feed = container.resolve(SERVICE_NAMES.FEED);
  const comment = container.resolve(SERVICE_NAMES.COMMENT);
  const search = container.resolve(SERVICE_NAMES.SEARCH);
  const auth = container.resolve(SERVICE_NAMES.AUTH);

  return [
    // Posts
    { method: 'POST', path: '/api/v1/posts', handler: createPost(content) },
    { method: 'GET', path: '/api/v1/posts/:id', handler: getPost(content) },
    { method: 'DELETE', path: '/api/v1/posts/:id', handler: deletePost() },

    // Feeds
    { method: 'POST', path: '/api/v1/feeds', handler: createFeed(content) },
    { method: 'GET', path: '/api/v1/feeds/:id', handler: getFeed(content) },
    { method: 'POST', path: '/api/v1/feeds/:id/follow', handler: followFeed(feed) },
    { method: 'POST', path: '/api/v1/feeds/:id/unfollow', handler: unfollowFeed(feed) },
    { method: 'POST', path: '/api/v1/feeds/:id/submit', handler: submitToFeed(feed) },

    // Profiles
    { method: 'GET', path: '/api/v1/profiles/:uid', handler: getProfile(profile) },
    { method: 'PUT', path: '/api/v1/profiles/:uid', handler: updateProfile(profile) },
    { method: 'POST', path: '/api/v1/profiles/search', handler: searchProfiles(profile) },

    // Comments
    { method: 'POST', path: '/api/v1/comments', handler: createComment(comment) },
    { method: 'GET', path: '/api/v1/posts/:id/comments', handler: listComments(comment) },
    { method: 'DELETE', path: '/api/v1/comments/:id', handler: deleteComment() },

    // Search
    { method: 'POST', path: '/api/v1/search', handler: searchEntities(search) },

    // Auth
    { method: 'POST', path: '/api/v1/auth/verify', handler: verifySession(auth) },
  ];
}
