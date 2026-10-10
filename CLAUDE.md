# Workswithwhat

**workswithwhat.com** — a compatibility reference for smart-home devices. It answers one question per device: *which ecosystem does it work with, how does it connect, and how do we know?* Every claim on the site links to a source.

The site is in **English**; it targets the global search market. Internal docs and agent prompts may be in Spanish or English.

## Principles

1. **No source, no claim.** Any value other than `unknown` / `null` needs at least one source id. The schema enforces this.
2. **Official first.** Manufacturer pages, datasheets and manuals, the CSA Matter certification database, and ecosystem partner lists (Apple, Google, Amazon, SmartThings, Home Assistant docs) come first. Retailer pages and reviews only back up an official source, never replace one.
3. **`unknown` beats a guess.** If two official sources disagree, or the only evidence is a forum post, mark it `unknown` and explain in `note`.
4. **Regional variants are different records.** A US plug and its EU sibling get separate files when model numbers, certifications or radios differ.
5. **Write for people.** Short, specific, plain sentences with real numbers. No filler intros, no "in today's connected world", no keyword stuffing. The test: would someone who owns the device nod along?

## Stack

- **Astro 7** static site, deployed to **GitHub Pages** (custom domain `workswithwhat.com`, `public/CNAME`). Everything runs on free tiers.
- Data: one JSON file per device in `src/data/devices/<slug>.json`.
- Schema: `src/schema/device.ts` (Zod 4). It is shared by the Astro content collection (`src/content.config.ts`) and `scripts/validate-data.mjs`.
- `npm run validate` checks all data; `npm run build` validates, then builds. CI runs both on every push.

## Data model (summary; the schema is authoritative)

| Field | Meaning |
|---|---|
| `brand`, `model`, `name`, `regions` | Identity. The slug is the filename: `brand-model-region` in kebab case. |
| `radios` | Fact: wifi / thread / zigbee / z-wave / bluetooth / ethernet. |
| `matter` | `certified` (true / false / null), plus `transport` when certified. |
| `compatibility.<ecosystem>` | `native` · `matter` · `hub` (needs `via`) · `no` · `unknown`, with `sources`. Ecosystems: apple_home, google_home, alexa, smartthings, home_assistant. |
| `hubRequired`, `localControl`, `energyMonitoring`, `maxLoadWatts` | Facts `{ value, sources, note? }`; `value: null` = not confirmed. |
| `summary`, `caveats` | Human copy (written by the editor agent). |
| `sources[]` | `{ id, url, title, publisher, kind, accessed }`. At least one source must be `kind: manufacturer`. |
| `status` | `draft` (collector output) → `verified` (after the verifier signs off, with `verifiedAt`). **Only verified records are published.** |

### Compatibility semantics

- **native**: works through the brand's own integration (Alexa skill, Google Home cloud-to-cloud, HomeKit/HAP, official HA integration).
- **matter**: works because the device is Matter-certified and the ecosystem is a Matter controller. Thread devices also need a Thread border router; say so in `note`.
- **hub**: works only through a bridge (e.g. Zigbee plug → Hue Bridge, Aqara hub, IKEA DIRIGERA). Name it in `via`.
- If a device does both native and Matter, record `native` and mention Matter in `note`.

## Agents (`.claude/agents/`)

Pipeline: **collector → verifier → editor**.

| Agent | Job | Writes |
|---|---|---|
| `collector` | Researches a device and drafts its JSON with sources. | New `src/data/devices/*.json` with `status: "draft"`. |
| `verifier` | Re-checks every claim against its cited source, independently. Downgrades anything unsupported to `unknown`. | Edits the record and sets `status: "verified"` + `verifiedAt` only if everything holds. |
| `editor` | Writes `summary` and `caveats` from the verified data, plus SEO copy. Never changes facts. | `summary`, `caveats`. |

After any agent run: `npm run validate` must pass.

## Site structure (SEO)

- `/` home: what the site is, latest verified devices.
- `/smart-plugs/`: category comparison table.
- `/smart-plugs/<slug>/`: device page with a compatibility table, specs, sources, last-verified date, and Product JSON-LD.
- `/works-with/<ecosystem>/`: e.g. "Smart plugs that work with Apple Home".
- `/methodology/`: how we verify (trust signal).
- Every page needs a unique `<title>` and meta description, a canonical URL, OG tags and breadcrumbs (with BreadcrumbList JSON-LD). Sitemap via `@astrojs/sitemap`.
- Keep pages light: no client JS unless needed, system fonts, no trackers.

### AI search and agents (GEO)

- `/llms.txt` (site map for assistants), `/llms-full.txt` (every device as Markdown) and `/api/smart-plugs.json` (published records plus a ready-made answer per ecosystem) are generated from the same data. Drafts never appear in them.
- Every device page has a visible "Quick answers" block ("Does X work with Y?") mirrored in FAQPage JSON-LD. The wording comes from `answerFor()` in `src/lib/devices.ts`, so the page, the FAQ, llms.txt and the API always agree.
- `robots.txt` explicitly allows AI search and assistant crawlers. Don't block them at Cloudflare (no Bot Fight Mode, no "Block AI bots"): the live site check warns if they get blocked.
- After each deploy, CI submits the sitemap URLs to IndexNow (Bing, Yandex…).

## Roadmap

- **Phase 1 (current):** Astro setup, schema and validation, agents, first 10 smart plugs, GitHub Pages deploy.
- **Phase 2:** more categories (bulbs, sensors, locks, thermostats), filters, and per-ecosystem guides.
- **Phase 3:** data freshness (re-verify records older than 6 months), comparison pages, contribution and corrections form.

## Commands

```bash
npm install
npm run dev        # local dev server
npm run validate   # schema + cross-checks for all device data
npm run build      # validate + static build into dist/
```
