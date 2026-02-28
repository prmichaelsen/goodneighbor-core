# Task 29: npm Publish Preparation

**Milestone**: [M7 - ServiceContainer, Build & Publish](../../milestones/milestone-7-servicecontainer-build-publish.md)
**Estimated Time**: 2 hours
**Dependencies**: Task 27 (Package Build & Exports), Task 28 (Integration Tests)
**Status**: Not Started

---

## Objective

Prepare the `@prmichaelsen/goodneighbor-core` package for npm publication. Update package.json with complete metadata (name, version, description, keywords, repository, author, license, main/module/types fields). Create a `.npmignore` file that excludes agent/, src/, tests/, and .claude/ directories from the published package. Verify that `npm pack` produces a clean tarball containing only dist/, package.json, README.md, and LICENSE. Define the version strategy for the package.

---

## Context

This is the final task before the package can be published to npm. The build system (Task 27) produces the dist/ output, and integration tests (Task 28) verify correctness. This task ensures that the published artifact is clean, well-described, and follows npm best practices.

The package is scoped to `@prmichaelsen` and starts at version `0.1.0` following semver. The `0.x` version range signals that the API is not yet stable and breaking changes may occur in minor version bumps. Once the goodneighbor Next.js app has successfully migrated to use goodneighbor-core, version `1.0.0` will be released.

Key concerns:
- The published tarball must not contain source code (src/), tests (tests/), agent planning documents (agent/), or Claude Code configuration (.claude/).
- Package.json metadata must be complete for npm registry discoverability.
- The README must provide enough information for a consumer to install and use the package.
- A LICENSE file must be present.

---

## Steps

### 1. Update package.json Metadata

Update the package.json with complete publication metadata:

```json
{
  "name": "@prmichaelsen/goodneighbor-core",
  "version": "0.1.0",
  "description": "Platform-agnostic business logic library for the goodneighbor community platform. Provides services for content management, search, profiles, feeds, comments, auth, notifications, and i18n.",
  "keywords": [
    "goodneighbor",
    "community",
    "content-management",
    "firebase",
    "algolia",
    "search",
    "typescript",
    "business-logic",
    "service-container"
  ],
  "author": "Patrick Michaelsen",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/prmichaelsen/goodneighbor-core.git"
  },
  "homepage": "https://github.com/prmichaelsen/goodneighbor-core#readme",
  "bugs": {
    "url": "https://github.com/prmichaelsen/goodneighbor-core/issues"
  },
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "files": [
    "dist/",
    "LICENSE",
    "README.md"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "peerDependencies": {
    "firebase-admin": ">=11.0.0",
    "algoliasearch": ">=4.0.0",
    "zod": ">=3.0.0"
  },
  "peerDependenciesMeta": {
    "firebase-admin": {
      "optional": false
    },
    "algoliasearch": {
      "optional": false
    },
    "zod": {
      "optional": false
    }
  }
}
```

Note: The `"files"` field in package.json is the allowlist approach. It explicitly lists what to include in the tarball, which is more secure than `.npmignore` (denylist). Using both provides defense in depth.

### 2. Create .npmignore

Create `.npmignore` at the project root as a safety net (in case `"files"` is misconfigured):

```
# Source code (not published -- dist/ contains compiled output)
src/
tests/

# Agent planning and configuration
agent/
.claude/

# Build configuration (not needed by consumers)
esbuild.build.js
tsconfig.json
tsconfig.build.json
jest.config.ts
jest.integration.config.ts

# Development files
.env
.env.*
.eslintrc*
.prettierrc*
.editorconfig

# Test artifacts
coverage/
*.spec.ts
*.test.ts
__tests__/

# Git and CI
.git/
.github/
.gitignore

# Misc
*.tgz
node_modules/
.DS_Store
```

### 3. Create LICENSE File

Create a `LICENSE` file at the project root with the MIT license:

```
MIT License

Copyright (c) 2026 Patrick Michaelsen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 4. Verify npm pack Output

Run `npm pack` and inspect the tarball contents:

```bash
# Build first
npm run build

# Create tarball (dry run to preview)
npm pack --dry-run

