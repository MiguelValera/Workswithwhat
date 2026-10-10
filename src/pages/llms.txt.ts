import type { APIRoute } from 'astro';
import { ECOSYSTEMS, ECOSYSTEM_LABELS, ecosystemSlug, getPublishedDevices, worksWith } from '../lib/devices';

// llms.txt (https://llmstxt.org): a plain map of the site for AI assistants.
export const GET: APIRoute = async ({ site }) => {
  const devices = await getPublishedDevices();
  const url = (p: string) => new URL(p, site).href;
  const lines = [
    '# Workswithwhat',
    '',
    '> Smart-home compatibility reference. For each device it answers which ecosystems it works with (Apple Home, Google Home, Amazon Alexa, SmartThings, Home Assistant), whether that is direct, via Matter or via a hub, and links every claim to an official source. Only records that passed an independent verification pass are published.',
    '',
    'Status meanings: "native" = works through the brand\'s own integration; "matter" = works because the device is Matter-certified; "hub" = works only through the named bridge; "no" = a source says it is not supported; "unknown" = no official source either way.',
    '',
    '## Data',
    '',
    `- [All smart plug data as JSON](${url('/api/smart-plugs.json')}): every published record with statuses, notes, facts and sources`,
    `- [Full text for LLMs](${url('/llms-full.txt')}): every device page as Markdown`,
    `- [How we verify](${url('/methodology/')}): sourcing rules and label definitions`,
    '',
    '## Smart plugs',
    '',
    ...devices.map((d) => {
      const works = ECOSYSTEMS.filter((e) => worksWith(d, e)).map((e) => ECOSYSTEM_LABELS[e]);
      return `- [${d.data.name}](${url(`/smart-plugs/${d.id}/`)}): ${d.data.model.startsWith(d.data.brand) ? d.data.model : `${d.data.brand} ${d.data.model}`} (${d.data.regions.join('/')}); works with ${works.join(', ') || 'no confirmed ecosystem'}`;
    }),
    '',
    '## By ecosystem',
    '',
    ...ECOSYSTEMS.map((e) => `- [Smart plugs that work with ${ECOSYSTEM_LABELS[e]}](${url(`/works-with/${ecosystemSlug(e)}/`)})`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
