# Task 38: Health Resource & Endpoint

**Milestone**: [M9 - OpenAPI Spec, Type Generation & Health](../../milestones/milestone-9-openapi-type-generation.md)
**Estimated Time**: 2 hours
**Dependencies**: Task 30 (HttpClient), Task 33 (adapter)
**Status**: Not Started

---

## Objective

Add a health/version resource to the SvcClient and corresponding adapter handlers. These are public endpoints (no auth required).

---

## Steps

### 1. Create `src/clients/svc/v1/health.ts`

```typescript
export interface HealthResource {
  check(): Promise<SdkResponse<{ status: string; timestamp: string }>>;
  version(): Promise<SdkResponse<{ version: string; environment: string }>>;
}
```

Routes: `GET /health`, `GET /version` (no userId needed — public).

### 2. Add to SvcClient

Update `src/clients/svc/v1/index.ts` to include `health: HealthResource`.

### 3. Create adapter handler `src/adapter/handlers/health.ts`

- `healthCheck()` → returns `{ status: 'ok', timestamp: new Date().toISOString() }`
- `versionCheck()` → reads version from package.json, returns `{ version, environment }`

### 4. Add to `createRoutes()`

```typescript
{ method: 'GET', path: '/health', handler: healthCheck() },
{ method: 'GET', path: '/version', handler: versionCheck() },
```

### 5. Create colocated specs

Test health and version handlers return correct shapes.

---

## Verification

- [ ] HealthResource has `check()` and `version()` methods
- [ ] SvcClient includes `health` property
- [ ] Adapter handlers return correct JSON shapes
- [ ] Routes registered in `createRoutes()`
- [ ] Tests pass
