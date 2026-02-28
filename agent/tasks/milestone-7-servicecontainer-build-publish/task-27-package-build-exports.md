# Task 27: Package Build & Export Verification

**Milestone**: [M7 - ServiceContainer, Build & Publish](../../milestones/milestone-7-servicecontainer-build-publish.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 26 (ServiceContainer must be in place so the services barrel is complete)
**Status**: Not Started

---

## Objective

Verify and fix the package build system (esbuild) and barrel exports. Ensure all export paths work correctly for consumers: `goodneighbor-core` (root), `/types`, `/constants`, `/errors`, `/services`, `/config`, `/i18n`, `/client`, `/testing`. Configure the `package.json` "exports" field with conditional exports for ESM and CJS. Verify TypeScript declaration files are generated. Run the build and confirm output structure is correct.

---

## Context

goodneighbor-core uses esbuild for fast TypeScript compilation and bundling. The package must be consumable by both ESM and CJS consumers (the goodneighbor Next.js app uses ESM, but other consumers may use CJS). Each submodule (types, constants, errors, services, config, i18n, client, testing) needs its own barrel export so consumers can do selective imports like `import { SearchService } from '@prmichaelsen/goodneighbor-core/services'` instead of pulling in the entire library.

The `package.json` "exports" field (Node.js subpath exports) controls which entry points are available and maps them to the correct ESM or CJS file depending on the consumer's module system. TypeScript declarations (`.d.ts` files) must be generated alongside the JavaScript output so consumers get type information.

esbuild does not natively generate `.d.ts` files, so we need to run `tsc --emitDeclarationOnly` as a separate step in the build pipeline.

---

## Steps

### 1. Verify All Submodule Barrel Exports

Ensure each submodule has a complete `index.ts` that re-exports everything consumers need. Check and update as necessary:

```typescript
// src/types/index.ts
export * from './common.types';
export * from './result.types';
export * from './utils.types';
export * from './content-entity.types';
export * from './profile.types';
export * from './profile-board.types';
export * from './post.types';
export * from './feed.types';
export * from './comment.types';
export * from './search.types';
export * from './auth.types';
export * from './pagination.types';

// src/constants/index.ts
export * from './collections';

// src/errors/index.ts
export * from './base.error';
export * from './app-errors';
export * from './error-codes';

// src/services/index.ts
export * from './base.service';
export * from './auth.service';
export * from './content.service';
export * from './search.service';
export * from './profile.service';
export * from './feed.service';
export * from './comment.service';
export * from './notification.service';
export * from './container';

// src/config/index.ts
export * from './schema';
export * from './loader';

// src/i18n/index.ts
export * from './types';
export * from './keys';
export * from './utils';

// src/client/index.ts
// Placeholder for future typed HTTP client
export {};

// src/testing/index.ts
export * from './fixtures';
export * from './helpers';
```

### 2. Update Root Barrel Export (src/index.ts)

The root `src/index.ts` should re-export from all submodules so `import { ... } from '@prmichaelsen/goodneighbor-core'` works:

```typescript
/**
 * goodneighbor-core -- Platform-agnostic business logic for the goodneighbor app.
 *
 * Submodule imports are preferred for tree-shaking:
 *   import { SearchService } from '@prmichaelsen/goodneighbor-core/services';
 *   import { PostId } from '@prmichaelsen/goodneighbor-core/types';
 *
 * Root import provides everything:
 *   import { SearchService, PostId } from '@prmichaelsen/goodneighbor-core';
 */
export * from './types';
export * from './constants';
export * from './errors';
export * from './services';
export * from './config';
export * from './i18n';
```

Note: `client/` and `testing/` are intentionally excluded from the root barrel. `testing/` is a dev utility and `client/` is a future placeholder.

### 3. Update esbuild.build.js for Dual ESM + CJS Output

Update the esbuild build script to produce both ESM and CJS outputs with multiple entry points:

```javascript
const esbuild = require('esbuild');
const { execSync } = require('child_process');

const sharedConfig = {
  entryPoints: [
    'src/index.ts',
    'src/types/index.ts',
    'src/constants/index.ts',
    'src/errors/index.ts',
    'src/services/index.ts',
    'src/config/index.ts',
    'src/i18n/index.ts',
    'src/client/index.ts',
    'src/testing/index.ts',
  ],
  bundle: false,        // Do not bundle -- let consumers handle their own bundling
  sourcemap: true,
  target: 'node18',
  platform: 'node',
  external: [
    'firebase-admin',
    'algoliasearch',
    'zod',
  ],
};

async function build() {
  // ESM output
  await esbuild.build({
    ...sharedConfig,
    outdir: 'dist/esm',
    format: 'esm',
    outExtension: { '.js': '.js' },
  });

  // CJS output
  await esbuild.build({
    ...sharedConfig,
    outdir: 'dist/cjs',
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
  });

  // TypeScript declarations (esbuild does not generate .d.ts)
  console.log('Generating TypeScript declarations...');
  execSync('tsc --emitDeclarationOnly --outDir dist/esm --declaration --declarationMap', {
    stdio: 'inherit',
  });

  // Copy declarations to CJS directory as well
  execSync('cp -r dist/esm/**/*.d.ts dist/cjs/ 2>/dev/null || true', {
    stdio: 'inherit',
  });

  console.log('Build complete.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 4. Configure package.json "exports" Field

Update `package.json` with the Node.js subpath exports map:

```json
{
  "name": "@prmichaelsen/goodneighbor-core",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/cjs/index.d.ts",
        "default": "./dist/cjs/index.cjs"
      }
    },
    "./types": {
      "import": {
        "types": "./dist/esm/types/index.d.ts",
        "default": "./dist/esm/types/index.js"
      },
      "require": {
        "types": "./dist/cjs/types/index.d.ts",
        "default": "./dist/cjs/types/index.cjs"
      }
    },
    "./constants": {
      "import": {
        "types": "./dist/esm/constants/index.d.ts",
        "default": "./dist/esm/constants/index.js"
      },
      "require": {
        "types": "./dist/cjs/constants/index.d.ts",
        "default": "./dist/cjs/constants/index.cjs"
      }
    },
    "./errors": {
      "import": {
        "types": "./dist/esm/errors/index.d.ts",
        "default": "./dist/esm/errors/index.js"
      },
      "require": {
        "types": "./dist/cjs/errors/index.d.ts",
        "default": "./dist/cjs/errors/index.cjs"
      }
    },
    "./services": {
      "import": {
        "types": "./dist/esm/services/index.d.ts",
        "default": "./dist/esm/services/index.js"
      },
      "require": {
        "types": "./dist/cjs/services/index.d.ts",
        "default": "./dist/cjs/services/index.cjs"
      }
    },
    "./config": {
      "import": {
        "types": "./dist/esm/config/index.d.ts",
        "default": "./dist/esm/config/index.js"
      },
      "require": {
        "types": "./dist/cjs/config/index.d.ts",
        "default": "./dist/cjs/config/index.cjs"
      }
    },
    "./i18n": {
      "import": {
        "types": "./dist/esm/i18n/index.d.ts",
        "default": "./dist/esm/i18n/index.js"
      },
      "require": {
        "types": "./dist/cjs/i18n/index.d.ts",
        "default": "./dist/cjs/i18n/index.cjs"
      }
    },
    "./client": {
      "import": {
        "types": "./dist/esm/client/index.d.ts",
        "default": "./dist/esm/client/index.js"
      },
      "require": {
        "types": "./dist/cjs/client/index.d.ts",
        "default": "./dist/cjs/client/index.cjs"
      }
    },
    "./testing": {
      "import": {
        "types": "./dist/esm/testing/index.d.ts",
        "default": "./dist/esm/testing/index.js"
      },
      "require": {
        "types": "./dist/cjs/testing/index.d.ts",
        "default": "./dist/cjs/testing/index.cjs"
      }
    }
  }
}
```

### 5. Update Build Script in package.json

Ensure the build script cleans dist/ before building:

```json
{
  "scripts": {
    "build": "rm -rf dist && node esbuild.build.js",
    "typecheck": "tsc --noEmit"
  }
}
```

### 6. Run Build and Verify Output

Execute the build and verify the output structure:

```bash
npm run build

