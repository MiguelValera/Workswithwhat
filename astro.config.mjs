import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// lastmod per device page, from the record's updatedAt
const deviceDir = new URL('./src/data/devices/', import.meta.url);
const lastmod = new Map(
  readdirSync(deviceDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const d = JSON.parse(readFileSync(new URL(f, deviceDir), 'utf8'));
      const section = { 'smart-plug': 'smart-plugs', 'smart-bulb': 'smart-bulbs' }[d.category];
      return [`/${section}/${f.replace(/\.json$/, '')}/`, d.status === 'verified' ? d.updatedAt : null];
    }),
);
const newest = [...lastmod.values()].filter(Boolean).sort().at(-1);

export default defineConfig({
  site: 'https://workswithwhat.com',
  trailingSlash: 'always',
  // external CSS only, so the CSP can forbid inline styles
  build: { inlineStylesheets: 'never' },
  integrations: [
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname;
        const date = lastmod.get(path) ?? newest;
        if (date) item.lastmod = new Date(`${date}T00:00:00Z`).toISOString();
        return item;
      },
    }),
  ],
});
