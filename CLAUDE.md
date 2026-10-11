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
| `category` | `smart-plug` or `smart-bulb` (more to come). Decides the URL section and the category facts below. |
| `hubRequired`, `localControl` | Facts `{ value, sources, note? }`; `value: null` = not confirmed. Every category has them. |
| Category facts | Plugs: `energyMonitoring`, `maxLoadWatts`. Bulbs: `colorType` (white / tunable-white / color), `lumens`, `bulbBase` (e.g. "E27", "E26 (A19)", "GU10"). |
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
- `/<category>/` (e.g. `/smart-plugs/`, `/smart-bulbs/`): comparison table. A category gets pages only once it has a verified device.
- `/<category>/<slug>/`: device page with a compatibility table, specs, sources, last-verified date, and Product JSON-LD.
- `/works-with/<ecosystem>/`: e.g. "Smart plugs and smart bulbs that work with Apple Home", one section per category. `/works-with/matter/` lists Matter-certified devices.
- Categories are registered in `src/lib/categories.ts` (routes, labels, which facts to show) and `src/schema/device.ts` (fields).
- `/methodology/`: how we verify (trust signal).
- Every page needs a unique `<title>` and meta description, a canonical URL, OG tags and breadcrumbs (with BreadcrumbList JSON-LD). Sitemap via `@astrojs/sitemap`.
- Keep pages light: no client JS unless needed, system fonts, no trackers.

### AI search and agents (GEO)

- `/llms.txt` (site map for assistants), `/llms-full.txt` (every device as Markdown), `/api/devices.json` and `/api/<category>.json` (published records plus a ready-made answer per ecosystem) are generated from the same data. Drafts never appear in them.
- Every device page has a visible "Quick answers" block ("Does X work with Y?") mirrored in FAQPage JSON-LD. The wording comes from `answerFor()` in `src/lib/devices.ts`, so the page, the FAQ, llms.txt and the API always agree.
- `robots.txt` explicitly allows AI search and assistant crawlers. Don't block them at Cloudflare (no Bot Fight Mode, no "Block AI bots"): the live site check warns if they get blocked.
- After each deploy, CI submits the sitemap URLs to IndexNow (Bing, Yandex…).

## Roadmap

- **Phase 1 (done):** Astro setup, schema and validation, agents, first smart plugs, GitHub Pages + Cloudflare deploy, security hardening, legal pages, SEO/GEO.
- **Phase 2 (in progress):** more devices and categories. Plugs and bulbs are live; sensors, locks and thermostats come next. Each new category needs code: schema in `src/schema/device.ts`, plus registry and labels in `src/lib/categories.ts`. Then filters, comparison pages ("X vs Y") and per-ecosystem buying guides.
- **Phase 3:** data freshness (re-verify records older than 6 months), contribution and corrections form, monetisation (see below).

## Current state (handoff, updated 2026-10-11)

Read this first if you are picking the project up.

### What is live on https://workswithwhat.com
- **45 verified devices:** 35 smart plugs (US, EU, UK) and 10 smart bulbs, each with sourced compatibility for Apple Home, Google Home, Alexa, SmartThings and Home Assistant.
- **Pages:**
  - `/smart-plugs/` and `/smart-bulbs/`: comparison charts.
  - A page per device.
  - `/works-with/<ecosystem>/` and `/works-with/matter/`.
  - `/methodology/`, `/legal/` and `/privacy/`.
- **For AI assistants:** `/llms.txt`, `/llms-full.txt`, `/api/devices.json` and `/api/<category>.json`.

### Unfinished work
- **Five smart-bulb drafts** (`status: "draft"`, not published): `lifx-supercolor-a19-1100-us`, `meross-msl120hk-us`, `philips-hue-white-a19-e26-810-us`, `philips-hue-white-ambiance-gu10-350-eu` and `tp-link-tapo-l510e-eu`. Their verifier run was stopped partway, so start over: run the verifier, then the editor. Collector doubts:
  - Hue White A19: only multipack pages exist, and 810 lm is a "max" figure.
  - Hue GU10 350 lm: may be discontinued (EAN 8719514339903). The successor is EAN 8720169229976.
  - Tapo L510E: the Home Assistant listing and local control are unclear.
  - LIFX: model number LHLA19E26US vs LHLA19E26CAN; the CSA listing is generic.
  - Meross MSL120HK: Matter rests only on a brand-wide claim.
- **Next plug batch (not started):** Tapo P115 (EU), Nous A1T, Innr SP 242, LEDVANCE SMART+ Matter plug, Shelly Plug Gen4 (EU).

