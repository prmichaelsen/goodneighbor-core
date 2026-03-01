// src/clients/svc/v1/health.ts
// HealthResource — public endpoints (no auth required)

import type { HttpClient } from '../../http.js';
import type { SdkResponse } from '../../response.js';
import type { HealthCheckResponse, VersionResponse } from './types.js';

export interface HealthResource {
  check(): Promise<SdkResponse<HealthCheckResponse>>;
  version(): Promise<SdkResponse<VersionResponse>>;
}

export function createHealthResource(http: HttpClient): HealthResource {
  return {
    check() {
      return http.request('GET', '/health', {});
    },
    version() {
      return http.request('GET', '/version', {});
    },
  };
}
