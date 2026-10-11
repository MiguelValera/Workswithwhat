import type { APIRoute, GetStaticPaths } from 'astro';
import { apiRecord } from '../../../lib/api';
import { MARKETS, getMarketDevices, type Market } from '../../../lib/markets';

// /api/us/devices.json, /api/eu/devices.json … every published device for one market.
export const getStaticPaths = (async () => {
  const paths = [];
  for (const market of MARKETS) if ((await getMarketDevices(market)).length) paths.push({ params: { market: market.key }, props: { market } });
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, site }) => {
  const { market } = props as { market: Market };
  const devices = await getMarketDevices(market);
  const body = {
    name: `Workswithwhat smart home compatibility for ${market.phrase}`,
    market: market.key,
    url: new URL(`/${market.key}/`, site).href,
    methodology: new URL('/methodology/', site).href,
    count: devices.length,
    devices: devices.map((d) => apiRecord(d, site!)),
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json' } });
};
