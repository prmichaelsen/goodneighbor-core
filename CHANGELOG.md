# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-03-01

### Added
- **Web SDK adapter** (`src/web/`) — `WebSDKContext` and `WebSDKError` types for web boundary
- `toWebSDKError()` converter mapping `AppError` to serializable `WebSDKError`
- `webTryCatch()` helper wrapping async functions in `Result<T, WebSDKError>`
- 6 compound use-case functions: `setupProfile`, `viewProfile`, `discoverUsers`, `createAndSubmitToFeed`, `createFeedAndFollow`, `getFeedDetails`
- **AppClient** (`src/app/`) — use-case-oriented REST client with compound operations
- `ContentOperations`: `createAndSubmitToFeed`, `createFeedAndFollow` (fail-fast chaining)
- `ProfileOperations`: `setupProfile`, `viewProfile`
- `DiscoveryOperations`: `discoverUsers`
- `createAppClient(config)` factory (server-side only)
- 5 compound adapter handlers at `/api/app/v1/` for server-side composition
- OpenAPI spec: 5 compound `/api/app/v1/` routes with request/response schemas
- Subpath exports: `./web` and `./app`

### Changed
- Root barrel exports `WebSDKContext`, `WebSDKError`, and `AppClient` types
- 608 tests passing across 58 suites (up from 565)

## [0.3.0] - 2026-03-01

### Added
- OpenAPI 3.0.3 specification at `docs/openapi.yaml` covering all 18 endpoints
- Type generation pipeline with `openapi-typescript` (`npm run generate:types`)
- CI validation script to detect stale generated types (`npm run generate:check`)
- Convenience type aliases at `src/clients/svc/v1/types.ts`
- Health resource (`GET /health`) and version resource (`GET /version`)
- `HealthResource` on `SvcClient` with `check()` and `version()` methods
- `healthCheck()` and `versionCheck()` adapter route handlers
- `CreateRoutesOptions` for passing version/environment to health endpoints

### Changed
- All 6 client SDK resources now import types from generated aliases (`./types`) instead of hand-written types (`../../../types/`)
- Comments resource uses `PaginatedCommentResult` (generated) instead of `PaginatedResult<Comment>` (generic)
- Auth resource imports `VerifySessionResult` from generated types instead of defining locally

## [0.2.0] - 2026-03-01

### Added

- **REST Client SDK** (`src/clients/`) — Supabase-style `SdkResponse<T>` with `{ data, error, throwOnError() }`
- `HttpClient` with dual auth (getAuthToken callback or serviceToken JWT generation)
- `assertServerSide()` browser guard to prevent accidental client-side bundling
- 6 resource implementations: posts, profiles, feeds, comments, search, auth
- `createSvcClient(config)` factory composing all resources from shared HttpClient
- **REST Adapter** (`src/adapter/`) — Framework-agnostic route handler layer
- `AdapterRequest`/`AdapterResponse` types for framework-independent HTTP handling
- 16 route handlers mapping to existing service methods via `createRoutes(container)`
- `resultToResponse()` mapper converting `Result<T, AppErrorUnion>` to HTTP status codes
- Subpath exports: `./clients/svc/v1` and `./adapter`
- jsonwebtoken as optional peer dependency for JWT-based auth

### Changed

- esbuild config uses `outbase` for correct directory structure in dist/
- 544 tests passing across 44 suites (up from 457)

### Removed

- Scaffold template files that were not part of goodneighbor-core (`user.client.ts`, `base.service.ts`, `user.service.ts`, `shared.types.ts`, `client/index.ts`)
- Stale `BaseService` and `UserService` re-exports from `services/index.ts`

## [0.1.0] - 2026-02-28

### Added

- Install core-sdk ACP package (v1.22.0) for project scaffolding
- TypeScript source structure: types, errors, config, services, client, testing
- Build tooling: esbuild, Jest, TypeScript configuration
- 30 core-sdk patterns for adapters, services, config, types, testing, and client
- Architecture design document
- Example implementations for REST, MCP, CLI, and test adapters
- Progress tracking initialization
