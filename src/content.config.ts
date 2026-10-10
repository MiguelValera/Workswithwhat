import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { deviceSchema } from './schema/device.ts';

const devices = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/data/devices' }),
  schema: deviceSchema,
});

export const collections = { devices };
