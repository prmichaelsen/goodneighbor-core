// src/clients/svc/v1/auth.ts
// AuthResource — 1:1 mirror of /api/v1/auth routes

import type { HttpClient } from '../../http.js';
import type { SdkResponse } from '../../response.js';

export interface VerifySessionResult {
  uid: string;
  claims: Record<string, unknown>;
}

export interface AuthResource {
  verifySession(sessionCookie: string): Promise<SdkResponse<VerifySessionResult>>;
}

export function createAuthResource(http: HttpClient): AuthResource {
  return {
    verifySession(sessionCookie) {
      return http.request('POST', '/api/v1/auth/verify', { body: { sessionCookie } });
    },
  };
}
