import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/'],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@core': '/src/core',
      '@skills': '/src/skills',
      '@tools': '/src/tools',
      '@mcp': '/src/mcp',
      '@plugins': '/src/plugins',
    },
  },
});
