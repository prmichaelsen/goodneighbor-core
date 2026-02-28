# Task 1: Branded IDs, Common Types & Utility Types

**Milestone**: [M1 - Types, Constants & Errors](../../milestones/milestone-1-types-constants-errors.md)
**Estimated Time**: 3 hours
**Dependencies**: None
**Status**: Not Started

---

## Objective

Create branded ID types (UserId, PostId, FeedId, CommentId, FeedSubmissionId, SearchEntityId) using the TypeScript branded types pattern, plus utility types (DeepPartial, Nullable, Optional) and the Result<T, E> discriminated union. Update the existing scaffolded files (result.types.ts, utils.types.ts) and create the new common.types.ts file with all branded IDs and factory functions.

---

## Context

Branded ID types are the foundation for type safety across the entire goodneighbor-core library. Without them, a PostId string could be accidentally passed where a FeedId is expected, and TypeScript would not catch the error. The branded types pattern uses intersection types with a phantom `__brand` property to create nominally distinct string types at the type level while remaining plain strings at runtime.

The Result<T, E> type provides a functional error handling pattern that avoids throwing exceptions for expected failure cases. All service methods in later milestones will return `Result<SuccessType, ErrorType>` instead of throwing.

The utility types (DeepPartial, Nullable, Optional) are used extensively in DTOs and update operations throughout the codebase.

Several files already exist as scaffolds and must be updated rather than recreated:
- `src/types/result.types.ts`
- `src/types/utils.types.ts`
- `src/types/index.ts`

---

## Steps

### 1. Read Existing Scaffolded Type Files

Examine the current contents of the scaffolded files to understand what is already in place:
- `src/types/result.types.ts`
- `src/types/utils.types.ts`
- `src/types/shared.types.ts`
- `src/types/index.ts`

### 2. Create common.types.ts with Branded ID Types

Create `src/types/common.types.ts` with branded ID types using the intersection pattern:

```typescript
/**
 * Branded type pattern for nominal typing of ID strings.
 * Prevents accidental mixing of different entity IDs at the type level
 * while remaining plain strings at runtime.
 */

// Brand symbol for creating nominally distinct types
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Firebase UID branded as a UserId */
export type UserId = Brand<string, 'UserId'>;

/** Post document ID */
export type PostId = Brand<string, 'PostId'>;

/** Feed document ID */
export type FeedId = Brand<string, 'FeedId'>;

/** Comment document ID */
export type CommentId = Brand<string, 'CommentId'>;

/** Feed submission document ID */
export type FeedSubmissionId = Brand<string, 'FeedSubmissionId'>;

/** Search entity document ID (used in the goodneighbor.search collection) */
export type SearchEntityId = Brand<string, 'SearchEntityId'>;

/**
 * Factory function to create a UserId from a plain string.
 * Use this when receiving Firebase UIDs from external sources.
 */
export function createUserId(id: string): UserId {
  return id as UserId;
}

export function createPostId(id: string): PostId {
  return id as PostId;
}

export function createFeedId(id: string): FeedId {
  return id as FeedId;
}

export function createCommentId(id: string): CommentId {
  return id as CommentId;
}

export function createFeedSubmissionId(id: string): FeedSubmissionId {
  return id as FeedSubmissionId;
}

export function createSearchEntityId(id: string): SearchEntityId {
  return id as SearchEntityId;
}

/**
 * Semantic ID format constants.
 * Used in refs arrays for permission and visibility control.
 */
export const SYSTEM_TOKENS = {
  /** Public visibility marker -- all users can see entities with this token in hasViewer */
  PUBLIC: '@public',
} as const;

/**
 * Creates a user-scoped semantic ID for use in refs arrays.
 * Format: @uid:{firebaseUid}
 *
 * Example: formatUserRef("abc123def456") => "@uid:abc123def456"
 */
export function formatUserRef(uid: string): string {
  return `@uid:${uid}`;
}
```

### 3. Update result.types.ts with Result Discriminated Union

Update `src/types/result.types.ts` to implement the full Result<T, E> pattern:

```typescript
/**
 * Result type for operations that can fail with expected errors.
 * Uses a discriminated union for type-safe error handling without exceptions.
 */

export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Create a successful Result */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Create a failed Result */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/** Type guard: narrows Result to Ok */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/** Type guard: narrows Result to Err */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}
```

### 4. Update utils.types.ts with Utility Types

Update `src/types/utils.types.ts` with the full set of utility types:

```typescript
/**
 * Utility types used throughout goodneighbor-core.
 */

/** Recursively makes all properties optional */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Makes a type nullable (T or null) */
export type Nullable<T> = T | null;

/** Makes a type optional (T or undefined) */
export type Optional<T> = T | undefined;

/** Extracts the keys of T whose values extend V */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/** Makes specific keys of T required */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Timestamp fields common to most entities */
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}
```

### 5. Update types/index.ts Barrel Export

Update `src/types/index.ts` to re-export everything from the new and updated files:

```typescript
export * from './common.types';
export * from './result.types';
export * from './utils.types';
```

