import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedDevices } from '../../lib/devices';
import { CATEGORIES, type Category } from '../../lib/categories';
import { apiRecord } from '../../lib/api';

// /api/smart-plugs.json, /api/smart-bulbs.json … Drafts are never included.
export const getStaticPaths = (async () => {
  const paths = [];
  for (const cat of CATEGORIES) {
    if ((await getPublishedDevices(cat.key)).length) paths.push({ params: { category: cat.path }, props: { cat } });
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, site }) => {
  const { cat } = props as { cat: Category };
  const devices = await getPublishedDevices(cat.key);
  const body = {
    name: `Workswithwhat ${cat.singular} compatibility`,
    url: new URL(`/${cat.path}/`, site).href,
    methodology: new URL('/methodology/', site).href,
    count: devices.length,
    devices: devices.map((d) => apiRecord(d, site!)),
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json' } });
};
