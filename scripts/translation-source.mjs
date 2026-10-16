// Prints what a translator has to translate, one compact JSON object per record:
// basedOn, summary, caveats, every note (by translation key), via for hub entries and
// text values. Facts and sources are left out; they never change in a translation.
//   node scripts/translation-source.mjs <lang> [slug …]   (no slugs: every verified record missing in src/data/i18n/<lang>/)
//   node scripts/translation-source.mjs <lang> --all
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { CATEGORY_FACTS } from '../src/schema/device.ts';
import { TRANSLATABLE_VALUES } from '../src/schema/translation.ts';

const [lang, ...args] = process.argv.slice(2);
if (!lang) {
  console.error('usage: node scripts/translation-source.mjs <lang> [slug …|--all]');
  process.exit(1);
}
const dir = new URL('../src/data/devices/', import.meta.url);
const all = (await readdir(dir)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
const slugs = args.length && args[0] !== '--all' ? args : all;
for (const slug of slugs) {
  const d = JSON.parse(await readFile(new URL(`${slug}.json`, dir), 'utf8'));
  if (!args.length && (d.status !== 'verified' || existsSync(new URL(`../src/data/i18n/${lang}/${slug}.json`, import.meta.url)))) continue;
  const facts = { radios: d.radios, matter: d.matter, hubRequired: d.hubRequired, localControl: d.localControl };
  for (const k of CATEGORY_FACTS[d.category]) facts[k] = d[k];
  for (const [e, c] of Object.entries(d.compatibility)) facts[`compatibility.${e}`] = c;
  const notes = Object.fromEntries(Object.entries(facts).filter(([, f]) => f?.note).map(([k, f]) => [k, f.note]));
  const via = Object.fromEntries(Object.entries(d.compatibility).filter(([, c]) => c.status === 'hub' && c.via).map(([e, c]) => [e, c.via]));
  const values = Object.fromEntries(
    TRANSLATABLE_VALUES.filter((k) => typeof d[k]?.value === 'string' && /[a-z]{2}/i.test(d[k].value)).map((k) => [k, d[k].value]),
  );
  const out = { slug, name: d.name, category: d.category, basedOn: d.updatedAt, summary: d.summary, caveats: d.caveats, notes };
  if (Object.keys(via).length) out.via = via;
  if (Object.keys(values).length) out.values = values;
  console.log(JSON.stringify(out));
}
