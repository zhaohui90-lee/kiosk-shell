import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/__tests__/**'],
    },
    deps: {
      inline: ['@kiosk/logger', '@kiosk/platform'],
    },
  },
  resolve: {
    alias: {
      '@kiosk/logger': path.resolve(__dirname, '../logger/src/index.ts'),
      '@kiosk/platform': path.resolve(__dirname, '../platform/src/index.ts'),
    },
  },
});
