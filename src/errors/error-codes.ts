// src/errors/error-codes.ts

/**
 * Enumeration of all error codes used in goodneighbor-core.
 * Each code corresponds to a specific error class.
 */
export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Maps error codes to their corresponding HTTP status codes.
 * Used by adapter layers to convert domain errors to HTTP responses.
 */
export const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.RATE_LIMIT]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

/**
 * Returns the HTTP status code for a given error code.
 * Falls back to 500 (Internal Server Error) for unknown codes.
 */
export function getHttpStatus(code: string): number {
  return HTTP_STATUS_MAP[code as ErrorCode] ?? 500;
}
