import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// ReadAloud marketing site. Static output (no SSR) so it deploys anywhere —
// Cloudflare Pages, Netlify, or any static host. Tailwind v4 is wired through
// its Vite plugin to match the rest of the monorepo's toolchain.
export default defineConfig({
  site: 'https://readaloud.app',
  vite: {
    plugins: [tailwindcss()],
  },
});
