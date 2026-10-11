import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { deviceSchema } from './schema/device.ts';
import { translationSchema } from './schema/translation.ts';

const devices = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/data/devices' }),
  schema: deviceSchema,
});

// Spanish prose for device records (same slug); see src/schema/translation.ts
const devicesEs = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/data/i18n/es' }),
  schema: translationSchema,
});

export const collections = { devices, devicesEs };
