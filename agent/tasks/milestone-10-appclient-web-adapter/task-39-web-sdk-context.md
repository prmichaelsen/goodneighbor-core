# Task 39: WebSDKContext & WebSDKError

**Milestone**: [M10 - AppClient & Web Adapter](../../milestones/milestone-10-appclient-web-adapter.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 26 (ServiceContainer)
**Status**: Not Started

---

## Objective

Create the WebSDKContext dependency bundle and WebSDKError wrapper for server-side use-case functions, providing a clean boundary between the web layer and core services.

---

## Steps

### 1. Create `src/web/context.ts`

```typescript
import type { ServiceContainer } from '../container/service-container';

export interface WebSDKContext {
  container: ServiceContainer;
  userId: string;
}

export function createWebSDKContext(
  container: ServiceContainer,
  userId: string,
): WebSDKContext {
  return { container, userId };
}
```

### 2. Create `src/web/error.ts`

```typescript
export interface WebSDKError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function toWebSDKError(err: unknown): WebSDKError {
  if (isAppError(err)) {
    return {
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : 'Unknown error',
  };
}
```

### 3. Create `src/web/helpers.ts`

Use-case helper that wraps a service call in `Result<T, WebSDKError>`:

```typescript
import type { Result } from '../types';
import type { WebSDKError } from './error';

export async function tryCatch<T>(
  fn: () => Promise<T>,
): Promise<Result<T, WebSDKError>> {
  try {
    const data = await fn();
    return { ok: true, value: data };
  } catch (err) {
    return { ok: false, error: toWebSDKError(err) };
  }
}
```

### 4. Create `src/web/index.ts` barrel

Export context, error, and helpers.

### 5. Create colocated specs

- `context.spec.ts` — test context creation
- `error.spec.ts` — test error conversion from AppError and plain Error
- `helpers.spec.ts` — test tryCatch success and failure paths

---

## Verification

- [ ] WebSDKContext interface defined with container + userId
- [ ] WebSDKError captures code, message, details
- [ ] toWebSDKError handles AppError and generic Error
- [ ] tryCatch wraps into Result<T, WebSDKError>
- [ ] Barrel exports from `src/web/index.ts`
- [ ] Tests pass
