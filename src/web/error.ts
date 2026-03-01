// src/web/error.ts
// WebSDKError — clean error boundary for the web layer

import { AppError } from '../errors/base.error';

/**
 * Serializable error type returned from web use-case functions.
 * Provides a clean boundary between internal AppErrors and consumer code.
 */
export interface WebSDKError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Convert any thrown value into a WebSDKError.
 * Extracts structured info from AppError subclasses;
 * wraps unknown errors with a generic code.
 */
export function toWebSDKError(err: unknown): WebSDKError {
  if (err instanceof AppError) {
    return {
      code: err.code,
      message: err.message,
      ...(Object.keys(err.context).length > 0 ? { details: err.context } : {}),
    };
  }

  if (err instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: err.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(err),
  };
}
