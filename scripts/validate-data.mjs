// Validates every device JSON against the shared schema. Runs before each build
// and in CI; exits non-zero on the first broken record set.
import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { deviceSchema, CATEGORY_FACTS } from '../src/schema/device.ts';
import { translationSchema } from '../src/schema/translation.ts';
import { ES_ENABLED } from '../src/site.config.ts';

const dir = new URL('../src/data/devices/', import.meta.url);
const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
let failed = 0;
const seen = new Map();
const records = [];

for (const file of files) {
  const slug = basename(file, '.json');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    console.error(`✗ ${file}: filename must be a kebab-case slug`);
    failed++;
    continue;
  }
  let raw;
  try {
    raw = JSON.parse(await readFile(join(dir.pathname, file), 'utf8'));
  } catch (e) {
    console.error(`✗ ${file}: invalid JSON (${e.message})`);
    failed++;
    continue;
  }
  const res = deviceSchema.safeParse(raw);
  if (!res.success) {
    failed++;
    console.error(`✗ ${file}`);
    for (const i of res.error.issues) console.error(`    ${i.path.join('.') || '(root)'}: ${i.message}`);
    continue;
  }
  const key = `${res.data.brand} ${res.data.model}`.toLowerCase();
  if (seen.has(key)) {
    console.error(`✗ ${file}: same brand/model as ${seen.get(key)}`);
    failed++;
  }
  seen.set(key, file);
  records.push({ file, d: res.data });
}

// Editorial cross-checks. These used to be done by hand in review rounds;
// catching them here is free and immediate.
const BANNED = ['seamless', 'elevate', "in today's", 'game-changer', 'robust', 'unlock', 'effortless', 'delve', "whether you're", 'look no further'];
const WEAK = new Set(['retailer', 'review']);
const FACTS = ['radios', 'hubRequired', 'localControl', 'energyMonitoring', 'maxLoadWatts', 'colorType', 'lumens', 'bulbBase', 'lockFit', 'keypad', 'power', 'thermostatType', 'systems', 'senses', 'cameraType', 'localStorage', 'subscription', 'switchForm', 'dimmer', 'neutralRequired', 'gangs'];
const openings = new Map();

for (const { file, d } of records) {
  const errs = [];
  const kind = Object.fromEntries(d.sources.map((s) => [s.id, s.kind]));
  const fields = { matter: d.matter };
  for (const k of FACTS) if (d[k]) fields[k] = d[k];
  for (const [e, c] of Object.entries(d.compatibility)) fields[`compatibility.${e}`] = c;

  // principle 2: retailers and reviews may back up an official source, never replace it
  const used = new Set();
  for (const [k, f] of Object.entries(fields)) {
    f.sources.forEach((s) => used.add(s));
    if (f.sources.length && f.sources.every((s) => WEAK.has(kind[s])))
      errs.push(`${k}: rests only on retailer/review sources; add an official one or mark it unknown`);
  }
  // every source must back a field (the official page and caveat-only sources excepted)
  for (const s of d.sources)
    if (!used.has(s.id) && s.url !== d.officialUrl && !s.forCaveat)
      errs.push(`source "${s.id}" backs no field (cite it, drop it, or set forCaveat: true if it only backs a caveat)`);

  const copy = `${d.summary} ${(d.caveats ?? []).join(' ')}`;
  for (const w of BANNED) {
    if (w === 'unlock' && d.category === 'smart-lock') continue; // literal on a lock, not marketing
    // match at a word start, so "robust" catches "robustly" but "delve" doesn't hit "shelves"
    if (new RegExp(`\\b${w}`, 'i').test(copy)) errs.push(`banned word in copy: "${w}"`);
  }
  if (copy.includes('!')) errs.push('no exclamation marks in copy');
  if (d.summary.includes('?')) errs.push('no rhetorical questions in the summary');

  if (d.status === 'verified') {
    const open = d.summary.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
    if (openings.has(open)) errs.push(`summary opens like ${openings.get(open)} ("${open}…")`);
    else openings.set(open, file);
  }

  if (errs.length) {
    failed++;
    console.error(`✗ ${file}`);
    for (const e of errs) console.error(`    ${e}`);
  }
}

// regional variants must point at an existing record of the same category in another
// region, and both records must list each other
const bySlug = new Map(records.map((r) => [r.file.replace(/\.json$/, ''), r.d]));
for (const [slug, d] of bySlug) {
  const errs = [];
  for (const v of d.variants ?? []) {
    const o = bySlug.get(v);
    if (!o) errs.push(`variant "${v}" does not exist`);
    else {
      if (o.category !== d.category) errs.push(`variant "${v}" is a different category`);
      if (o.regions.some((r) => d.regions.includes(r))) errs.push(`variant "${v}" shares a region; variants are for other regions`);
      if (!(o.variants ?? []).includes(slug)) errs.push(`variant "${v}" doesn't list "${slug}" back`);
    }
  }
  if (errs.length) {
    failed++;
    console.error(`✗ ${slug}.json`);
    for (const e of errs) console.error(`    ${e}`);
  }
}