# Verify ESM output
ls dist/esm/index.js
ls dist/esm/index.d.ts
ls dist/esm/types/index.js
ls dist/esm/services/index.js

# Verify CJS output
ls dist/cjs/index.cjs
ls dist/cjs/types/index.cjs
ls dist/cjs/services/index.cjs
```

### 7. Test Consumer Imports

Create a temporary test script to verify imports resolve correctly:

```bash
# From the project root, test ESM imports
node --input-type=module -e "
  import { createServiceContainer } from './dist/esm/index.js';
  console.log('Root import OK:', typeof createServiceContainer);
"

# Test subpath imports
node --input-type=module -e "
  import { SERVICE_NAMES } from './dist/esm/services/index.js';
  console.log('Services import OK:', Object.keys(SERVICE_NAMES));
"

# Test CJS imports
node -e "
  const { createServiceContainer } = require('./dist/cjs/index.cjs');
  console.log('CJS root import OK:', typeof createServiceContainer);
"
```

---

## Verification

- [ ] `npm run build` completes without errors
- [ ] `dist/esm/` directory contains .js and .d.ts files for all entry points
- [ ] `dist/cjs/` directory contains .cjs files for all entry points
- [ ] `dist/esm/index.js` exists and exports all root symbols
- [ ] `dist/esm/types/index.js` exists and exports all type-related runtime symbols
- [ ] `dist/esm/services/index.js` exists and exports ServiceContainer and all service classes
- [ ] `.d.ts` files present alongside .js files in dist/esm/
- [ ] `package.json` "exports" field defines all 9 subpath exports (root + 8 submodules)
- [ ] ESM imports resolve correctly (tested with `node --input-type=module`)
- [ ] CJS imports resolve correctly (tested with `node -e "require(...)"`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Each submodule `index.ts` re-exports all public symbols from its directory
- [ ] Root `src/index.ts` re-exports from types, constants, errors, services, config, i18n

---

## Expected Output

**File Structure**:
```
dist/
├── esm/
│   ├── index.js
│   ├── index.js.map
│   ├── index.d.ts
│   ├── types/
│   │   ├── index.js
│   │   ├── index.d.ts
│   │   ├── common.types.js
│   │   ├── common.types.d.ts
│   │   └── ... (all type files)
│   ├── constants/
│   │   ├── index.js
│   │   ├── index.d.ts
│   │   └── collections.js
│   ├── errors/
│   │   ├── index.js
│   │   └── ...
│   ├── services/
│   │   ├── index.js
│   │   ├── container.js
│   │   └── ...
│   ├── config/
│   │   ├── index.js
│   │   └── ...
│   ├── i18n/
│   │   ├── index.js
│   │   └── ...
│   ├── client/
│   │   └── index.js
│   └── testing/
│       ├── index.js
│       └── ...
└── cjs/
    ├── index.cjs
    ├── types/
    │   └── index.cjs
    └── ... (mirrors esm/ structure with .cjs extension)
