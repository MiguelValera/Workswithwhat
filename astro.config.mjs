import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://workswithwhat.com',
  trailingSlash: 'always',
  // external CSS only, so the CSP can forbid inline styles
  build: { inlineStylesheets: 'never' },
  integrations: [sitemap()],
});