# Verify the dry run output shows:
#   - dist/esm/**  (ESM output)
#   - dist/cjs/**  (CJS output)
#   - package.json
#   - README.md
#   - LICENSE
#
# Verify the dry run output does NOT show:
#   - src/**
#   - tests/**
#   - agent/**
#   - .claude/**
#   - node_modules/**
#   - *.spec.ts
#   - esbuild.build.js
#   - tsconfig.json

# Create actual tarball for inspection
npm pack

# List tarball contents
tar tzf prmichaelsen-goodneighbor-core-0.1.0.tgz | head -50

# Verify tarball size is reasonable (should be < 500KB for a library this size)
ls -lh prmichaelsen-goodneighbor-core-0.1.0.tgz

# Clean up
rm prmichaelsen-goodneighbor-core-0.1.0.tgz
```

### 5. Test Installation from Tarball

Verify the tarball installs and imports correctly in a fresh project:

```bash
# Create a temporary test consumer
mkdir /tmp/goodneighbor-core-test
cd /tmp/goodneighbor-core-test
npm init -y

# Install from tarball
npm install /path/to/prmichaelsen-goodneighbor-core-0.1.0.tgz

# Test ESM import
node --input-type=module -e "
  import { SERVICE_NAMES } from '@prmichaelsen/goodneighbor-core/services';
  console.log('Import OK:', Object.keys(SERVICE_NAMES));
"

# Test CJS import
node -e "
  const pkg = require('@prmichaelsen/goodneighbor-core');
  console.log('CJS import OK:', typeof pkg);
"