### How content gets added (lessons learned)
- **Batch size:** 5 devices per agent. Run collector, then verifier, then editor, then open a PR. Merge once CI is green. Run at most ~3 agents at once; more hits the account's usage limit.
- **Network:** the cloud container cannot open external sites. WebFetch and curl fail, and only WebSearch works. Agents must cite only URLs that appeared in search results.
- **Verifier rules that keep coming up:**
  - **Absence is not "no":** if a maker's platform list just doesn't mention Matter or Apple Home, use `null` / `unknown` with a note, not `false` / `no`.
  - **Never derive watts from amps:** if only amps are given, set `value: null` and put the amps in the note.
  - **Forum posts are `review`:** community and forum posts are never `kind: manufacturer`.
  - **Sources must back a field:** every source must back at least one field. The exception is a source for an end-of-support or safety caveat.
  - **Names:** short and searchable, with a region suffix, e.g. "Tapo P110 (UK)".
- **Editor rules:**
  - The editor may only state what notes and facts support; it drops unsupported claims.
  - Each summary must open differently from every other.
- **Publishing:** only `status: "verified"` records reach the site. A PR may contain drafts safely, but don't merge while a verifier is halfway through a record, because a half-verified record would go live.
- **Stop hook:** this environment has a stop hook that demands commits. Agents' intermediate edits therefore get committed as "work in progress" on the branch; that's fine because PRs are squash-merged.

### Infrastructure
- **Git:** develop on branch `claude/astro-phase-1-setup-3garkt`, open a PR to `main`, and squash-merge. After a merge, reset the branch to `origin/main` (`git checkout -B <branch> origin/main`, then a force push).
- **Deploy:** `.github/workflows/deploy.yml` validates and builds on every push and PR. On `main` it deploys to GitHub Pages, then submits all sitemap URLs to IndexNow (the key file is `public/<key>.txt`, public by design).
- **Live checks:** `.github/workflows/site-check.yml` runs `scripts/site-check.sh` daily at 06:17 UTC or on demand. It checks DNS, TLS, redirects, security headers, key pages, the JSON API, AI-crawler access and that no cookies are set. The container can't reach the live site itself, so trigger this workflow and read its logs.
- **Cloudflare:**
  - The proxy is on with SSL Full (strict), Always Use HTTPS and minimum TLS 1.2.
  - A Transform Rule adds `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.
  - **Bot Fight Mode must stay OFF.** It answered 403 (`cf-mitigated: challenge`) to every HTML page requested from a datacenter.
- **Security:** a CSP meta tag is emitted in production builds only (`default-src 'none'`, no inline styles). JSON-LD escapes `<`. Dependabot is on. TypeScript is held at 6, because `astro check` rejects TS 7. `upload-pages-artifact` and `deploy-pages` stay on their current majors (open Dependabot PRs #4 and #5) until a deploy test confirms newer versions still publish `/.well-known/`.
- **Legal:** the site sets no cookies and has no trackers, so there is no consent banner. The privacy policy names GitHub Pages and Cloudflare as processors, plus Cloudflare Email Routing and Gmail for email. In `src/site.config.ts`, `OPERATOR.email` is `info@workswithwhat.com`; the other operator details required by Spain's LSSI are still empty and must be filled in before monetising.
- **Email:** `info@workswithwhat.com` is a Cloudflare Email Routing rule that forwards to the owner's Gmail (no mailbox). The footer's "Tell us" link is a `mailto:` to it.

### Owner's to-do list (not done as of this update)
- Google Search Console and Bing Webmaster Tools: steps in `docs/launch-kit.md`.
- DNSSEC. The domain now receives email, so don't use `v=spf1 -all`: keep the SPF record Email Routing created (add `include:_spf.google.com` if replying as info@ from Gmail), and start DMARC at `p=none`. Only move to `p=reject` once outgoing mail is DKIM-signed with the domain.
- HSTS in Cloudflare, once the site has been stable for a few days.
- Verify the domain in GitHub Pages settings, and add a ruleset protecting `main`.
- Fill in `src/site.config.ts` with operator details.
- Post the community texts from `docs/launch-kit.md` (Reddit, Home Assistant forum).
- **Optional:** Cloudflare Web Analytics, which is cookieless. It needs its JS token. To add it, allow `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (connect) in the CSP, mention it in `/privacy/`, and change "no trackers" in the footer.

### Monetisation plan (agreed direction, not implemented)
1. **Affiliate "where to buy" links per device, using regional Amazon Associates and brand programs:**
   - Keep tags in a config file, and switch the links off until the owner has accounts.
   - Add a disclosure on every page.
   - Update the "no affiliate links" wording in `/methodology/` and `/legal/`.
   - Links must never influence verdicts.
2. **Paid API or dataset licence:** once there are 300+ devices.
3. **Newsletter:** compatibility-change alerts.
4. **Display ads:** last resort or never. They would need cookie consent and would undercut the trust the site is built on.

### Traffic (as of 2026-10-11)
- **What Cloudflare shows:** about 800 requests on day one, mostly crawlers and the site check.
- **How to tell it's crawlers:** device pages get near-uniform hits, which is the signature of a crawler. The CSS file got about 38 requests, which caps real browser sessions.
- **When to expect people:** human search traffic should start 1–3 weeks after Search Console setup.

## Commands

```bash
npm install
npm run dev        # local dev server
npm run validate   # schema + cross-checks for all device data
npm run build      # validate + static build into dist/
```
