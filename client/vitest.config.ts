import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Separate from vite.config.ts on purpose: keeps `vite build` unaffected until
// the test devDependencies below are installed (`npm install -D vitest
// @testing-library/react @testing-library/jest-dom jsdom`), at which point
// `npm test` picks this file up automatically.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
