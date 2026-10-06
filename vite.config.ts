import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Preview runs behind the *.e2b.app proxy; allow it explicitly.
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: 'wss' },
  },
  build: { target: 'es2022', cssTarget: 'chrome100' },
  test: {
    // Pure logic runs in node; DOM integration tests opt in per file via
    // the `@vitest-environment jsdom` docblock.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
} as never);
