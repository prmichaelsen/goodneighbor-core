# REST Client SDK

**Category**: Architecture
**Applicable To**: TypeScript libraries that need typed HTTP client wrappers for REST APIs
**Status**: Stable

---

## Overview

Server-side REST client wrappers following the SdkResponse pattern. Provides Supabase-style `{ data, error }` responses with resource-grouped clients that mirror REST API routes 1:1.

This pattern creates typed, ergonomic client SDKs that wrap REST endpoints. Consumers call typed methods instead of writing raw `fetch()` calls, and get consistent error handling via a unified response type.

---

## When to Use This Pattern

**Use this pattern when:**
- You have a REST API and want typed client wrappers for server-to-server calls
- Multiple consumers (MCP servers, other services, CLI tools) need to call the same API
- You want consistent error handling across all API interactions
- You need dual auth support (callback-based tokens or SDK-generated JWTs)

**Don't use this pattern when:**
- Consumers talk directly to the database (use services instead)
- The API has only 1-2 endpoints (a simple fetch wrapper suffices)
- You need browser-side clients (this pattern is server-side only)

---

## Core Principles

1. **Supabase-style responses**: Every method returns `{ data, error, throwOnError() }` — never throws by default
2. **Resource grouping**: Methods are organized by domain (posts, profiles, feeds) matching the REST resource structure
3. **Factory composition**: A single `createClient()` factory composes all resources from a shared `HttpClient`
4. **Server-side only**: A browser guard prevents accidental import in client-side bundles
5. **Thin wrappers**: Resources contain no business logic — they map method calls to HTTP requests

---

## Implementation

### Structure

```
src/
├── clients/
│   ├── response.ts          # SdkResponse<T> type + helpers
│   ├── http.ts               # HttpClient class (fetch + auth)
│   ├── guard.ts              # assertServerSide() browser guard
│   └── svc/
│       └── v1/
│           ├── index.ts      # createSvcClient factory
│           ├── posts.ts      # PostsResource
│           ├── profiles.ts   # ProfilesResource
│           ├── feeds.ts      # FeedsResource
│           └── comments.ts   # CommentsResource
```

### Key Components

#### Component 1: SdkResponse

The unified response type. Every client method returns this. Consumers choose between checking `error` or calling `throwOnError()`.

```typescript
// src/clients/response.ts

export interface SdkError {
  code: string;       // e.g. 'not_found', 'unauthorized', 'validation'
  message: string;
  status: number;     // HTTP status code
  context?: Record<string, unknown>;
}

export interface SdkResponse<T> {
  data: T | null;
  error: SdkError | null;
  /** Throws if error exists, otherwise returns data (non-null). */
  throwOnError(): T;
}

export function createSuccess<T>(data: T): SdkResponse<T> {
  return {
    data,
    error: null,
    throwOnError() { return data; },
  };
}

export function createError<T = never>(error: SdkError): SdkResponse<T> {
  return {
    data: null,
    error,
    throwOnError() { throw error; },
  };
}

export async function fromHttpResponse<T>(response: Response): Promise<SdkResponse<T>> {
  if (response.ok) {
    const data = await response.json() as T;
    return createSuccess(data);
  }

  let body: Record<string, unknown> | undefined;
  try { body = await response.json() as Record<string, unknown>; } catch {}

  return createError({
    code: mapStatusToCode(response.status),
    message: (body?.message as string) ?? response.statusText,
    status: response.status,
    ...(body?.context ? { context: body.context as Record<string, unknown> } : {}),
  });
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 400: return 'bad_request';
    case 401: return 'unauthorized';
    case 403: return 'forbidden';
    case 404: return 'not_found';
    case 409: return 'conflict';
    case 422: return 'validation';
    case 429: return 'rate_limited';
    case 500: return 'internal';
    default: return `http_${status}`;
  }
}
```

#### Component 2: HttpClient

Shared HTTP transport with dual auth support. Every resource delegates to this.

