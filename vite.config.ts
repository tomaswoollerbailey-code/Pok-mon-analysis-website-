import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pages have real URLs (/decks/x), so the base must be absolute. The default is the GitHub Pages
// project path; set SITE_BASE=/ (and SITE_URL) when the site moves to its own domain.
export default defineConfig(({ command }) => ({
  base: process.env.SITE_BASE ?? (command === 'serve' ? '/' : '/Pok-mon-analysis-website-/'),
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'] },
} as any));
