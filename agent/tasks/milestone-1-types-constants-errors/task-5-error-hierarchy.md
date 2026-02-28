# Task 5: Error Hierarchy & Error Codes

**Milestone**: [M1 - Types, Constants & Errors](../../milestones/milestone-1-types-constants-errors.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 1 (Result type needed for integration)
**Status**: Not Started

---

## Objective

Implement the error hierarchy for goodneighbor-core: update the existing BaseError scaffold to include `code` and `httpStatus` fields, create 6 domain error classes (NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError, ExternalServiceError), create an ErrorCode enum, and create an error code to HTTP status mapping. All error classes must extend BaseError and be usable with the Result<T, E> type from Task 1.

---

## Context

The error hierarchy provides typed, structured error handling across all services. Instead of throwing generic Error objects, services return `Result<T, SpecificError>` values where each error type carries a meaningful HTTP status code and error code string. This enables adapter layers (REST, MCP, CLI) to map errors to the appropriate response format without inspecting error messages.

The BaseError class is already scaffolded in `src/errors/base.error.ts` and needs to be updated. The `src/errors/app-errors.ts` file also exists as a scaffold and needs the 6 domain error classes.

The HTTP status mapping:
- NotFoundError -> 404
- ValidationError -> 400
- UnauthorizedError -> 401
- ForbiddenError -> 403
- ConflictError -> 409
- ExternalServiceError -> 502

---

## Steps

### 1. Read Existing Error Scaffolds

Examine the current contents of:
- `src/errors/base.error.ts`
- `src/errors/app-errors.ts`
- `src/errors/index.ts`

### 2. Update base.error.ts

Update `src/errors/base.error.ts` with code and httpStatus fields:

```typescript
/**
 * Base error class for all goodneighbor-core errors.
 * Provides structured error information including an error code and HTTP status.
 *
 * All domain error classes extend BaseError, enabling:
 * - instanceof checks for error type narrowing
 * - Consistent error code and HTTP status across all errors
 * - Serialization to JSON for API responses
 */
export class BaseError extends Error {
  /** Machine-readable error code (e.g., "NOT_FOUND", "VALIDATION_ERROR") */
  readonly code: string;

  /** HTTP status code for REST adapter mapping */
  readonly httpStatus: number;

  /** Optional additional context for debugging */
  readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    httpStatus: number,
    details?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;

    // Restore prototype chain (required for extending built-in Error in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serialize to a plain object suitable for API responses.
   */
  toJSON(): Record<string, any> {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
```

### 3. Update app-errors.ts with 6 Domain Error Classes

Update `src/errors/app-errors.ts`:

```typescript
import { BaseError } from './base.error';

/**
 * Thrown when a requested resource does not exist.
 * HTTP 404 Not Found.
 *
 * Usage: ProfileService.getPublicProfile() when username not found.
 */
export class NotFoundError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'NOT_FOUND', 404, details);
  }
}

/**
 * Thrown when input data fails validation.
 * HTTP 400 Bad Request.
 *
 * Usage: ContentService.createPost() when content exceeds length limit.
 */
export class ValidationError extends BaseError {
  /** Field-level validation errors, if available */
  readonly fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    details?: Record<string, any>,
    fieldErrors?: Record<string, string>,
  ) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Thrown when authentication is required but missing or invalid.
 * HTTP 401 Unauthorized.
 *
 * Usage: AuthService.verifySession() when session cookie is expired.
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Authentication required', details?: Record<string, any>) {
    super(message, 'UNAUTHORIZED', 401, details);
  }
}

/**
 * Thrown when the authenticated user lacks permission for the operation.
 * HTTP 403 Forbidden.
 *
 * Usage: FeedService.moderate() when user is not a feed moderator.
 */
export class ForbiddenError extends BaseError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, any>) {
    super(message, 'FORBIDDEN', 403, details);
  }
}

/**
 * Thrown when the operation conflicts with existing state.
 * HTTP 409 Conflict.
 *
 * Usage: ProfileService.createDefaultBoard() when board already exists.
 */
export class ConflictError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT', 409, details);
  }
}

/**
 * Thrown when an external service call fails.
 * HTTP 502 Bad Gateway.
 *
 * Usage: SearchService.search() when Algolia returns an error.
 * Usage: NotificationService.sendEmail() when Mandrill rejects the request.
 */
export class ExternalServiceError extends BaseError {
  /** Name of the external service that failed */
  readonly serviceName: string;

  constructor(
    serviceName: string,
    message: string,
    details?: Record<string, any>,
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, details);
    this.serviceName = serviceName;
  }
}
```

### 4. Create error-codes.ts

Create `src/errors/error-codes.ts`:

```typescript
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
};

/**
 * Returns the HTTP status code for a given error code.
 * Falls back to 500 (Internal Server Error) for unknown codes.
 */
export function getHttpStatus(code: string): number {
  return HTTP_STATUS_MAP[code as ErrorCode] ?? 500;
}
```

### 5. Update errors/index.ts Barrel Export

Update `src/errors/index.ts`:

```typescript
export * from './base.error';
export * from './app-errors';
export * from './error-codes';
```

### 6. Write Unit Tests

Create `src/errors/__tests__/errors.spec.ts`:

```typescript
import { BaseError } from '../base.error';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
} from '../app-errors';
import { ErrorCode, HTTP_STATUS_MAP, getHttpStatus } from '../error-codes';

describe('BaseError', () => {
  it('should set name to class name', () => {
    const error = new BaseError('test', 'TEST', 500);
    expect(error.name).toBe('BaseError');
  });

  it('should be instanceof Error', () => {
    const error = new BaseError('test', 'TEST', 500);
    expect(error).toBeInstanceOf(Error);
  });

  it('should serialize to JSON', () => {
    const error = new BaseError('test message', 'TEST', 500, { field: 'value' });
    const json = error.toJSON();
    expect(json).toEqual({
      error: 'BaseError',
      code: 'TEST',
      message: 'test message',
      httpStatus: 500,
      details: { field: 'value' },
    });
  });
});

describe('Domain Errors', () => {
  it('NotFoundError should have HTTP 404', () => {
    const error = new NotFoundError('User not found');
    expect(error.httpStatus).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('ValidationError should have HTTP 400', () => {
    const error = new ValidationError('Invalid input', undefined, { title: 'Required' });
    expect(error.httpStatus).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors).toEqual({ title: 'Required' });
    expect(error).toBeInstanceOf(BaseError);
  });

  it('UnauthorizedError should have HTTP 401', () => {
    const error = new UnauthorizedError();
    expect(error.httpStatus).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Authentication required');
    expect(error).toBeInstanceOf(BaseError);
  });

  it('ForbiddenError should have HTTP 403', () => {
    const error = new ForbiddenError();
    expect(error.httpStatus).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Insufficient permissions');
    expect(error).toBeInstanceOf(BaseError);
  });

  it('ConflictError should have HTTP 409', () => {
    const error = new ConflictError('Board already exists');
    expect(error.httpStatus).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error).toBeInstanceOf(BaseError);
  });

  it('ExternalServiceError should have HTTP 502', () => {
    const error = new ExternalServiceError('Algolia', 'Search index unavailable');
    expect(error.httpStatus).toBe(502);
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(error.serviceName).toBe('Algolia');
    expect(error).toBeInstanceOf(BaseError);
  });
});

describe('Error Codes', () => {
  it('should map all 6 error codes to correct HTTP statuses', () => {
    expect(HTTP_STATUS_MAP[ErrorCode.NOT_FOUND]).toBe(404);
    expect(HTTP_STATUS_MAP[ErrorCode.VALIDATION_ERROR]).toBe(400);
    expect(HTTP_STATUS_MAP[ErrorCode.UNAUTHORIZED]).toBe(401);
    expect(HTTP_STATUS_MAP[ErrorCode.FORBIDDEN]).toBe(403);
    expect(HTTP_STATUS_MAP[ErrorCode.CONFLICT]).toBe(409);
    expect(HTTP_STATUS_MAP[ErrorCode.EXTERNAL_SERVICE_ERROR]).toBe(502);
  });

  it('getHttpStatus should return correct status for known codes', () => {
    expect(getHttpStatus('NOT_FOUND')).toBe(404);
    expect(getHttpStatus('VALIDATION_ERROR')).toBe(400);
  });

  it('getHttpStatus should return 500 for unknown codes', () => {
    expect(getHttpStatus('UNKNOWN_CODE')).toBe(500);
  });
});
```

---

## Verification

- [ ] `src/errors/base.error.ts` updated with code, httpStatus, details fields and toJSON()
- [ ] BaseError extends Error and sets `this.name` to the class name
- [ ] `Object.setPrototypeOf` used in BaseError constructor for correct prototype chain
- [ ] `src/errors/app-errors.ts` has all 6 error classes: NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError, ExternalServiceError
- [ ] HTTP statuses: NotFoundError=404, ValidationError=400, UnauthorizedError=401, ForbiddenError=403, ConflictError=409, ExternalServiceError=502
- [ ] All 6 error classes are instanceof BaseError
- [ ] ValidationError has optional fieldErrors property
- [ ] ExternalServiceError has required serviceName property
- [ ] UnauthorizedError and ForbiddenError have default messages
- [ ] `src/errors/error-codes.ts` has ErrorCode enum with 6 values
- [ ] HTTP_STATUS_MAP maps all 6 ErrorCodes to correct statuses
- [ ] getHttpStatus() falls back to 500 for unknown codes
- [ ] `src/errors/index.ts` barrel exports all error modules
- [ ] All unit tests pass
- [ ] TypeScript compiles without errors

---

## Expected Output

**File Structure**:
```
src/errors/
├── __tests__/
│   └── errors.spec.ts     # NEW: Tests for all error classes and codes
├── index.ts                # UPDATED: Barrel export with error-codes
├── base.error.ts           # UPDATED: code, httpStatus, details, toJSON()
├── app-errors.ts           # UPDATED: 6 domain error classes
└── error-codes.ts          # NEW: ErrorCode enum, HTTP_STATUS_MAP, getHttpStatus()
```

**Key Files Created/Updated**:
- `src/errors/base.error.ts`: Updated with code, httpStatus, details, toJSON() serialization
- `src/errors/app-errors.ts`: 6 domain error classes with correct HTTP statuses
- `src/errors/error-codes.ts`: Error code enum and HTTP status mapping
- `src/errors/index.ts`: Barrel export for the complete error module

---

## Common Issues and Solutions

### Issue 1: instanceof checks fail for error subclasses
**Symptom**: `error instanceof NotFoundError` returns false even though the error was created as `new NotFoundError(...)`
**Solution**: The `Object.setPrototypeOf(this, new.target.prototype)` line in BaseError's constructor is critical. Without it, TypeScript's compiled output breaks the prototype chain when extending built-in classes like Error. This is a well-known TypeScript issue with extending built-ins.

### Issue 2: Error stack trace points to BaseError instead of subclass
**Symptom**: Stack trace shows BaseError constructor as the error origin
**Solution**: Using `new.target.prototype` instead of `BaseError.prototype` in setPrototypeOf preserves the correct constructor reference. The error name is set to `this.constructor.name` which will be the subclass name.

### Issue 3: toJSON does not include details when empty
**Symptom**: The `details` field appears as `undefined` in JSON output
**Solution**: The toJSON() method uses a spread conditional: `...(this.details ? { details: this.details } : {})`. This omits the details field entirely when it is not provided, keeping API responses clean.

---

## Resources

- Design doc: `agent/design/local.goodneighbor-core.md` -- Error hierarchy listed in the architecture
- Design doc: `agent/design/requirements.md` -- Error hierarchy listed as a supporting feature
- Core-SDK pattern: `agent/patterns/core-sdk.service-error-handling.md` -- Error handling patterns to follow

---

## Notes

- The error hierarchy is intentionally small (6 classes). Additional error types should only be added when a service has a genuinely distinct failure mode that requires different handling.
- Error codes match the class code properties exactly. The ErrorCode enum and the class code strings must stay in sync.
- The Result<T, E> type from Task 1 is the primary consumer of these errors. Services return `Result<Data, NotFoundError | ValidationError>` instead of throwing.
- The `details` field is for debugging context (e.g., `{ collection: "goodneighbor.search", documentId: "abc123" }`). It should never contain sensitive data.
- The `getHttpStatus()` helper is useful for adapter layers that need to convert any error to an HTTP response, including unexpected errors (falls back to 500).

---

**Next Task**: None (this is the last task in Milestone 1)
**Related Design Docs**: `agent/design/local.goodneighbor-core.md`, `agent/design/requirements.md`
**Estimated Completion Date**: TBD
