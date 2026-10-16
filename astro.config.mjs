import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import { ACTIVE_LANGS, localize } from './src/i18n/lang.ts';

// category → English URL section (mirrors src/lib/categories.ts); localize() gives the other languages
const SECTIONS = {
  'smart-plug': 'smart-plugs',
  'smart-bulb': 'smart-bulbs',
  'smart-lock': 'smart-locks',
  'smart-thermostat': 'smart-thermostats',
  'smart-sensor': 'smart-sensors',
  'smart-camera': 'smart-cameras',
  'smart-switch': 'smart-switches',
  'robot-vacuum': 'robot-vacuums',
  'smart-hub': 'smart-hubs',
  'light-strip': 'light-strips',
};

// lastmod per device page (every language), from the record's updatedAt
const deviceDir = new URL('./src/data/devices/', import.meta.url);
const lastmod = new Map(
  readdirSync(deviceDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      const d = JSON.parse(readFileSync(new URL(f, deviceDir), 'utf8'));
      const path = `/${SECTIONS[d.category]}/${f.replace(/\.json$/, '')}/`;
      const date = d.status === 'verified' ? d.updatedAt : null;
      return ACTIVE_LANGS.map((l) => [localize(path, l), date]);
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
        // noindex pages (comparisons beyond each device's closest rivals) stay out of the sitemap;
        // serialize runs at astro:build:done, so every page's HTML is already in dist/
        const html = new URL(`./dist${path}index.html`, import.meta.url);
        if (existsSync(html) && readFileSync(html, 'utf8').includes('<meta name="robots" content="noindex"')) return undefined;
        const date = lastmod.get(path) ?? newest;
        if (date) item.lastmod = new Date(`${date}T00:00:00Z`).toISOString();
        return item;
      },
    }),
  ],
});
