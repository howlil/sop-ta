import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { clientTopologyAliases } from './topology-aliases'

export default defineConfig({
  resolve: {
    alias: clientTopologyAliases,
  },
  plugins: [
    react(),
    tsconfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/__tests__/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.tanstack', 'src/routes', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/routes/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mocks/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'coverage/',
        'dist/',
        '**/*.gen.ts',
        '**/generated/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    clearMocks: true,
  },
  esbuild: {
    target: 'es2020',
  },
})
