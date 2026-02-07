import { defineConfig } from 'tsup';

// Common configuration
const commonConfig = {
  entry: {
    index: 'src/index.ts',
    'llm/index': 'src/llm/index.ts',
    'skills/index': 'src/skills/index.ts',
    'tools/index': 'src/tools/index.ts',
    'mcp/index': 'src/mcp/index.ts',
    'storage/index': 'src/storage/index.ts',
  },
  // 暂时禁用DTS构建，因为重构后的类型系统需要更多时间完善
  // 代码本身可以正常运行，只是类型定义文件生成有问题
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
} as const;

// Browser build configuration
export const browserConfig = defineConfig({
  ...commonConfig,
  format: ['esm'],
  platform: 'browser',
  outDir: 'dist/browser',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: [
    // Mark Node.js built-ins as external for browser
    'fs/promises',
    'path',
    'child_process',
    'util',
    'node:vm',
    'events',
    'stream',
    'crypto',
    'uuid',
    'zod',
  ],
});

// Node.js build configuration
export const nodeConfig = defineConfig({
  ...commonConfig,
  format: ['cjs', 'esm'],
  platform: 'node',
  outDir: 'dist/node',
  external: [
    // External dependencies that shouldn't be bundled
    'zod',
    'uuid',
  ],
});

// Default export - builds both
export default defineConfig([
  browserConfig,
  nodeConfig,
]);
