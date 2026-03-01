# Task 37: Refactor Resources to Generated Types

**Milestone**: [M9 - OpenAPI Spec, Type Generation & Health](../../milestones/milestone-9-openapi-type-generation.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 36 (type generation)
**Status**: Not Started

---

## Objective

Refactor the 6 client SDK resources (posts, profiles, feeds, comments, search, auth) to import request/response types from `types.generated.ts` instead of the hand-written `src/types/` modules.

---

## Context

Currently each resource file imports types directly from `src/types/*.types.ts`. After this task, they'll import from `./types.ts` (the convenience aliases over generated types). The hand-written types in `src/types/` remain for server-side service use — the generated types are for the API contract boundary.

---

## Steps

### 1. Update each resource to import from convenience types

For each of the 6 resources in `src/clients/svc/v1/`:
- Replace `import type { ... } from '../../../types/...'`
- With `import type { ... } from './types'`

### 2. Verify type compatibility

Generated types must be structurally compatible with hand-written types. If there are mismatches, fix the OpenAPI spec (the spec is wrong, not the TypeScript types).

### 3. Update resource interfaces

If generated types expose different shapes (e.g., `DbPost` vs `Post`), update resource return type annotations to match the spec's response schema.

### 4. Update adapter handlers

Adapter handler type imports can optionally reference generated types too, but this is lower priority since they call services directly.

### 5. Run all tests

Ensure no regressions.

---

## Verification

- [ ] All 6 resources import from `./types` (generated aliases)
- [ ] No direct imports from `../../../types/` in resource files
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Build succeeds
