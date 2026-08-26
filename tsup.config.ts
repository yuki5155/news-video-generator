import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts', polly: 'src/narration/pollyProvider.ts', cli: 'src/cli.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    // 'cli.ts' starts with its own `#!/usr/bin/env node` shebang, which esbuild
    // preserves automatically at the top of an entry file.
    external: ['three', '@aws-sdk/client-polly', 'playwright'],
  },
  {
    // Standalone browser bundle the CLI serves for `generate --record` (see
    // startRendererServer in cli.ts) so recording never depends on a
    // consumer having their own dev server running — three.js is inlined
    // here (rather than external, unlike the config above) since there's no
    // host app to provide it.
    entry: { 'browser-renderer/main': 'src/browser-renderer/main.ts' },
    format: ['iife'],
    platform: 'browser',
    dts: false,
    sourcemap: false,
    clean: false,
    noExternal: ['three'],
  },
])