Note: Additional exports will be added in Tasks 2 and 3 as more type files are created.

### 6. Write Unit Tests

Create `src/types/__tests__/common.types.spec.ts`:

```typescript
import {
  createUserId, createPostId, createFeedId,
  formatUserRef, SYSTEM_TOKENS,
} from '../common.types';

describe('Branded ID types', () => {
  it('should create branded IDs from strings', () => {
    const userId = createUserId('abc123');
    expect(userId).toBe('abc123');
    // At runtime branded IDs are plain strings
    expect(typeof userId).toBe('string');
  });

  it('should format user refs with @uid: prefix', () => {
    expect(formatUserRef('abc123')).toBe('@uid:abc123');
  });

  it('should expose @public system token', () => {
    expect(SYSTEM_TOKENS.PUBLIC).toBe('@public');
  });
});
```

Create `src/types/__tests__/result.types.spec.ts`:

```typescript
import { ok, err, isOk, isErr } from '../result.types';

describe('Result type', () => {
  it('should create Ok result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
  });

  it('should create Err result', () => {
    const result = err(new Error('something failed'));
    expect(result.ok).toBe(false);
    expect(result.error.message).toBe('something failed');
    expect(isOk(result)).toBe(false);
    expect(isErr(result)).toBe(true);
  });
});
```

---

## Verification

- [ ] `src/types/common.types.ts` exists and exports 6 branded ID types and 6 factory functions
- [ ] `src/types/common.types.ts` exports SYSTEM_TOKENS.PUBLIC as "@public"
- [ ] `src/types/common.types.ts` exports formatUserRef() that produces "@uid:{uid}" format
- [ ] `src/types/result.types.ts` exports Result<T, E>, Ok<T>, Err<E>, ok(), err(), isOk(), isErr()
- [ ] `src/types/utils.types.ts` exports DeepPartial, Nullable, Optional, Timestamps
- [ ] `src/types/index.ts` barrel exports all types from common, result, and utils modules
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Branded IDs prevent cross-assignment at the type level (PostId not assignable to FeedId)
- [ ] Result type narrows correctly: after `isOk(result)`, `result.value` is accessible
- [ ] All unit tests pass

---

## Expected Output

**File Structure**:
```
src/types/
├── __tests__/
│   ├── common.types.spec.ts
│   └── result.types.spec.ts
├── index.ts                # Updated barrel export
├── common.types.ts         # NEW: Branded IDs, SYSTEM_TOKENS, formatUserRef
├── result.types.ts         # UPDATED: Full Result<T, E> implementation
└── utils.types.ts          # UPDATED: DeepPartial, Nullable, Optional, Timestamps
```

**Key Files Created/Updated**:
- `src/types/common.types.ts`: Branded ID types with factory functions, semantic ID helpers
- `src/types/result.types.ts`: Result<T, E> discriminated union with ok/err constructors and type guards
- `src/types/utils.types.ts`: Utility types used across the domain model
- `src/types/index.ts`: Barrel export aggregating all type modules

---

## Common Issues and Solutions

### Issue 1: Branded types not preventing assignment in tests
**Symptom**: TypeScript does not error when assigning a PostId to a FeedId variable
**Solution**: Branded type checking is compile-time only. You cannot test it at runtime. Use `// @ts-expect-error` comments in type-level test files or rely on the TypeScript compiler to enforce this. The test suite verifies runtime behavior; the compiler verifies type safety.

### Issue 2: Result type not narrowing after isOk/isErr check
**Symptom**: TypeScript still shows `value` as possibly undefined after `if (isOk(result))`
**Solution**: Ensure `isOk` is typed as a type predicate: `result is Ok<T>`. The return type annotation `result is Ok<T>` is what enables narrowing.

### Issue 3: Existing shared.types.ts conflicts
**Symptom**: Duplicate exports between shared.types.ts and common.types.ts
**Solution**: Review shared.types.ts contents. If it contains types that overlap with common.types.ts, migrate them into common.types.ts and remove the shared.types.ts file or stop exporting from it.

---

## Resources

- [TypeScript Branded Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html): Official TypeScript docs on type manipulation
- Design doc: `agent/design/local.content-entity-model.md` -- Defines the semantic ID format used in formatUserRef

---

## Notes

- Branded IDs are strings at runtime. The `__brand` property exists only in the type system and has zero runtime overhead.
- The `formatUserRef()` function is critical: it produces the `@uid:{firebaseUid}` format used in all refs arrays. The format must match exactly or permission checks will silently fail.
- The shared.types.ts file from the scaffold may contain starter types. Review it and decide whether to merge its contents into common.types.ts or keep it separate.
- Result<T, E> defaults E to Error, but in practice services will use specific error types from the error hierarchy (Task 5).

---

**Next Task**: [Task 2: Content Entity Types & Refs Hierarchy](./task-2-content-entity-types.md)
**Related Design Docs**: `agent/design/local.content-entity-model.md`, `agent/design/local.goodneighbor-core.md`
**Estimated Completion Date**: TBD
