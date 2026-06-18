import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    assetsInlineLimit: 0, // Keep assets as separate files
    chunkSizeWarningLimit: 1500
  }
});
