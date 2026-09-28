import { defineConfig } from 'vite';

// SINGLE=1 builds only the game, as one self-contained file (for sharing as a single page).
const single = process.env.SINGLE === '1';

export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    outDir: single ? 'dist-single' : 'dist',
    // The single file carries its font inside it, since it has no folder to load one from.
    assetsInlineLimit: single ? 200000 : 4096,
    // Site build: the landing page, the game at /play, and the private dashboard, which the worker serves only behind the password.
    rollupOptions: single
      ? { input: { play: 'play.html' }, output: { inlineDynamicImports: true } }
      : { input: { index: 'index.html', play: 'play.html', analytics: 'analytics.html' } },
  },
});
