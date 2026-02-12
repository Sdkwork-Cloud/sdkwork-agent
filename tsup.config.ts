import { defineConfig } from 'tsup';

// ============================================================================
// SDKWork Agent - Node.js 专用构建配置
// ============================================================================

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
  // 生成类型定义
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
    },
  },
  // 输出格式：ESM 和 CommonJS
  format: ['esm', 'cjs'],
  // 代码分割
  splitting: true,
  // 生成 sourcemap
  sourcemap: true,
  // 清理输出目录
  clean: true,
  // 目标平台
  target: 'es2022',
  // 输出目录
  outDir: 'dist',
  // 代码压缩
  minify: false,
  // 平台：Node.js
  platform: 'node',
  // 保留注释
  banner: {
    js: '/*! SDKWork Agent v3.0.0 - Powerful Node.js Backend Agent Framework | MIT License */',
  },
  // Tree shaking
  treeshake: true,
  // 外部依赖（不打包进输出）
  external: [
    'zod',
    'uuid',
    '@modelcontextprotocol/sdk',
  ],
  // esbuild 选项
  esbuildOptions: (options) => {
    options.keepNames = true;
  },
});
