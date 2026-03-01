// src/clients/svc/v1/posts.ts
// PostsResource — 1:1 mirror of /api/v1/posts routes

import type { HttpClient } from '../../http.js';
import type { SdkResponse } from '../../response.js';
import type { CreatePostDto, PostViewModel } from '../../../types/post.types.js';
import type { DbPost } from '../../../types/content-entity.types.js';

export interface PostsResource {
  create(userId: string, input: CreatePostDto): Promise<SdkResponse<DbPost>>;
  get(userId: string, id: string): Promise<SdkResponse<PostViewModel>>;
  delete(userId: string, id: string): Promise<SdkResponse<void>>;
}

export function createPostsResource(http: HttpClient): PostsResource {
  return {
    create(userId, input) {
      return http.request('POST', '/api/v1/posts', { userId, body: input });
    },
    get(userId, id) {
      return http.request('GET', `/api/v1/posts/${id}`, { userId });
    },
    delete(userId, id) {
      return http.request('DELETE', `/api/v1/posts/${id}`, { userId });
    },
  };
}
