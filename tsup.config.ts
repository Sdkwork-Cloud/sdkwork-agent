import { defineConfig } from 'tsup';

// ============================================================================
// SDKWork Agent - 极致优化的构建配置
// ============================================================================

// 通用构建配置
const commonConfig = {
  entry: {
    index: 'src/index.ts',
    'llm/index': 'src/llm/index.ts',
    'skills/index': 'src/skills/index.ts',
    'tools/index': 'src/tools/index.ts',
    'mcp/index': 'src/mcp/index.ts',
    'storage/index': 'src/storage/index.ts',
  },
  // 启用类型定义生成，提供完整的类型支持
  dts: {
    resolve: true,
    // 忽略类型错误，确保构建成功
    compilerOptions: {
      composite: false,
    },
  },
  splitting: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
  // 启用代码压缩
  minify: true,
  // 保留注释中的 @license 和 @preserve
  banner: {
    js: '/*! SDKWork Agent - Industry Leading Agent Framework | MIT License */',
  },
  // 优化 chunk 分割策略
  treeshake: true,
} as const;

// 浏览器端构建配置
export const browserConfig = defineConfig({
  ...commonConfig,
  format: ['esm'],
  platform: 'browser',
  outDir: 'dist/browser',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: [
    // 浏览器环境不需要的 Node.js 内置模块
    'fs/promises',
    'fs',
    'path',
    'child_process',
    'util',
    'node:vm',
    'node:fs',
    'node:path',
    'node:child_process',
    'node:util',
    'events',
    'stream',
    'crypto',
    'os',
    'http',
    'https',
    'net',
    'tls',
    'zlib',
    'url',
    'querystring',
    'punycode',
    'dgram',
    'dns',
    'cluster',
    'module',
    'vm',
    'worker_threads',
    'perf_hooks',
    'async_hooks',
    'timers',
    'timers/promises',
    // 外部依赖
    'uuid',
    'zod',
    '@modelcontextprotocol/sdk',
  ],
  // 浏览器端代码优化
  esbuildOptions: (options) => {
    options.drop = ['console', 'debugger'];
    options.pure = ['console.log', 'console.info', 'console.debug'];
  },
});

// Node.js 端构建配置
export const nodeConfig = defineConfig({
  ...commonConfig,
  format: ['cjs', 'esm'],
  platform: 'node',
  outDir: 'dist/node',
  external: [
    // 外部依赖 - 不打包进输出
    'zod',
    'uuid',
    '@modelcontextprotocol/sdk',
  ],
  // Node.js 端保留 console
  esbuildOptions: (options) => {
    options.keepNames = true;
  },
});

// 默认导出 - 同时构建浏览器和 Node.js 版本
export default defineConfig([
  browserConfig,
  nodeConfig,
]);
