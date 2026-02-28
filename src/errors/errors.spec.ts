import { AppError } from './base.error';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  RateLimitError,
  InternalError,
} from './app-errors';
import { ErrorCode, HTTP_STATUS_MAP, getHttpStatus } from './error-codes';
import { isAppError } from './index';

// ─── AppError base class ────────────────────────────────────────────────

describe('AppError', () => {
  // Use a concrete subclass to test AppError behavior
  it('should set name to the subclass name', () => {
    const error = new NotFoundError('User', 'usr_123');
    expect(error.name).toBe('NotFoundError');
  });

  it('should be instanceof Error', () => {
    const error = new NotFoundError('User', 'usr_123');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should serialize to JSON with all fields', () => {
    const error = new NotFoundError('User', 'usr_123');
    const json = error.toJSON();
    expect(json).toEqual({
      error: 'NotFoundError',
      kind: 'not_found',
      code: 'NOT_FOUND',
      message: 'User not found: usr_123',
      httpStatus: 404,
      context: { resource: 'User', id: 'usr_123' },
    });
  });

  it('should omit context from JSON when empty', () => {
    const error = new UnauthorizedError();
    const json = error.toJSON();
    expect(json).not.toHaveProperty('context');
  });
});

// ─── Domain Error Classes ───────────────────────────────────────────────

describe('NotFoundError', () => {
  it('should have HTTP 404 and NOT_FOUND code', () => {
    const error = new NotFoundError('User', 'usr_123');
    expect(error.httpStatus).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.kind).toBe('not_found');
    expect(error.resource).toBe('User');
    expect(error.id).toBe('usr_123');
    expect(error.message).toBe('User not found: usr_123');
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('ValidationError', () => {
  it('should have HTTP 400 and VALIDATION_ERROR code', () => {
    const error = new ValidationError('Invalid input', { title: ['Required'] });
    expect(error.httpStatus).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.kind).toBe('validation');
    expect(error.fields).toEqual({ title: ['Required'] });
    expect(error).toBeInstanceOf(AppError);
  });

  it('should default fields to empty object', () => {
    const error = new ValidationError('Bad input');
    expect(error.fields).toEqual({});
  });
});

describe('UnauthorizedError', () => {
  it('should have HTTP 401 and default message', () => {
    const error = new UnauthorizedError();
    expect(error.httpStatus).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.kind).toBe('unauthorized');
    expect(error.message).toBe('Authentication required');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should accept custom message', () => {
    const error = new UnauthorizedError('Session expired');
    expect(error.message).toBe('Session expired');
  });
});

describe('ForbiddenError', () => {
  it('should have HTTP 403 and default message', () => {
    const error = new ForbiddenError();
    expect(error.httpStatus).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.kind).toBe('forbidden');
    expect(error.message).toBe('Insufficient permissions');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should accept requiredRole', () => {
    const error = new ForbiddenError('Need admin', 'admin');
    expect(error.requiredRole).toBe('admin');
  });
});

describe('ConflictError', () => {
  it('should have HTTP 409 and CONFLICT code', () => {
    const error = new ConflictError('Board already exists', { boardId: 'b1' });
    expect(error.httpStatus).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.kind).toBe('conflict');
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('ExternalServiceError', () => {
  it('should have HTTP 502 and service name', () => {
    const error = new ExternalServiceError('Algolia', 'Search index unavailable');
    expect(error.httpStatus).toBe(502);
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(error.kind).toBe('external');
    expect(error.serviceName).toBe('Algolia');
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('RateLimitError', () => {
  it('should have HTTP 429 and retry info', () => {
    const error = new RateLimitError(30);
    expect(error.httpStatus).toBe(429);
    expect(error.code).toBe('RATE_LIMIT');
    expect(error.kind).toBe('rate_limit');
    expect(error.retryAfterSeconds).toBe(30);
  });
});

describe('InternalError', () => {
  it('should have HTTP 500 and default message', () => {
    const error = new InternalError();
    expect(error.httpStatus).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.kind).toBe('internal');
    expect(error.message).toBe('Internal server error');
  });
});

// ─── Error Codes ────────────────────────────────────────────────────────

describe('ErrorCode enum', () => {
  it('should have 8 error codes', () => {
    expect(Object.keys(ErrorCode)).toHaveLength(8);
  });

  it('should map all codes to correct HTTP statuses', () => {
    expect(HTTP_STATUS_MAP[ErrorCode.NOT_FOUND]).toBe(404);
    expect(HTTP_STATUS_MAP[ErrorCode.VALIDATION_ERROR]).toBe(400);
    expect(HTTP_STATUS_MAP[ErrorCode.UNAUTHORIZED]).toBe(401);
    expect(HTTP_STATUS_MAP[ErrorCode.FORBIDDEN]).toBe(403);
    expect(HTTP_STATUS_MAP[ErrorCode.CONFLICT]).toBe(409);
    expect(HTTP_STATUS_MAP[ErrorCode.EXTERNAL_SERVICE_ERROR]).toBe(502);
    expect(HTTP_STATUS_MAP[ErrorCode.RATE_LIMIT]).toBe(429);
    expect(HTTP_STATUS_MAP[ErrorCode.INTERNAL_ERROR]).toBe(500);
  });
});

describe('getHttpStatus', () => {
  it('should return correct status for known codes', () => {
    expect(getHttpStatus('NOT_FOUND')).toBe(404);
    expect(getHttpStatus('VALIDATION_ERROR')).toBe(400);
    expect(getHttpStatus('FORBIDDEN')).toBe(403);
  });

  it('should return 500 for unknown codes', () => {
    expect(getHttpStatus('UNKNOWN_CODE')).toBe(500);
  });
});

// ─── isAppError type guard ──────────────────────────────────────────────

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    expect(isAppError(new NotFoundError('User', '1'))).toBe(true);
    expect(isAppError(new ValidationError('bad'))).toBe(true);
    expect(isAppError(new InternalError())).toBe(true);
  });

  it('should return false for plain Error', () => {
    expect(isAppError(new Error('plain'))).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isAppError('string')).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError(42)).toBe(false);
  });
});
