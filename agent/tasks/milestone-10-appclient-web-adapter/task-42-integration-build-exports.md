# Task 42: Integration, Build & Export Verification

**Milestone**: [M10 - AppClient & Web Adapter](../../milestones/milestone-10-appclient-web-adapter.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 39-41 (all M10 tasks)
**Status**: Not Started

---

## Objective

Wire up subpath exports, update the build pipeline, bump the version, and verify everything works end-to-end.

---

## Steps

### 1. Update `esbuild.build.js`

Add entry points:
- `src/web/index.ts`
- `src/app/index.ts`

### 2. Update `package.json`

Add subpath exports:
```json
{
  "./web": {
    "types": "./dist/web/index.d.ts",
    "import": "./dist/web/index.js"
  },
  "./app": {
    "types": "./dist/app/index.d.ts",
    "import": "./dist/app/index.js"
  }
}
```

Bump version to `0.3.0`.

### 3. Update `src/index.ts` barrel

Add type-only exports for web and app layer types:
```typescript
export type { WebSDKContext, WebSDKError } from './web';
export type { AppClient } from './app';
```

### 4. Update `docs/openapi.yaml`

Add `/api/app/v1/` compound operation routes to the OpenAPI spec (if M9 completed first).

### 5. Run full verification

- `npm run build` — no errors
- `npm test` — all tests pass
- Verify subpath exports resolve: `node -e "require.resolve('./dist/web/index.js')"`
- Verify TypeScript declarations present

### 6. Update CHANGELOG.md

Add `[0.3.0]` section documenting:
- WebSDKContext + use-case functions
- AppClient compound operations
- New subpath exports `./web` and `./app`

---

## Verification

- [ ] Build completes without errors
- [ ] All tests pass (target: 600+)
- [ ] `./web` subpath export resolves correctly
- [ ] `./app` subpath export resolves correctly
- [ ] Root barrel exports web/app types
- [ ] Version is 0.3.0
- [ ] CHANGELOG updated
