import type { APIRoute } from 'astro';
import { getPublishedDevices } from '../../lib/devices';
import { apiRecord } from '../../lib/api';

// Every published device, all categories.
export const GET: APIRoute = async ({ site }) => {
  const devices = await getPublishedDevices();
  const body = {
    name: 'Workswithwhat smart home compatibility',
    url: site!.href,
    methodology: new URL('/methodology/', site).href,
    count: devices.length,
    devices: devices.map((d) => apiRecord(d, site!)),
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
};
