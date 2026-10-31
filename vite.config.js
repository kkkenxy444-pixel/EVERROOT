import { defineConfig } from 'vite';

// Vite config tuned for Termux/Android testing:
// - base './' so the build works from any sub-path / file server.
// - host true so `npm run dev -- --host` (or plain `npm run dev`) is reachable from the phone browser.
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0, // never inline game assets as base64
    // Phaser itself is ~1.2 MB minified; that is expected for a Phaser game.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
