import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    // The private dashboard is a second page; the worker serves it only behind the password.
    rollupOptions: { input: { index: 'index.html', analytics: 'analytics.html' } },
  },
});
