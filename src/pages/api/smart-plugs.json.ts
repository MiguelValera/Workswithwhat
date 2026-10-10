import type { APIRoute } from 'astro';
import { ECOSYSTEMS, answerFor, getPublishedDevices } from '../../lib/devices';

// Static JSON for agents and tools: the published records plus a ready-made
// answer per ecosystem. Drafts are never included.
export const GET: APIRoute = async ({ site }) => {
  const devices = await getPublishedDevices();
  const body = {
    name: 'Workswithwhat smart plug compatibility',
    url: new URL('/smart-plugs/', site).href,
    methodology: new URL('/methodology/', site).href,
    count: devices.length,
    devices: devices.map((dev) => {
      const { status: _status, ...data } = dev.data;
      return {
        slug: dev.id,
        url: new URL(`/smart-plugs/${dev.id}/`, site).href,
        ...data,
        answers: Object.fromEntries(ECOSYSTEMS.map((e) => [e, answerFor(dev, e)])),
      };
    }),
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json' } });
};
