// src/app/discovery.ts
// Discovery compound operations — chains /api/v1/ REST endpoints

import type { HttpClient } from '../clients/http.js';
import type { SdkResponse } from '../clients/response.js';
import { createSuccess, createError } from '../clients/response.js';
import type { PublicProfile } from '../clients/svc/v1/types.js';

export class DiscoveryOperations {
  constructor(private http: HttpClient) {}

  /**
   * Search for users by query string.
   */
  async discoverUsers(
    userId: string,
    input: { query: string; limit?: number },
  ): Promise<SdkResponse<{ profiles: PublicProfile[] }>> {
    const result = await this.http.request<PublicProfile[]>(
      'POST',
      '/api/v1/profiles/search',
      { body: input, userId },
    );
    if (result.error) return createError(result.error);

    return createSuccess({ profiles: result.data! });
  }
}