```typescript
// src/clients/http.ts

export interface HttpClientConfig {
  baseUrl: string;
  /** Option A: SDK generates JWT per request */
  auth?: {
    serviceToken: string;
    jwtOptions?: { issuer?: string; audience?: string; expiresIn?: string };
  };
  /** Option B: Consumer provides auth token */
  getAuthToken?: (userId: string) => string | Promise<string>;
}

export interface RequestOptions {
  body?: unknown;
  params?: Record<string, string>;
  userId?: string;
}

export class HttpClient {
  private readonly baseUrl: string;

  constructor(private readonly config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  async request<T>(method: string, path: string, options?: RequestOptions): Promise<SdkResponse<T>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (options?.userId) {
      const token = await this.resolveAuthToken(options.userId);
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      });
      return fromHttpResponse<T>(response);
    } catch (e) {
      return createError({
        code: 'network_error',
        message: `Request failed: ${(e as Error).message}`,
        status: 0,
      });
    }
  }

  private async resolveAuthToken(userId: string): Promise<string> {
    if (this.config.getAuthToken) return this.config.getAuthToken(userId);
    if (this.config.auth?.serviceToken) return this.generateJwt(userId);
    throw new Error('No auth configured.');
  }

  private async generateJwt(userId: string): Promise<string> {
    const jwt = await import('jsonwebtoken');
    const sign = jwt.default?.sign ?? jwt.sign;
    return sign({ sub: userId }, this.config.auth!.serviceToken, {
      expiresIn: this.config.auth!.jwtOptions?.expiresIn ?? '1h',
    });
  }
}
```

#### Component 3: Browser Guard

Prevents server-side credentials from leaking into browser bundles.

```typescript
// src/clients/guard.ts

export function assertServerSide(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Client SDKs are server-side only. Do not import in browser code.',
    );
  }
}
```

#### Component 4: Resource (1:1 REST mirror)

Each resource is an interface + factory function. Methods map directly to HTTP routes.

```typescript
// src/clients/svc/v1/posts.ts

import type { HttpClient } from '../../http';
import type { SdkResponse } from '../../response';

export interface PostsResource {
  create(userId: string, input: CreatePostInput): Promise<SdkResponse<Post>>;
  get(userId: string, id: string): Promise<SdkResponse<Post>>;
  list(userId: string, input?: ListPostsInput): Promise<SdkResponse<PaginatedResult<Post>>>;
  delete(userId: string, id: string): Promise<SdkResponse<void>>;
}

export function createPostsResource(http: HttpClient): PostsResource {
  return {
    create(userId, input) {
      return http.request('POST', '/api/v1/posts', { userId, body: input });
    },
    get(userId, id) {
      return http.request('GET', `/api/v1/posts/${id}`, { userId });
    },
    list(userId, input) {
      return http.request('POST', '/api/v1/posts/list', { userId, body: input });
    },
    delete(userId, id) {
      return http.request('DELETE', `/api/v1/posts/${id}`, { userId });
    },
  };
}
```

#### Component 5: Client Factory

Composes all resources into a single typed client.

```typescript
// src/clients/svc/v1/index.ts

import { HttpClient, type HttpClientConfig } from '../../http';
import { assertServerSide } from '../../guard';
import { createPostsResource, type PostsResource } from './posts';
import { createProfilesResource, type ProfilesResource } from './profiles';
import { createFeedsResource, type FeedsResource } from './feeds';
import { createCommentsResource, type CommentsResource } from './comments';

export interface SvcClient {
  posts: PostsResource;
  profiles: ProfilesResource;
  feeds: FeedsResource;
  comments: CommentsResource;
}

export function createSvcClient(config: HttpClientConfig): SvcClient {
  assertServerSide();
  const http = new HttpClient(config);

  return {
    posts: createPostsResource(http),
    profiles: createProfilesResource(http),
    feeds: createFeedsResource(http),
    comments: createCommentsResource(http),
  };
}

// Re-export types
export type { HttpClientConfig } from '../../http';
export type { SdkResponse, SdkError } from '../../response';
export type { PostsResource } from './posts';
export type { ProfilesResource } from './profiles';
export type { FeedsResource } from './feeds';
export type { CommentsResource } from './comments';
```

