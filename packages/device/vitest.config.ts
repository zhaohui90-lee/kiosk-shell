import { defineConfig } from 'vitest/config'
import * as path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@kiosk/logger', '@kiosk/shared'],
      },
    },
  },
  resolve: {
    alias: {
      '@kiosk/logger': path.resolve(__dirname, '../../packages/logger/src/index.ts'),
      '@kiosk/shared': path.resolve(__dirname, '../../packages/shared/index.ts'),
    },
  },
})
