// src/errors/base.error.ts

export type ErrorKind =
  | 'validation'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'rate_limit'
  | 'external'
  | 'internal';

export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Base class for all application errors.
 * Always use a specific subclass -- never throw AppError directly.
 *
 * Provides structured error information including:
 * - kind: lowercase discriminant for pattern matching
 * - code: uppercase machine-readable code for API responses
 * - httpStatus: HTTP status code for REST adapter mapping
 * - context: additional debugging context
 */
export abstract class AppError extends Error {
  abstract readonly kind: ErrorKind;

  /** Machine-readable error code (e.g., "NOT_FOUND", "VALIDATION_ERROR") */
  abstract readonly code: string;

  /** HTTP status code for REST adapter mapping */
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    public readonly context: ErrorContext = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): object {
    return {
      error: this.name,
      kind: this.kind,
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      ...(Object.keys(this.context).length > 0 ? { context: this.context } : {}),
    };
  }
}
