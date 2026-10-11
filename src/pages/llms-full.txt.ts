import type { APIRoute } from 'astro';
import { ECOSYSTEMS, ECOSYSTEM_LABELS, RADIO_LABELS, answerFor, devicePath, getPublishedDevices } from '../lib/devices';
import { categoryOf, specFacts } from '../lib/categories';
import { marketOf } from '../lib/markets';

const fact = (label: string, v: unknown, note?: string) =>
  `- ${label}: ${v === null ? 'unconfirmed' : v === true ? 'yes' : v === false ? 'no' : String(v)}${note ? ` (${note})` : ''}`;

// Every published device as Markdown, so an assistant can answer from one fetch.
export const GET: APIRoute = async ({ site }) => {
  const devices = await getPublishedDevices();
  const out = [
    '# Workswithwhat: smart home compatibility (full text)',
    '',
    `Source: ${new URL('/', site).href} · Every claim below is backed by the listed sources. "Unconfirmed" means no official source either way.`,
    '',
  ];
  for (const dev of devices) {
    const d = dev.data;
    out.push(
      `## ${d.name}`,
      '',
      `URL: ${new URL(devicePath(dev), site).href}`,
      `Category: ${categoryOf(d).singular} · Brand: ${d.brand} · Model: ${d.model} · Market: ${marketOf(dev).label} (${d.regions.join(', ')}) · Verified: ${d.verifiedAt ?? 'n/a'}`,
      ...(d.variants?.length ? [`Other regions: ${d.variants.map((v) => new URL(`/${categoryOf(d).path}/${v}/`, site).href).join(', ')}`] : []),
      '',
      d.summary,
      '',
      '### Compatibility',
      '',
      `- Matter: ${d.matter.certified === null ? 'unconfirmed' : d.matter.certified ? `yes (${d.matter.transport})` : 'no'}`,
      ...ECOSYSTEMS.map((e) => `- ${ECOSYSTEM_LABELS[e]}: ${answerFor(dev, e)}`),
      '',
      '### Specs',
      '',
      fact('Radios', d.radios.value?.map((r) => RADIO_LABELS[r]).join(', ') ?? null, d.radios.note),
      fact('Hub required', d.hubRequired.value, d.hubRequired.note),
      fact('Local control', d.localControl.value, d.localControl.note),
      ...specFacts(d).map((s) => `- ${s.label}: ${s.text}${s.fact.note ? ` (${s.fact.note})` : ''}`),
      '',
    );
    if (d.caveats.length) out.push('### Before you buy', '', ...d.caveats.map((c) => `- ${c}`), '');
    out.push('### Sources', '', ...d.sources.map((s) => `- [${s.title}](${s.url}) (${s.publisher}, ${s.kind})`), '');
  }
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