// Spanish translations (src/data/i18n/es/<slug>.json): prose only, checked against the
// English record so a translation can't drop a note, add a caveat, invent a number or go stale.
const esDir = new URL('../src/data/i18n/es/', import.meta.url);
const esFiles = (await readdir(esDir).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
const ES_BANNED = ['sin fisuras', 'revolucionari', 'en el mundo actual', 'sin esfuerzo', 'no busques más', 'de última generación', 'potencia tu', 'eleva tu'];
// digit runs, with thousands separators removed ("1,100" and "1.100" are both 1100) so the
// check is about values, not about en/es number formatting ("2.4" and "2,4" both give 2 and 4)
const numbers = (s) => new Set((s.replace(/(\d)[.,\u00a0 ](?=\d{3}\b)/g, '$1').match(/\d+/g) ?? []));
const esOpenings = new Map();
const translated = new Set();
for (const file of esFiles) {
  const slug = basename(file, '.json');
  const errs = [];
  const d = bySlug.get(slug);
  let raw;
  try {
    raw = JSON.parse(await readFile(join(esDir.pathname, file), 'utf8'));
  } catch (e) {
    errs.push(`invalid JSON (${e.message})`);
  }
  const res = raw && translationSchema.safeParse(raw);
  if (res && !res.success) for (const i of res.error.issues) errs.push(`${i.path.join('.') || '(root)'}: ${i.message}`);
  if (!d) errs.push('no English record with this slug');
  if (d && res?.success) {
    const t = res.data;
    translated.add(slug);
    if (t.basedOn !== d.updatedAt) errs.push(`stale: translated from ${t.basedOn}, the record was updated ${d.updatedAt}`);
    // every English note translated, nothing extra
    const en = { radios: d.radios, matter: d.matter, hubRequired: d.hubRequired, localControl: d.localControl };
    for (const k of CATEGORY_FACTS[d.category]) en[k] = d[k];
    for (const [e, c] of Object.entries(d.compatibility)) en[`compatibility.${e}`] = c;
    const enNotes = Object.fromEntries(Object.entries(en).filter(([, f]) => f.note).map(([k, f]) => [k, f.note]));
    for (const k of Object.keys(enNotes)) if (!t.notes[k]) errs.push(`notes.${k}: missing translation`);
    for (const k of Object.keys(t.notes)) if (!enNotes[k]) errs.push(`notes.${k}: the English record has no such note`);
    if (t.caveats.length !== d.caveats.length) errs.push(`caveats: ${t.caveats.length} translated, the record has ${d.caveats.length}`);
    for (const [e, c] of Object.entries(d.compatibility))
      if (c.status === 'hub' && c.via && !t.via?.[e]) errs.push(`via.${e}: missing translation of "${c.via}"`);
    for (const e of Object.keys(t.via ?? {})) if (d.compatibility[e]?.status !== 'hub') errs.push(`via.${e}: not a hub entry`);
    for (const k of Object.keys(t.values ?? {}))
      if (typeof d[k]?.value !== 'string') errs.push(`values.${k}: the record has no text value for ${k}`);
    // no number the English text doesn't have
    const pairs = [
      ['summary', d.summary, t.summary],
      ...d.caveats.map((c, i) => [`caveats.${i}`, c, t.caveats[i] ?? '']),
      ...Object.entries(t.notes).map(([k, v]) => [`notes.${k}`, enNotes[k] ?? '', v]),
      ...Object.entries(t.via ?? {}).map(([e, v]) => [`via.${e}`, d.compatibility[e]?.via ?? '', v]),
      ...Object.entries(t.values ?? {}).map(([k, v]) => [`values.${k}`, String(d[k]?.value ?? ''), v]),
    ];
    // same numbers both ways: none invented, none dropped (a dropped number is usually a dropped fact)
    for (const [k, enText, esText] of pairs) {
      const en = numbers(enText);
      const es = numbers(esText);
      const extra = [...es].filter((n) => !en.has(n));
      const lost = [...en].filter((n) => !es.has(n));
      if (extra.length) errs.push(`${k}: number(s) ${extra.join(', ')} not in the English text`);
      if (lost.length) errs.push(`${k}: number(s) ${lost.join(', ')} from the English text are missing`);
    }
    const copy = [t.summary, ...t.caveats].join(' ');
    for (const w of ES_BANNED) if (copy.toLowerCase().includes(w)) errs.push(`banned phrase in copy: "${w}"`);
    if (/[!¡]/.test(copy)) errs.push('no exclamation marks in copy');
    if (/[?¿]/.test(t.summary)) errs.push('no rhetorical questions in the summary');
    const open = t.summary.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
    if (esOpenings.has(open)) errs.push(`summary opens like ${esOpenings.get(open)} ("${open}…")`);
    else esOpenings.set(open, file);
  }
  if (errs.length) {
    failed++;
    console.error(`✗ i18n/es/${file}`);
    for (const e of errs) console.error(`    ${e}`);
  }
}
// once the Spanish site is on, every published record needs its translation
if (ES_ENABLED)
  for (const [slug, d] of bySlug)
    if (d.status === 'verified' && !translated.has(slug)) {
      failed++;
      console.error(`✗ ${slug}.json: no Spanish translation in src/data/i18n/es/ (the Spanish site is on)`);
    }

console.log(`${files.length} device file(s) and ${esFiles.length} Spanish translation(s) checked, ${failed} invalid.`);
if (failed) process.exit(1);
if (!files.length) console.warn('warning: no device data yet');
