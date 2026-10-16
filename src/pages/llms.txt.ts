import type { APIRoute } from 'astro';
import { ECOSYSTEMS, ECOSYSTEM_LABELS, devicePath, ecosystemPath, getActiveCategories, getPublishedDevices, worksWith } from '../lib/devices';
import { ACTIVE_LANGS, localize } from '../i18n/lang';
import { byMarket, getActiveMarkets, getRegionPages } from '../lib/markets';
import { compareName, comparePath, getComparisons } from '../lib/compare';

// llms.txt (https://llmstxt.org): a plain map of the site for AI assistants.
export const GET: APIRoute = async ({ site }) => {
  const devices = await getPublishedDevices();
  const url = (p: string) => new URL(p, site).href;
  const cats = await getActiveCategories();
  const regionPages = await getRegionPages();
  const markets = await getActiveMarkets();
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
    ...markets.map((m) => `- [${m.label} devices as JSON](${url(`/api/${m.key}/devices.json`)}): only models sold in ${m.phrase}; per category at /api/${m.key}/<category>.json`),
    `- [Full text for LLMs](${url('/llms-full.txt')}): every device page as Markdown`,
    `- [How we verify](${url('/methodology/')}): sourcing rules and label definitions`,
    ...ACTIVE_LANGS.filter((l) => l !== 'en').map((l) => {
      const name = { es: 'Spanish', de: 'German', fr: 'French', it: 'Italian' }[l];
      const where = l === 'es' ? ' (Spain)' : '';
      return `- [${name} version](${url(`/${l}/`)}): the same pages and data in ${name}${where}, under /${l}/ with ${name} paths, e.g. ${url(localize('/smart-plugs/', l))}`;
    }),
    '',
  ];
  lines.push(
    '## By region',
    '',
    'Models differ between regions (plug types, radios, certifications), so every list is split by market. A record belongs to one market.',
    '',
    ...regionPages.map(({ market, path }) => `- [${market.label}: ${path}](${url(path)})`),
    '',
  );
  for (const c of cats) {
    lines.push(`## ${c.label}`, '', `- [${c.label} compatibility chart](${url(`/${c.path}/`)})`, '');
    for (const g of byMarket(devices.filter((d) => d.data.category === c.key))) {
      lines.push(`### ${c.label} for ${g.market.phrase}`, '');
      for (const d of g.devices) {
        const works = ECOSYSTEMS.filter((e) => worksWith(d, e)).map((e) => ECOSYSTEM_LABELS[e]);
        const model = d.data.model.startsWith(d.data.brand) ? d.data.model : `${d.data.brand} ${d.data.model}`;
        lines.push(`- [${d.data.name}](${url(devicePath(d))}): ${model} (${d.data.regions.join('/')}); works with ${works.join(', ') || 'no confirmed ecosystem'}`);
      }
      lines.push('');
    }
  }
  lines.push(
    '## By ecosystem',
    '',
    ...ECOSYSTEMS.map((e) => `- [Devices that work with ${ECOSYSTEM_LABELS[e]}](${url(ecosystemPath(e))})`),
    `- [Matter devices](${url('/works-with/matter/')}): Matter-certified devices split by Wi-Fi and Thread`,
    '',
  );
  const comparisons = (await getComparisons()).filter((c) => c.indexed);
  lines.push(
    '## Comparisons',
    '',
    `Head-to-head pages for two devices of the same category and market, with every ecosystem, Matter and spec side by side. [All comparisons](${url('/compare/')})`,
    '',
    ...comparisons.map((c) => `- [${compareName(c)}](${url(comparePath(c))})`),
    '',
  );
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