# Clean up
cd -
rm -rf /tmp/goodneighbor-core-test
```

### 6. Define Version Strategy

Document the versioning approach in a note within this task (not a separate file):

**Version Strategy**:
- **0.1.0**: Initial release. All 8 services, ServiceContainer, types, constants, errors, config, i18n.
- **0.x.y**: Pre-stable releases. Breaking changes allowed in minor bumps (0.2.0 may break 0.1.0 consumers). Patch bumps (0.1.1) for bug fixes only.
- **1.0.0**: Stable release. Published after the goodneighbor Next.js app has successfully migrated to use goodneighbor-core and the API has been validated in production.
- Post-1.0: Follow standard semver (major = breaking, minor = features, patch = fixes).

**Release Workflow**:
1. Ensure all tests pass: `npm test && npm run test:integration`
2. Ensure build succeeds: `npm run build`
3. Verify tarball: `npm pack --dry-run`
4. Bump version: `npm version patch|minor|major`
5. Publish: `npm publish --access public`
6. Tag release: `git tag v0.1.0 && git push --tags`

### 7. Add Prepublish Script

Add a prepublishOnly script to package.json that ensures the build is fresh and tests pass before publishing:

```json
{
  "scripts": {
    "prepublishOnly": "npm run build && npm test"
  }
}
```

---

## Verification

- [ ] package.json "name" is "@prmichaelsen/goodneighbor-core"
- [ ] package.json "version" is "0.1.0"
- [ ] package.json "description" is present and descriptive
- [ ] package.json "keywords" array contains relevant terms
- [ ] package.json "author" is "Patrick Michaelsen"
- [ ] package.json "license" is "MIT"
- [ ] package.json "repository" points to the correct GitHub URL
- [ ] package.json "main" points to CJS entry: "./dist/cjs/index.cjs"
- [ ] package.json "module" points to ESM entry: "./dist/esm/index.js"
- [ ] package.json "types" points to declaration entry: "./dist/esm/index.d.ts"
- [ ] package.json "files" array includes ["dist/", "LICENSE", "README.md"]
- [ ] package.json "engines" specifies "node": ">=18.0.0"
- [ ] package.json "peerDependencies" lists firebase-admin, algoliasearch, zod
- [ ] package.json "prepublishOnly" script runs build and tests
- [ ] `.npmignore` exists and excludes src/, tests/, agent/, .claude/
- [ ] `LICENSE` file exists with MIT license text
- [ ] `npm pack --dry-run` shows only dist/, package.json, README.md, LICENSE
- [ ] `npm pack --dry-run` does NOT show src/, tests/, agent/, .claude/, node_modules/
- [ ] Tarball size is reasonable (< 500KB)
- [ ] Tarball installs successfully in a fresh test project
- [ ] Imports from installed tarball resolve correctly (ESM and CJS)

---

## Expected Output

**File Structure** (new/updated files):
```
goodneighbor-core/
├── package.json        # Updated with full metadata, exports, peerDeps
├── .npmignore          # NEW: excludes source/test/agent from tarball
└── LICENSE             # NEW: MIT license
```

**Key Files Created/Updated**:
- `package.json`: Complete npm publication metadata, exports field, peer dependencies, engines, scripts
- `.npmignore`: Denylist excluding development files from published tarball
- `LICENSE`: MIT license file

**npm pack output should contain**:
```
package/dist/esm/index.js
package/dist/esm/index.d.ts
package/dist/esm/types/index.js
package/dist/esm/types/index.d.ts
package/dist/esm/services/index.js
package/dist/esm/services/index.d.ts
... (all dist/ files)
package/dist/cjs/index.cjs
package/dist/cjs/types/index.cjs
... (all CJS files)
package/package.json
package/README.md
package/LICENSE
```

---

## Common Issues and Solutions

### Issue 1: Tarball includes unwanted files despite .npmignore
**Symptom**: `npm pack --dry-run` shows src/ or agent/ files
**Solution**: Check that `.npmignore` is at the project root (not in a subdirectory). Also verify the `"files"` field in package.json -- if present, npm uses it as an allowlist and `.npmignore` is secondary. The `"files"` field should only list `["dist/", "LICENSE", "README.md"]`.

### Issue 2: Scoped package requires --access public
**Symptom**: `npm publish` fails with "You must sign up for private packages"
**Solution**: Scoped packages (@prmichaelsen/goodneighbor-core) are private by default on npm. Use `npm publish --access public` for the first publish. Subsequent publishes of the same package will use the same access level.

### Issue 3: peerDependencies version range too restrictive
**Symptom**: Consumer's firebase-admin version does not satisfy the peer dep range
**Solution**: Use generous version ranges for peer dependencies (e.g., `">=11.0.0"` instead of `"^12.0.0"`). The consumer controls which version they install.

### Issue 4: Missing README.md
**Symptom**: npm pack succeeds but the published package has no README on npmjs.com
**Solution**: Ensure README.md exists at the project root before packing. npm automatically includes it. The README should contain installation instructions, basic usage, and a link to full documentation.

---

## Resources

- [npm package.json documentation](https://docs.npmjs.com/cli/v10/configuring-npm/package-json): Complete reference for package.json fields
- [npm publish documentation](https://docs.npmjs.com/cli/v10/commands/npm-publish): Publishing guide
- [Node.js Packages](https://nodejs.org/docs/latest-v18.x/api/packages.html): ESM/CJS dual package guide
- [Semantic Versioning](https://semver.org/): Semver specification

---

## Notes

- The `"files"` field in package.json is preferred over `.npmignore` because it is an allowlist (safer). Both are included for defense in depth. If `"files"` is present, npm uses it as the primary filter; `.npmignore` only applies to files within the allowed directories.
- Runtime dependencies (firebase-admin, algoliasearch, zod) are listed as `peerDependencies`, not `dependencies`. This avoids bundling them into the package and ensures the consumer uses a single version. The consuming project must install these packages alongside goodneighbor-core.
- The `prepublishOnly` script is a safety net that prevents publishing without a fresh build and passing tests. It runs automatically before `npm publish`.
- Do not include `dist/` in version control. Add `dist/` to `.gitignore`. The build step generates dist/ from source.
- The initial version `0.1.0` (not `1.0.0`) signals that the API may change. The goodneighbor Next.js app integration (future milestone) will validate the API in production before promoting to `1.0.0`.
- After the first `npm publish --access public`, update the repository README with an npm badge and installation instructions.

---

**Next Task**: None (this is the final task of M7 and the final milestone of the core library)
**Related Design Docs**: `agent/design/local.goodneighbor-core.md`, `agent/design/requirements.md`
**Estimated Completion Date**: TBD
