// src/errors/app-errors.ts

import { AppError } from './base.error';

/**
 * Input validation failed -- HTTP 400.
 * Usage: ContentService.createPost() when content exceeds length limit.
 */
export class ValidationError extends AppError {
  readonly kind = 'validation' as const;
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;

  constructor(
    message: string,
    public readonly fields: Record<string, string[]> = {}
  ) {
    super(message, { fields });
  }
}

/**
 * Resource not found -- HTTP 404.
 * Usage: ProfileService.getPublicProfile() when username not found.
 */
export class NotFoundError extends AppError {
  readonly kind = 'not_found' as const;
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;

  constructor(
    public readonly resource: string,
    public readonly id: string
  ) {
    super(`${resource} not found: ${id}`, { resource, id });
  }
}

/**
 * Not authenticated -- HTTP 401.
 * Usage: AuthService.verifySession() when session cookie is expired.
 */
export class UnauthorizedError extends AppError {
  readonly kind = 'unauthorized' as const;
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;

  constructor(message = 'Authentication required') {
    super(message);
  }
}

/**
 * Authenticated but not permitted -- HTTP 403.
 * Usage: FeedService.moderate() when user is not a feed moderator.
 */
export class ForbiddenError extends AppError {
  readonly kind = 'forbidden' as const;
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;

  constructor(
    message = 'Insufficient permissions',
    public readonly requiredRole?: string
  ) {
    super(message, requiredRole ? { requiredRole } : {});
  }
}

/**
 * Resource state conflict -- HTTP 409.
 * Usage: ProfileService.createDefaultBoard() when board already exists.
 */
export class ConflictError extends AppError {
  readonly kind = 'conflict' as const;
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, context);
  }
}

/**
 * External service failed (upstream API, database) -- HTTP 502.
 * Usage: SearchService.search() when Algolia returns an error.
 */
export class ExternalServiceError extends AppError {
  readonly kind = 'external' as const;
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly httpStatus = 502;

  constructor(
    public readonly serviceName: string,
    message: string
  ) {
    super(message, { service: serviceName });
  }
}

/**
 * Too many requests -- HTTP 429.
 */
export class RateLimitError extends AppError {
  readonly kind = 'rate_limit' as const;
  readonly code = 'RATE_LIMIT';
  readonly httpStatus = 429;

  constructor(public readonly retryAfterSeconds: number) {
    super(`Rate limit exceeded. Retry after ${retryAfterSeconds}s`, {
      retryAfterSeconds,
    });
  }
}

/**
 * Unexpected internal error -- HTTP 500.
 */
export class InternalError extends AppError {
  readonly kind = 'internal' as const;
  readonly code = 'INTERNAL_ERROR';
  readonly httpStatus = 500;

  constructor(message = 'Internal server error') {
    super(message);
  }
}
