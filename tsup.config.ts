import { defineConfig } from 'tsup';
import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'llm/index': 'src/llm/index.ts',
    'skills/index': 'src/skills/index.ts',
    'tools/index': 'src/tools/index.ts',
    'mcp/index': 'src/mcp/index.ts',
    'storage/index': 'src/storage/index.ts',
    'tui/cli': 'src/tui/cli.ts',
    'agent/index': 'src/agent/index.ts',
  },
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
    },
  },
  format: ['esm', 'cjs'],
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
  minify: false,
  platform: 'node',
  banner: {
    js: '/*! SDKWork Agent v3.0.0 - Powerful Node.js Backend Agent Framework | MIT License */',
  },
  treeshake: true,
  shims: true,
  external: [
    'zod',
    'uuid',
    '@modelcontextprotocol/sdk',
  ],
  esbuildOptions: (options) => {
    options.keepNames = true;
  },
  cjsInterop: true,
  output: {
    exports: 'named',
  },
  async onSuccess() {
    const srcDir = join(process.cwd(), 'src', 'skills', 'builtin');
    const destDir = join(process.cwd(), 'dist', 'skills', 'builtin');
    if (existsSync(srcDir)) {
      cpSync(srcDir, destDir, { recursive: true });
      console.log('✓ Copied builtin skills to dist/skills/builtin');
    }
  },
});
