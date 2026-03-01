# Task 30: SdkResponse, HttpClient & Browser Guard

**Milestone**: [M8 - REST Client SDK](../../milestones/milestone-8-rest-client-sdk.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 5 (Error hierarchy — for error code mapping)
**Status**: Not Started

---

## Objective

Implement the shared client SDK infrastructure: `SdkResponse<T>` type with `{ data, error, throwOnError() }`, `HttpClient` class with dual auth support, and `assertServerSide()` browser guard.

---

## Context

These three modules form the foundation that all resource clients build on. The pattern comes from [core-sdk.client-response](../../patterns/core-sdk.client-response.md) and [core-sdk.client-http-transport](../../patterns/core-sdk.client-http-transport.md).

Key decisions:
- `SdkResponse<T>` uses `SdkError` (not `AppError`) — HTTP-aware with status codes and machine-readable codes
- Network errors and auth errors are returned as `SdkResponse` (never throw)
- `jsonwebtoken` is an **optional** peer dependency, loaded via dynamic `import()` only when `auth.serviceToken` is used
- Browser guard is called once in the client factory, not per-request

---

## Steps

### 1. Create `src/clients/response.ts`

```typescript
export interface SdkError {
  code: string;       // 'not_found', 'unauthorized', 'validation', etc.
  message: string;
  status: number;     // HTTP status (0 for network/auth errors)
  context?: Record<string, unknown>;
}

export interface SdkResponse<T> {
  data: T | null;
  error: SdkError | null;
  throwOnError(): T;
}

export function createSuccess<T>(data: T): SdkResponse<T>
export function createError<T = never>(error: SdkError): SdkResponse<T>
export async function fromHttpResponse<T>(response: Response): Promise<SdkResponse<T>>
```

Include `mapStatusToCode()` helper: 400→bad_request, 401→unauthorized, 403→forbidden, 404→not_found, 409→conflict, 422→validation, 429→rate_limited, 500→internal.

### 2. Create `src/clients/http.ts`

```typescript
export interface HttpClientConfig {
  baseUrl: string;
  auth?: { serviceToken: string; jwtOptions?: { issuer?: string; expiresIn?: string } };
  getAuthToken?: (userId: string) => string | Promise<string>;
}

export class HttpClient {
  async request<T>(method: string, path: string, options?: RequestOptions): Promise<SdkResponse<T>>
}
```

- `resolveAuthToken()` tries `getAuthToken` first, then `serviceToken` JWT generation
- JWT generation uses `await import('jsonwebtoken')` with clear error if not installed
- Network errors caught and returned as `createError({ code: 'network_error', status: 0 })`

### 3. Create `src/clients/guard.ts`

```typescript
export function assertServerSide(): void
```

Throws if `typeof window !== 'undefined'`.

### 4. Create `src/clients/response.spec.ts`

Test:
- `createSuccess()` returns `{ data, error: null }`
- `createError()` returns `{ data: null, error }`
- `throwOnError()` returns data on success, throws on error
- `fromHttpResponse()` maps 200 → success, 404 → not_found, 500 → internal
- `fromHttpResponse()` handles non-JSON error bodies
- `mapStatusToCode()` covers all mapped statuses + fallback

### 5. Create `src/clients/http.spec.ts`

Test:
- Successful request with JSON body
- Auth header set when userId provided
- `getAuthToken` callback used when configured
- Network error returns `SdkResponse` with `network_error` code
- Non-2xx response mapped to `SdkError`

### 6. Create `src/clients/guard.spec.ts`

Test:
- Does not throw in Node.js environment
- Throws when `globalThis.window` is defined

---

## Verification

- [ ] `SdkResponse<T>` has `data`, `error`, `throwOnError()` fields
- [ ] `createSuccess()` and `createError()` produce correct shapes
- [ ] `fromHttpResponse()` handles all HTTP status codes
- [ ] `HttpClient.request()` serializes body, sets headers, resolves auth
- [ ] Network errors returned as SdkResponse (not thrown)
- [ ] `assertServerSide()` throws when window exists
- [ ] All tests pass
