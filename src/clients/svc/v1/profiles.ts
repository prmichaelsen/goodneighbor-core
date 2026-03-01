// src/clients/svc/v1/profiles.ts
// ProfilesResource — 1:1 mirror of /api/v1/profiles routes

import type { HttpClient } from '../../http.js';
import type { SdkResponse } from '../../response.js';
import type { PublicProfile, ProfileFormData } from './types.js';

export interface ProfilesResource {
  get(userId: string, uid: string): Promise<SdkResponse<PublicProfile>>;
  update(userId: string, uid: string, input: Partial<ProfileFormData>): Promise<SdkResponse<PublicProfile>>;
  search(userId: string, input: { query: string; limit?: number }): Promise<SdkResponse<PublicProfile[]>>;
}

export function createProfilesResource(http: HttpClient): ProfilesResource {
  return {
    get(userId, uid) {
      return http.request('GET', `/api/v1/profiles/${uid}`, { userId });
    },
    update(userId, uid, input) {
      return http.request('PUT', `/api/v1/profiles/${uid}`, { userId, body: input });
    },
    search(userId, input) {
      return http.request('POST', '/api/v1/profiles/search', { userId, body: input });
    },
  };
}
