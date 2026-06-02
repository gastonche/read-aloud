import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/extension/src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['{apps,packages}/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