---

## Examples

### Example 1: Basic Usage (Callback Auth)

Consumer provides their own auth token resolver.

```typescript
import { createSvcClient } from '@prmichaelsen/goodneighbor-core/clients/svc/v1';

const client = createSvcClient({
  baseUrl: 'https://api.goodneighbor.com',
  getAuthToken: async (userId) => myJwtService.generateToken(userId),
});

// Check-style (no throw)
const { data, error } = await client.posts.create('user123', {
  title: 'Hello World',
  content: 'My first post',
  isPublic: true,
});
if (error) {
  console.error(`[${error.code}] ${error.message}`);
} else {
  console.log('Created post:', data.id);
}
```

### Example 2: Throw-style Usage

Use `throwOnError()` when you want exceptions.

```typescript
try {
  const post = await client.posts.get('user123', 'post-abc').throwOnError();
  console.log(post.title);
} catch (error) {
  // error is SdkError { code, message, status }
  if (error.code === 'not_found') {
    console.log('Post does not exist');
  }
}
```

### Example 3: Service Token Auth

SDK generates JWTs internally from a shared secret.

```typescript
const client = createSvcClient({
  baseUrl: 'https://api.goodneighbor.com',
  auth: {
    serviceToken: process.env.SERVICE_SECRET!,
    jwtOptions: { issuer: 'goodneighbor-worker', expiresIn: '5m' },
  },
});
```

---

## Benefits

### 1. Consistent Error Handling
Every API call returns the same `{ data, error }` shape. Consumers never need to parse HTTP responses or catch fetch exceptions — network errors and HTTP errors both surface as `SdkError`.

### 2. Type Safety
Resources define typed method signatures. Consumers get autocomplete for method names, input shapes, and response types.

### 3. Single Auth Configuration
Auth is configured once at client creation. Individual resource methods don't need to handle tokens — the `HttpClient` resolves auth automatically per request.

### 4. Discoverability
Resource grouping (`client.posts.*`, `client.profiles.*`) makes the API surface discoverable. Consumers explore via autocomplete instead of reading REST docs.

---

## Trade-offs

### 1. Requires a REST API
**Downside**: This pattern assumes a REST server exists. If services are only consumed directly (no HTTP layer), this adds unnecessary indirection.
**Mitigation**: Only implement when a REST server is deployed or planned.

### 2. Type Duplication
**Downside**: Input/output types may duplicate types already defined in the core library.
**Mitigation**: Use OpenAPI codegen (`npm run generate:types`) to keep client types in sync with server types, or import shared types from the core barrel.

### 3. Server-Side Only
**Downside**: Cannot be used in browser code. The browser guard will throw.
**Mitigation**: This is intentional — server credentials must not leak to browsers. For browser clients, build a separate thin client that calls a BFF (backend-for-frontend).

---

## Anti-Patterns

### Anti-Pattern 1: Business Logic in Resources

**Description**: Putting validation, caching, or transformation logic in resource methods.

**Why it's bad**: Resources should be thin HTTP wrappers. Business logic belongs in services.

```typescript
// Bad — validation in resource
create(userId, input) {
  if (!input.title) throw new Error('Title required');
  return http.request('POST', '/api/v1/posts', { userId, body: input });
}

// Good — resource is a thin wrapper, server validates
create(userId, input) {
  return http.request('POST', '/api/v1/posts', { userId, body: input });
}
```

### Anti-Pattern 2: Throwing by Default

**Description**: Having resource methods throw on HTTP errors instead of returning `{ data, error }`.

**Why it's bad**: Forces consumers to wrap every call in try/catch. The Supabase pattern succeeds precisely because it makes error handling explicit and optional.

