// src/app/profiles.ts
// Profile compound operations — chains /api/v1/ REST endpoints

import type { HttpClient } from '../clients/http.js';
import type { SdkResponse } from '../clients/response.js';
import { createSuccess, createError } from '../clients/response.js';
import type { PublicProfile, ProfileFormData } from '../clients/svc/v1/types.js';

export class ProfileOperations {
  constructor(private http: HttpClient) {}

  /**
   * Update a user's public profile.
   */
  async setupProfile(
    userId: string,
    input: Partial<ProfileFormData>,
  ): Promise<SdkResponse<PublicProfile>> {
    return this.http.request<PublicProfile>('PUT', `/api/v1/profiles/${userId}`, {
      body: input,
      userId,
    });
  }

  /**
   * View a user's public profile by UID.
   */
  async viewProfile(
    userId: string,
    targetUid: string,
  ): Promise<SdkResponse<{ profile: PublicProfile }>> {
    const result = await this.http.request<PublicProfile>(
      'GET',
      `/api/v1/profiles/${targetUid}`,
      { userId },
    );
    if (result.error) return createError(result.error);

    return createSuccess({ profile: result.data! });
  }
}
