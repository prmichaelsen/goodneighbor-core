// src/clients/svc/v1/search.ts
// SearchResource — 1:1 mirror of /api/v1/search routes

import type { HttpClient } from '../../http.js';
import type { SdkResponse } from '../../response.js';
import type { SearchResultItem } from '../../../types/search.types.js';

export interface SearchResource {
  search(userId: string, input: { query: string; filters?: Record<string, unknown>; limit?: number }): Promise<SdkResponse<SearchResultItem[]>>;
}

export function createSearchResource(http: HttpClient): SearchResource {
  return {
    search(userId, input) {
      return http.request('POST', '/api/v1/search', { userId, body: input });
    },
  };
}
