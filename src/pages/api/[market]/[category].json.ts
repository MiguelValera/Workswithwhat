import type { APIRoute, GetStaticPaths } from 'astro';
import { CATEGORIES, type Category } from '../../../lib/categories';
import { apiRecord } from '../../../lib/api';
import { MARKETS, getMarketDevices, regionPath, type Market } from '../../../lib/markets';

// /api/us/smart-plugs.json … one category for one market, wherever the market has any.
export const getStaticPaths = (async () => {
  const paths = [];
  for (const market of MARKETS) {
    const devices = await getMarketDevices(market);
    for (const cat of CATEGORIES)
      if (devices.some((d) => d.data.category === cat.key)) paths.push({ params: { market: market.key, category: cat.path }, props: { market, cat } });
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, site }) => {
  const { market, cat } = props as { market: Market; cat: Category };
  const devices = (await getMarketDevices(market)).filter((d) => d.data.category === cat.key);
  const page = (await regionPath(market, `/${cat.path}/`)) ?? `/${cat.path}/#${market.key}`;
  const body = {
    name: `Workswithwhat ${cat.singular} compatibility for ${market.phrase}`,
    market: market.key,
    url: new URL(page, site).href,
    methodology: new URL('/methodology/', site).href,
    count: devices.length,
    devices: devices.map((d) => apiRecord(d, site!)),
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json' } });
};
