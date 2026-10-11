import type { APIRoute } from 'astro';
import { ECOSYSTEMS, ECOSYSTEM_LABELS, devicePath, ecosystemSlug, getPublishedDevices, worksWith } from '../lib/devices';
import { CATEGORIES } from '../lib/categories';

// llms.txt (https://llmstxt.org): a plain map of the site for AI assistants.
export const GET: APIRoute = async ({ site }) => {
  const devices = await getPublishedDevices();
  const url = (p: string) => new URL(p, site).href;
  const cats = CATEGORIES.filter((c) => devices.some((d) => d.data.category === c.key));
  const lines = [
    '# Workswithwhat',
    '',
    '> Smart-home compatibility reference. For each device it answers which ecosystems it works with (Apple Home, Google Home, Amazon Alexa, SmartThings, Home Assistant), whether that is direct, via Matter or via a hub, and links every claim to an official source. Only records that passed an independent verification pass are published.',
    '',
    'Status meanings: "native" = works through the brand\'s own integration; "matter" = works because the device is Matter-certified; "hub" = works only through the named bridge; "no" = a source says it is not supported; "unknown" = no official source either way.',
    '',
    '## Data',
    '',
    `- [All devices as JSON](${url('/api/devices.json')}): every published record with statuses, notes, facts, sources and a ready-made answer per ecosystem`,
    ...cats.map((c) => `- [${c.label} as JSON](${url(`/api/${c.path}.json`)})`),
    `- [Full text for LLMs](${url('/llms-full.txt')}): every device page as Markdown`,
    `- [How we verify](${url('/methodology/')}): sourcing rules and label definitions`,
    '',
  ];
  for (const c of cats) {
    lines.push(`## ${c.label}`, '', `- [${c.label} compatibility chart](${url(`/${c.path}/`)})`);
    for (const d of devices.filter((d) => d.data.category === c.key)) {
      const works = ECOSYSTEMS.filter((e) => worksWith(d, e)).map((e) => ECOSYSTEM_LABELS[e]);
      const model = d.data.model.startsWith(d.data.brand) ? d.data.model : `${d.data.brand} ${d.data.model}`;
      lines.push(`- [${d.data.name}](${url(devicePath(d))}): ${model} (${d.data.regions.join('/')}); works with ${works.join(', ') || 'no confirmed ecosystem'}`);
    }
    lines.push('');
  }
  lines.push(
    '## By ecosystem',
    '',
    ...ECOSYSTEMS.map((e) => `- [Devices that work with ${ECOSYSTEM_LABELS[e]}](${url(`/works-with/${ecosystemSlug(e)}/`)})`),
    `- [Matter devices](${url('/works-with/matter/')}): Matter-certified devices split by Wi-Fi and Thread`,
    '',
  );
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
