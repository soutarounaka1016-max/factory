import { defineConfig } from 'vite';

export default defineConfig({
  base: '/factory/',
  build: { outDir: 'dist', sourcemap: true },
  test: { environment: 'node', include: ['tests/unit/**/*.test.js'] },
});