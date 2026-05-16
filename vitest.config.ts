import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./app/test/setup.ts'],
    typecheck: {
      include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/playwright-tests/**', // Exclude Playwright tests
      '**/test-results/**',
      '**/playwright-report/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'playwright-tests/**', // Playwright tests
        'voroforce/**', // Skip WebGL engine for now
      ],
    },
    alias: {
      '@': '/app',
      '√': '/voroforce',
    },
  },
  resolve: {
    alias: {
      '@': '/app',
      '√': '/voroforce',
    },
  },
})
