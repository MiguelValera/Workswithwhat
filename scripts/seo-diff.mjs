// Compares the SEO-relevant parts of two builds, page by page.
//   node scripts/seo-diff.mjs <before-dist> <after-dist>
// Without arguments it builds origin/main in a temporary git worktree and
// compares it with ./dist (run `npm run build` first). Page-level changes
// (title, description, canonical, robots, OG, headings, JSON-LD, Quick answers,
// removed links) exit 1. Added links, new pages and API/llms/sitemap content
// changes are listed but allowed: they are expected when device data changes.
import { readdir, readFile, mkdtemp, rm, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const all = (re, h) => [...h.matchAll(re)].map((m) => m[1]);
const meta = (h, attr, name) =>
  all(new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, 'g'), h)[0] ??
  all(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${name}"`, 'g'), h)[0] ?? null;

function snapPage(h) {
  const og = {};
  for (const m of h.matchAll(/<meta[^>]*(?:property|name)="((?:og|twitter):[^"]+)"[^>]*content="([^"]*)"/g)) og[m[1]] = m[2];
  const block = (id) => {
    const i = h.indexOf(`id="${id}"`);
    if (i < 0) return null;
    // the block ends at the next h2 or section end, whichever comes first
    const ends = [h.indexOf('<h2', i + 1), h.indexOf('</section>', i)].filter((n) => n > 0);
    return text(h.slice(i, ends.length ? Math.min(...ends) : i + 4000));
  };
  return {
    title: all(/<title>([\s\S]*?)<\/title>/g, h)[0] ?? null,
    description: meta(h, 'name', 'description'),
    robots: meta(h, 'name', 'robots'),
    canonical: all(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/g, h)[0] ?? null,
    og,
    h1: all(/<h1[^>]*>([\s\S]*?)<\/h1>/g, h).map(text),
    h2: all(/<h2[^>]*>([\s\S]*?)<\/h2>/g, h).map(text),
    jsonld: all(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, h).map((j) => JSON.stringify(JSON.parse(j))),
    quickAnswers: block('quick-answers'),
    links: [...new Set(all(/href="(\/[^"]*|#[^"]*)"/g, h))].sort(),
  };
}

async function snapshot(dist) {
  const snap = {};
  for (const f of await walk(dist)) {
    const rel = relative(dist, f);
    if (rel.endsWith('.html')) snap[rel] = snapPage(await readFile(f, 'utf8'));
    else if (/^api\/.*\.json$/.test(rel)) snap[rel] = { json: JSON.parse(await readFile(f, 'utf8')) };
    else if (/^(sitemap.*\.xml|robots\.txt|llms(-full)?\.txt)$/.test(rel)) snap[rel] = { body: await readFile(f, 'utf8') };
  }
  return snap;
}

async function removeWorktree(dir) {
  execSync(`git worktree remove --force ${dir}`);
  await rm(dir, { recursive: true, force: true });
}

async function buildMain() {
  const dir = await mkdtemp(join(tmpdir(), 'seo-main-'));
  execSync('git fetch -q origin main', { stdio: 'inherit' });
  execSync(`git worktree add -q --detach ${dir} origin/main`, { stdio: 'inherit' });
  try {
    await symlink(join(process.cwd(), 'node_modules'), join(dir, 'node_modules'));
    execSync('npx astro build --silent', { cwd: dir, stdio: 'inherit' });
  } catch (e) {
    await removeWorktree(dir); // don't leave a stray worktree behind when the build fails
    throw e;
  }
  return dir;
}

let [before, after] = process.argv.slice(2);
let worktree;
if (!before) {
  if (!existsSync('dist')) throw new Error('run `npm run build` first');
  worktree = await buildMain();
  before = join(worktree, 'dist');
  after = 'dist';
}

// paths that differ between two JSON values, e.g. devices[3].sources[1].forCaveat
function paths(x, y, at = '') {
  if (JSON.stringify(x) === JSON.stringify(y)) return [];
  if (x && y && typeof x === 'object' && typeof y === 'object' && Array.isArray(x) === Array.isArray(y))
    return [...new Set([...Object.keys(x), ...Object.keys(y)])].flatMap((k) =>
      paths(x[k], y[k], Array.isArray(x) ? `${at}[${k}]` : at ? `${at}.${k}` : k),
    );
  return [at || '(root)'];
}

const a = await snapshot(before);
const b = await snapshot(after);
const problems = [];
const notes = [];
const data = []; // API / llms / sitemap content: expected when device data changes
for (const page of new Set([...Object.keys(a), ...Object.keys(b)])) {
  if (!b[page]) { problems.push(`${page}: page removed`); continue; }
  if (!a[page]) { notes.push(`${page}: new page`); continue; }
  for (const k of Object.keys(b[page])) {
    const x = JSON.stringify(a[page][k]);
    const y = JSON.stringify(b[page][k]);
    if (x === y) continue;
    if (k === 'body') data.push(`${page}: content changed`);
    else if (k === 'json') {
      const p = paths(a[page].json, b[page].json);
      data.push(`${page}: ${p.length} value(s) changed: ${p.slice(0, 8).join(', ')}${p.length > 8 ? ' …' : ''}`);
    } else if (k === 'links') {
      const removed = a[page].links.filter((l) => !b[page].links.includes(l));
      const added = b[page].links.filter((l) => !a[page].links.includes(l));
      if (removed.length) problems.push(`${page}: links removed ${removed.join(' ')}`);
      if (added.length) notes.push(`${page}: links added ${added.length}`);
    } else problems.push(`${page}: ${k} changed\n    before: ${x.slice(0, 300)}\n    after:  ${y.slice(0, 300)}`);
  }
}

if (worktree) await removeWorktree(worktree);

console.log(`${Object.keys(b).length} files compared; ${notes.length} allowed differences, ${data.length} data-file changes, ${problems.length} page SEO changes.`);
for (const d of data) console.log(`  data ${d}`);
for (const n of notes.slice(0, 20)) console.log(`  ok  ${n}`);
if (notes.length > 20) console.log(`  ok  … ${notes.length - 20} more`);
for (const p of problems) console.log(`  !!  ${p}`);
if (problems.length) process.exit(1);
