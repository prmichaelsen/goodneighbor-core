// src/clients/svc/v1/index.ts
// createSvcClient factory — composes all resource groups

import { HttpClient } from '../../http.js';
import type { HttpClientConfig } from '../../http.js';
import { assertServerSide } from '../../guard.js';
import { createPostsResource } from './posts.js';
import { createProfilesResource } from './profiles.js';
import { createFeedsResource } from './feeds.js';
import { createCommentsResource } from './comments.js';
import { createSearchResource } from './search.js';
import { createAuthResource } from './auth.js';
import type { PostsResource } from './posts.js';
import type { ProfilesResource } from './profiles.js';
import type { FeedsResource } from './feeds.js';
import type { CommentsResource } from './comments.js';
import type { SearchResource } from './search.js';
import type { AuthResource } from './auth.js';

export interface SvcClient {
  posts: PostsResource;
  profiles: ProfilesResource;
  feeds: FeedsResource;
  comments: CommentsResource;
  search: SearchResource;
  auth: AuthResource;
}

/**
 * Create a typed svc client for the goodneighbor REST service /api/v1/ routes.
 * Server-side only — throws in browser environments.
 */
export function createSvcClient(config: HttpClientConfig): SvcClient {
  assertServerSide();

  const http = new HttpClient(config);

  return {
    posts: createPostsResource(http),
    profiles: createProfilesResource(http),
    feeds: createFeedsResource(http),
    comments: createCommentsResource(http),
    search: createSearchResource(http),
    auth: createAuthResource(http),
  };
}

// Re-export types
export type { HttpClientConfig } from '../../http.js';
export type { SdkResponse, SdkError } from '../../response.js';
export type { PostsResource } from './posts.js';
export type { ProfilesResource } from './profiles.js';
export type { FeedsResource } from './feeds.js';
export type { CommentsResource } from './comments.js';
export type { SearchResource } from './search.js';
export type { AuthResource, VerifySessionResult } from './auth.js';
