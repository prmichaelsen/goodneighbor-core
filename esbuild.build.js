import esbuild from 'esbuild'
import { execSync } from 'child_process'

const entryPoints = [
  'src/index.ts',
  'src/services/index.ts',
  'src/constants/collections.ts',
  'src/errors/app-errors.ts',
  'src/errors/base.error.ts',
  'src/config/schema.ts',
  'src/config/loader.ts',
  'src/config/firebase.ts',
  'src/config/algolia.ts',
  'src/config/secrets.ts',
  'src/i18n/index.ts',
  'src/container.ts',
  'src/clients/svc/v1/index.ts',
  'src/adapter/index.ts',
]

const sharedConfig = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
  external: [
    '@prmichaelsen/firebase-admin-sdk-v8',
    'algoliasearch',
    'zod',
    'jsonwebtoken',
  ],
}

// Build all entry points in one call to preserve directory structure
await esbuild.build({
  ...sharedConfig,
  entryPoints,
  outdir: 'dist',
  outbase: 'src',
  outExtension: { '.js': '.js' },
})

// Generate TypeScript declarations
console.log('Generating TypeScript declarations...')
execSync('tsc --emitDeclarationOnly --declaration --declarationMap', {
  stdio: 'inherit',
})

console.log('Build complete!')
