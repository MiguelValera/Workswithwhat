// Validates every device JSON against the shared schema. Runs before each build
// and in CI; exits non-zero on the first broken record set.
import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { deviceSchema } from '../src/schema/device.ts';

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
const FACTS = ['radios', 'hubRequired', 'localControl', 'energyMonitoring', 'maxLoadWatts', 'colorType', 'lumens', 'bulbBase', 'lockFit', 'keypad', 'power', 'thermostatType', 'systems', 'senses'];
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


console.log(`${files.length} device file(s) checked, ${failed} invalid.`);
if (failed) process.exit(1);
if (!files.length) console.warn('warning: no device data yet');
