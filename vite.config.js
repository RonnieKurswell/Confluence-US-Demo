import { defineConfig } from 'vite';

// Relative base so the built demo runs from a USB stick / file server at the
// booth without needing a specific host path.
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
