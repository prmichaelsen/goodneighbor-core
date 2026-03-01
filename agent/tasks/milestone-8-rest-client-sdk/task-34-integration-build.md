# Task 34: Integration, Build & Export Verification

**Milestone**: [M8 - REST Client SDK](../../milestones/milestone-8-rest-client-sdk.md)
**Estimated Time**: 3 hours
**Dependencies**: Tasks 30-33 (all SDK + adapter code)
**Status**: Not Started

---

## Objective

Wire the client SDK and REST adapter into the build pipeline, update the root barrel export, verify all package.json subpath exports resolve, and run a round-trip integration test (adapter → client SDK).

---

## Context

This is the final integration task for M8. It ensures that:
- The new `src/clients/` and `src/adapter/` modules build correctly with esbuild
- TypeScript declarations are generated
- The subpath exports (`./clients/svc/v1`, `./adapter`) resolve at import time
- A round-trip test proves the client SDK can call the adapter handlers

---

## Steps

### 1. Update `esbuild.build.js`

Add entry points:
- `src/clients/svc/v1/index.ts`
- `src/adapter/index.ts`

### 2. Update `package.json` exports

```json
"./clients/svc/v1": {
  "types": "./dist/clients/svc/v1/index.d.ts",
  "import": "./dist/clients/svc/v1/index.js"
},
"./adapter": {
  "types": "./dist/adapter/index.d.ts",
  "import": "./dist/adapter/index.js"
}
```

### 3. Update root barrel `src/index.ts`

Add exports for client SDK types and adapter types (type-only exports for consumer convenience).

### 4. Run `npm run build`

Verify:
- No TypeScript errors
- All entry points compile
- Declaration files generated for client + adapter modules

### 5. Run `npm run test`

Verify:
- All existing 457 tests still pass
- All new M8 tests pass

### 6. Create round-trip integration test

`src/adapter/adapter-client.integration.spec.ts`:
- Create mock ServiceContainer with stubbed services
- Create routes via `createRoutes(container)`
- Create a mock `fetch` that routes to the adapter handlers
- Create `SvcClient` with that mock fetch
- Call `client.posts.create(...)` → verify it reaches the handler → returns correct `SdkResponse`

This proves the client SDK and adapter are compatible end-to-end.

### 7. Run `npm pack --dry-run`

Verify new files appear in tarball:
- `dist/clients/svc/v1/index.js` + `.d.ts`
- `dist/adapter/index.js` + `.d.ts`

### 8. Update `agent/progress.yaml`

- Add M8 milestone entry
- Add tasks 30-34
- Update version to 0.2.0 (minor bump — new feature)

---

## Verification

- [ ] `npm run build` succeeds with new entry points
- [ ] `npm run test` — all tests pass (old + new)
- [ ] Subpath exports resolve: `./clients/svc/v1`, `./adapter`
- [ ] Round-trip integration test passes
- [ ] `npm pack --dry-run` shows new dist files
- [ ] `progress.yaml` updated with M8
