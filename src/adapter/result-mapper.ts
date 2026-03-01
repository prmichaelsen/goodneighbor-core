// src/adapter/result-mapper.ts
// Maps Result<T, E> to AdapterResponse based on error kind

import type { Result } from '../types/result.types';
import type { AppErrorUnion } from '../errors/index';
import type { AdapterResponse } from './types';

/**
 * Map an error kind to HTTP status code.
 */
function errorKindToStatus(kind: string): number {
  switch (kind) {
    case 'validation': return 400;
    case 'unauthorized': return 401;
    case 'forbidden': return 403;
    case 'not_found': return 404;
    case 'conflict': return 409;
    case 'rate_limit': return 429;
    case 'external': return 502;
    default: return 500;
  }
}

/**
 * Convert a Result<T, AppErrorUnion> into an AdapterResponse.
 * Success: returns successStatus with the value as body.
 * Error: maps error kind to HTTP status with error details.
 */
export function resultToResponse<T>(
  result: Result<T, AppErrorUnion>,
  successStatus: number = 200,
): AdapterResponse {
  if (result.ok) {
    return {
      status: successStatus,
      body: result.value ?? null,
    };
  }

  const error = result.error;
  return {
    status: errorKindToStatus(error.kind),
    body: {
      error: error.code,
      message: error.message,
      ...(error.context ? { context: error.context } : {}),
    },
  };
}