```typescript
// Bad — throws on error
const post = await client.posts.get(userId, id); // might throw

// Good — returns { data, error }, consumer decides
const { data, error } = await client.posts.get(userId, id);
const post = await client.posts.get(userId, id).throwOnError(); // opt-in throw
```

---

## Testing Strategy

### Unit Testing

Mock `fetch` globally or inject it. Test that resources call the right HTTP method/path and that `SdkResponse` is correctly constructed from HTTP responses.

```typescript
describe('PostsResource', () => {
  it('calls POST /api/v1/posts with body', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: '1', title: 'Test' }), { status: 200 }),
    );

    const http = new HttpClient({ baseUrl: 'https://api.test.com' });
    const posts = createPostsResource(http);
    const { data, error } = await posts.create('user1', { title: 'Test' });

    expect(error).toBeNull();
    expect(data).toEqual({ id: '1', title: 'Test' });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test.com/api/v1/posts',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('maps 404 to not_found error', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Not found' }), { status: 404 }),
    );

    const http = new HttpClient({ baseUrl: 'https://api.test.com' });
    const posts = createPostsResource(http);
    const { data, error } = await posts.get('user1', 'missing');

    expect(data).toBeNull();
    expect(error?.code).toBe('not_found');
    expect(error?.status).toBe(404);
  });
});
```

### Integration Testing

Point the client at a running test server and verify end-to-end request/response flow.

---

## Related Patterns

- **[Service Layer](./core-sdk.service-base.md)**: Services contain business logic; client SDKs wrap the HTTP transport that sits in front of services
- **[Result Types](./core-sdk.result-types.md)**: Server-side `Result<T, E>` is the internal equivalent of `SdkResponse<T>` — same philosophy, different layers
- **[Error Hierarchy](./core-sdk.error-types.md)**: `SdkError.code` maps to the error `kind` values from the server's error hierarchy

---

## Migration Guide

### Step 1: Create shared HTTP infrastructure
Implement `response.ts`, `http.ts`, and `guard.ts` in `src/clients/`.

### Step 2: Define resources for each API domain
Create one resource file per REST resource group (posts, profiles, feeds, comments). Each resource is an interface + factory function.

### Step 3: Create the client factory
Compose all resources in `src/clients/svc/v1/index.ts`. Wire `assertServerSide()` + `HttpClient` + resource factories.

### Step 4: Add subpath export
Add `"./clients/svc/v1"` to `package.json` exports map so consumers can import the client directly.

### Step 5: Generate types (optional)
If an OpenAPI spec exists, generate TypeScript types from it to keep client and server types in sync.

---

## References

- [remember-core client SDK](../../src/clients/) — Production implementation of this pattern
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/) — Inspiration for `{ data, error }` response pattern
- Production files: `response.ts`, `http.ts`, `guard.ts`, `svc/v1/index.ts`, `svc/v1/memories.ts`

---

## Checklist for Implementation

- [ ] `SdkResponse<T>` type with `data`, `error`, `throwOnError()`
- [ ] `createSuccess()` and `createError()` helpers
- [ ] `fromHttpResponse()` maps HTTP status to error codes
- [ ] `HttpClient` with dual auth (getAuthToken callback + serviceToken JWT)
- [ ] `assertServerSide()` browser guard called in factory
- [ ] One resource file per REST domain (interface + factory)
- [ ] Client factory composes all resources from shared HttpClient
- [ ] Subpath export in package.json (`./clients/svc/v1`)
- [ ] Unit tests mock `fetch` and verify request mapping + response parsing
- [ ] Network errors return `SdkResponse` (never throw)

---

**Status**: Stable
**Recommendation**: Implement when a REST API server exists or is planned for goodneighbor. Adapt resource definitions to match actual API routes.
**Last Updated**: 2026-03-01
**Contributors**: Derived from @prmichaelsen/remember-core client SDK implementation
