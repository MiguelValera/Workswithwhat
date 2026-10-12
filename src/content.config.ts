import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { deviceSchema } from './schema/device.ts';
import { translationSchema } from './schema/translation.ts';
import { LOCALE_LANGS } from './i18n/lang';

const devices = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/data/devices' }),
  schema: deviceSchema,
});

// Translated prose for device records, one collection per language (same slug as the
// English record): src/data/i18n/<lang>/; see src/schema/translation.ts
const translations = Object.fromEntries(
  LOCALE_LANGS.map((l) => [
    `devices_${l}`,
    defineCollection({ loader: glob({ pattern: '*.json', base: `./src/data/i18n/${l}` }), schema: translationSchema }),
  ]),
);

export const collections = { devices, ...translations };