```

**Key Files Created/Updated**:
- `esbuild.build.js`: Updated for dual ESM/CJS output with TypeScript declarations
- `package.json`: Updated with "exports" field, "main", "module", "types" fields
- `src/index.ts`: Updated root barrel export
- Various `src/*/index.ts`: Verified and updated submodule barrels

---

## Common Issues and Solutions

### Issue 1: esbuild "bundle: false" does not resolve internal imports
**Symptom**: Output files contain `import ... from './foo'` but the relative paths do not exist in dist/
**Solution**: With `bundle: false`, esbuild transpiles each file individually. All source files must be listed as entry points or referenced from listed entry points. Alternatively, if using a glob pattern for entry points, ensure all `.ts` files are included, not just `index.ts` files.

### Issue 2: TypeScript declarations not generated
**Symptom**: `.d.ts` files missing from dist/
**Solution**: esbuild does not generate declarations. The build script must run `tsc --emitDeclarationOnly` as a separate step. Verify that `tsconfig.json` has `"declaration": true` and `"declarationMap": true`.

### Issue 3: CJS output throws "require is not defined in ESM"
**Symptom**: Error when requiring CJS output from a `"type": "module"` project
**Solution**: Use `.cjs` extension for CJS output files. Node.js treats `.cjs` as CommonJS regardless of the package's `"type"` field.

### Issue 4: Subpath exports not resolving in TypeScript
**Symptom**: TypeScript cannot find module `@prmichaelsen/goodneighbor-core/types`
**Solution**: Ensure the consumer's `tsconfig.json` has `"moduleResolution": "node16"` or `"bundler"`. The older `"node"` resolution does not support package.json "exports".

---

## Resources

- [Node.js Subpath Exports](https://nodejs.org/docs/latest-v18.x/api/packages.html#subpath-exports): Official Node.js documentation on conditional exports
- [esbuild API](https://esbuild.github.io/api/): esbuild build configuration reference
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-resolution): TypeScript module resolution strategies

---

## Notes

- The `client/` submodule is a placeholder for a future typed HTTP client SDK. It exports an empty module for now but is included in the exports map so that the path is reserved and consumers will not break when it is implemented.
- The `testing/` submodule is excluded from the root barrel export. Consumers must explicitly import from `@prmichaelsen/goodneighbor-core/testing`. This is intentional -- test utilities should not pollute the main import namespace.
- Runtime dependencies (firebase-admin, algoliasearch, zod) are marked as `external` in esbuild so they are not bundled into the output. Consumers must install them as peer dependencies or direct dependencies.
- If the project eventually needs to support browser environments, a separate browser build target would be needed. For now, the target is `node18` only.
- The `bundle: false` setting means each source file is compiled individually without inlining imports. This is the correct approach for a library (consumers handle their own bundling).

---

**Next Task**: [Task 28: Integration Tests](./task-28-integration-tests.md)
**Related Design Docs**: `agent/design/local.goodneighbor-core.md`, `agent/design/requirements.md`
**Estimated Completion Date**: TBD
