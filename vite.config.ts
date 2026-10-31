import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from a subpath (/AI-Chan-Deck-Builder/), so
  // assets must be referenced with the repo name as the base.
  base: '/AI-Chan-Deck-Builder/',
  server: {
    port: 5173,
    host: true,
  },
});
