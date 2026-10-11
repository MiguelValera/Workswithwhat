// Checks that no page or table scrolls sideways, from phone to desktop widths.
//   npm run build && node scripts/overflow-check.mjs
// Needs Playwright (preinstalled globally in the cloud container; not a project dependency).
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'));
const WIDTHS = [320, 390, 768, 979, 980, 1280];
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  let p = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
    res.end(await readFile(p));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const pages = (await readdir('dist', { recursive: true }))
  .filter((f) => f.endsWith('index.html'))
  .map((f) => '/' + f.replace(/index\.html$/, ''));

const browser = await chromium.launch();
const bad = [];
for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  for (const u of pages) {
    await page.goto(base + u);
    const over = await page.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth) out.push(`page +${document.documentElement.scrollWidth - innerWidth}px`);
      document.querySelectorAll('.table-scroll').forEach((t, i) => {
        if (t.scrollWidth > t.clientWidth) out.push(`table ${i} +${t.scrollWidth - t.clientWidth}px`);
      });
      return out;
    });
    if (over.length) bad.push(`${w}px ${u}: ${over.join(', ')}`);
  }
  await page.close();
}
await browser.close();
server.close();

console.log(`${pages.length} pages × ${WIDTHS.length} widths checked, ${bad.length} overflowing.`);
for (const b of bad) console.log(`  !! ${b}`);
if (bad.length) process.exit(1);
