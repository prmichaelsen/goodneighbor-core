// src/adapter/handlers/health.ts
// Health and version route handlers — public, no auth required

import type { AdapterResponse, RouteHandler } from '../types';

/**
 * Returns service health status.
 */
export function healthCheck(): RouteHandler {
  return async (): Promise<AdapterResponse> => {
    return {
      status: 200,
      body: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  };
}

/**
 * Returns service version and environment info.
 * Reads version from package.json at build time.
 */
export function versionCheck(version: string, environment: string): RouteHandler {
  return async (): Promise<AdapterResponse> => {
    return {
      status: 200,
      body: {
        version,
        environment,
      },
    };
  };
}
