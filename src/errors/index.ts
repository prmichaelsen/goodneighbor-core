// src/errors/index.ts

export { AppError } from './base.error';
export type { ErrorKind, ErrorContext } from './base.error';
export {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  RateLimitError,
  InternalError,
} from './app-errors';
export { ErrorCode, HTTP_STATUS_MAP, getHttpStatus } from './error-codes';

import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  RateLimitError,
  InternalError,
} from './app-errors';

/**
 * Union of all typed application errors.
 * Use this in catch blocks and Result<T, E> type parameters.
 */
export type AppErrorUnion =
  | ValidationError
  | NotFoundError
  | UnauthorizedError
  | ForbiddenError
  | ConflictError
  | ExternalServiceError
  | RateLimitError
  | InternalError;

/**
 * Type guard: checks if a value is a typed AppError
 */
export function isAppError(value: unknown): value is AppErrorUnion {
  return value instanceof Error && 'kind' in value && 'code' in value;
}
