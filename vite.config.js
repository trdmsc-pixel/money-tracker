import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    port: 3000,
    host: true,
  },
});
