import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Next.js "server-only" sentinel is a runtime no-op but trips
      // vitest's module resolver. Alias to an empty shim so server-side
      // modules import cleanly in tests.
      'server-only': path.resolve(__dirname, './vitest.shims/server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
})
