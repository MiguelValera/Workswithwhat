// Validates every device JSON against the shared schema. Runs before each build
// and in CI; exits non-zero on the first broken record set.
import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { deviceSchema } from '../src/schema/device.ts';

const dir = new URL('../src/data/devices/', import.meta.url);
const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
let failed = 0;
const seen = new Map();

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
}


console.log(`${files.length} device file(s) checked, ${failed} invalid.`);
if (failed) process.exit(1);
if (!files.length) console.warn('warning: no device data yet');
