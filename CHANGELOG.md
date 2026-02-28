# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Architecture design document (`local.goodneighbor-core.md`) — 8 services, source structure, migration path
- Requirements document (`requirements.md`) — goals, functional/non-functional requirements, success criteria
- Content entity & permission model design (`local.content-entity-model.md`) — refs hierarchy, semantic IDs, entity types
- Search architecture design (`local.search-architecture.md`) — Algolia config, filters builder, indexing flow
- Config & infrastructure design (`local.config-infrastructure.md`) — Zod schemas, env vars, Firebase/Algolia init

### Changed

- Adopt UID-based semantic IDs (`@uid:{firebaseUid}`) instead of username-based (`@/{username}`) to avoid fan-out on username changes

## [0.1.0] - 2026-02-28

### Added

- Install core-sdk ACP package (v1.22.0) for project scaffolding
- TypeScript source structure: types, errors, config, services, client, testing
- Build tooling: esbuild, Jest, TypeScript configuration
- 30 core-sdk patterns for adapters, services, config, types, testing, and client
- Architecture design document
- Example implementations for REST, MCP, CLI, and test adapters
- Progress tracking initialization
