import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// Disable TypeScript checking for this specific line due to
// compatibility issues between different versions of Vite in the project

export default defineConfig({
  // @ts-expect-error - Incompatible Vite plugin types between different versions
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '.yarn/', 'dist/', '**/*.d.ts', 'test/', '**/*.config.*'],
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@features': resolve(__dirname, './src/features'),
      '@components': resolve(__dirname, './src/core/components'),
      '@hooks': resolve(__dirname, './src/core/hooks'),
      '@utils': resolve(__dirname, './src/utils'),
      '@config': resolve(__dirname, './src/config'),
      '@services': resolve(__dirname, './src/services'),
    },
  },
});
