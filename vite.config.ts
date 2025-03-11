import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@features': resolve(__dirname, './src/features'),
      '@components': resolve(__dirname, './src/core/components'),
      '@hooks': resolve(__dirname, './src/core/hooks'),
      '@utils': resolve(__dirname, './src/utils'), // Fixed - was incorrectly pointing to src/core/utils
      '@config': resolve(__dirname, './src/config'),
      '@services': resolve(__dirname, './src/services'),
      '@types': resolve(__dirname, './src/types'), // Added missing alias
      '@assets': resolve(__dirname, './src/assets'), // Added missing alias
      '@test': resolve(__dirname, './src/test'), // Added missing alias
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
});
