import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// category → [English, Spanish] URL section (mirrors src/lib/categories.ts and src/i18n/lang.ts)
const SECTIONS = {
  'smart-plug': ['smart-plugs', 'enchufes-inteligentes'],
  'smart-bulb': ['smart-bulbs', 'bombillas-inteligentes'],
  'smart-lock': ['smart-locks', 'cerraduras-inteligentes'],
  'smart-thermostat': ['smart-thermostats', 'termostatos-inteligentes'],
  'smart-sensor': ['smart-sensors', 'sensores-inteligentes'],
  'smart-camera': ['smart-cameras', 'camaras-y-timbres'],
  'smart-switch': ['smart-switches', 'interruptores-inteligentes'],
  'robot-vacuum': ['robot-vacuums', 'robots-aspiradores'],
  'smart-hub': ['smart-hubs', 'hubs-y-pasarelas'],
  'light-strip': ['light-strips', 'tiras-led'],
};

// lastmod per device page (both languages), from the record's updatedAt
const deviceDir = new URL('./src/data/devices/', import.meta.url);
const lastmod = new Map(
  readdirSync(deviceDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const d = JSON.parse(readFileSync(new URL(f, deviceDir), 'utf8'));
      const slug = f.replace(/\.json$/, '');
      const date = d.status === 'verified' ? d.updatedAt : null;
      const [en, es] = SECTIONS[d.category];
      return [
        [`/${en}/${slug}/`, date],
        [`/es/${es}/${slug}/`, date],
      ];
    })
    .flat(),
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
