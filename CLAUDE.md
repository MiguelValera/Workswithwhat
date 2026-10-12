# Workswithwhat

**workswithwhat.com** — a compatibility reference for smart-home devices. It answers one question per device: *which ecosystem does it work with, how does it connect, and how do we know?* Every claim on the site links to a source.

The site is in **English** at the root, plus **Spanish (Spain)** under `/es/`, **German** under `/de/`, **French** under `/fr/` and **Italian** under `/it/`; it targets the global search market plus the largest EU markets. Internal docs and agent prompts may be in Spanish or English.

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
| `category` | `smart-plug`, `smart-bulb`, `smart-lock`, `smart-thermostat`, `smart-sensor`, `smart-camera`, `smart-switch`, `robot-vacuum`, `smart-hub` or `light-strip` (more to come). Decides the URL section and the category facts below. |
| `hubRequired`, `localControl` | Facts `{ value, sources, note? }`; `value: null` = not confirmed. Every category has them. |
| Category facts | Plugs: `energyMonitoring`, `maxLoadWatts`. Bulbs: `colorType` (white / tunable-white / color), `lumens`, `bulbBase` (e.g. "E27", "E26 (A19)", "GU10"). Locks: `lockFit` (deadbolt / retrofit / cylinder / lever), `keypad`, `power` (e.g. "4 × AA"). Thermostats: `thermostatType` (wall / radiator-valve), `systems` (what it controls), `power` (e.g. "C-wire (24 V)"). Sensors: `senses` (contact / motion / presence / temperature / humidity / leak / light / vibration / air-quality), `power`. Cameras and doorbells: `cameraType` (indoor / outdoor / doorbell / floodlight), `power`, `localStorage`, `subscription` (what a paid plan is needed for). Switches and dimmers: `switchForm` (wall-switch / module), `dimmer`, `neutralRequired`, `gangs`. Robot vacuums: `cleaning` (vacuum / vacuum-mop), `navigation`, `suctionPa`, `selfEmptying`. LED light strips: `colorType`, `lengthM` (metres in the box), `multiZone` (several colours at once), `power`. Hubs and bridges: `hubType` (hub / usb-dongle / speaker-display), `deviceProtocols`, `matterBridge`, `threadBorderRouter`, `maxDevices`; for a hub, `compatibility` means the devices paired to it show up in that ecosystem. |
| `summary`, `caveats` | Human copy (written by the editor agent). |
| `sources[]` | `{ id, url, title, publisher, kind, accessed, forCaveat? }`. At least one source must be `kind: manufacturer`. `forCaveat: true` marks a source that backs only a caveat. |
| `variants` | Optional: slugs of the same product sold in other regions (e.g. Tapo P110 EU ↔ UK). Must be mutual, same category, different regions; the validator checks it. Collectors set it when they add a regional sibling of an existing record. |
| `status` | `draft` (collector output) → `verified` (after the verifier signs off, with `verifiedAt`). **Only verified records are published.** |

### Compatibility semantics

- **native**: works through the brand's own integration (Alexa skill, Google Home cloud-to-cloud, HomeKit/HAP, official HA integration).
- **matter**: works because the device is Matter-certified and the ecosystem is a Matter controller. Thread devices also need a Thread border router; say so in `note`.
- **hub**: works only through a bridge (e.g. Zigbee plug → Hue Bridge, Aqara hub, IKEA DIRIGERA). Name it in `via`.
- If a device does both native and Matter, record `native` and mention Matter in `note`.

## Agents (`.claude/agents/`)

Pipeline: **bestsellers** (what to add) → **collector → verifier → editor → translator**, then **reviewer** on the PR.

| Agent | Job | Writes |
|---|---|---|
| `bestsellers` | Finds the 5 best-selling devices per category and market (Amazon best-seller lists first, review roundups only as tie-breakers), marks each as have / variant / missing, and ranks high-volume categories the site lacks. | `docs/bestsellers/<market>.md`, ending in a queue of batches of 5 for the collector. |
| `collector` | Researches a device and drafts its JSON with sources. | New `src/data/devices/*.json` with `status: "draft"`. |
| `verifier` | Re-checks every claim against its cited source, independently. Downgrades anything unsupported to `unknown`. | Edits the record and sets `status: "verified"` + `verifiedAt` only if everything holds. |
| `editor` | Writes `summary` and `caveats` from the verified data, plus SEO copy. Never changes facts. | `summary`, `caveats`. |
| `ux` | HTML/CSS-only UX work on pages and components. Proves SEO is unchanged with a before/after snapshot diff of `dist/`. | Layouts, components, pages, `global.css`. |
| `translator` | Translates a verified record's prose (summary, caveats, notes, `via`, text values) into Spanish (Spain), German, French and Italian. Never changes facts. `node scripts/translation-source.mjs <lang>` lists what is missing. | `src/data/i18n/<lang>/<slug>.json` (es, de, fr, it) |
| `reviewer` | Reviews an open PR against these rules (validate, build, CI, data, CSP, secrets, copy). Never merges. | One PR comment: **Ready to merge** or **Not ready**, with blockers. |
| `monetization` | Researches the most viable and simple revenue options and proposes them, ranked, with sources. **Never implements anything:** the owner confirms each proposal explicitly first. Runs outside the content pipeline. | Nothing; returns a report. |

After any agent run: `npm run validate` must pass.

## Site structure (SEO)

- `/` home: what the site is, latest verified devices.
- `/<category>/` (e.g. `/smart-plugs/`, `/smart-bulbs/`): comparison table. A category gets pages only once it has a verified device.
- `/<category>/<slug>/`: device page with a compatibility table, specs, sources, last-verified date, and Product JSON-LD.
- `/works-with/<ecosystem>/`: e.g. "Smart home devices that work with Apple Home", one section per category. Titles name the categories only up to three; past that they say "smart home devices" and the description names them in brackets (`categoryPhrase()` in `src/lib/devices.ts`). `/works-with/matter/` lists Matter-certified devices.
- Categories are registered in `src/lib/categories.ts` (routes, labels, a short `navLabel` for the site header, which facts to show) and `src/schema/device.ts` (fields).
- `/compare/<a>-vs-<b>/` (Spanish `/es/comparar/…`): "X vs Y" pages, two devices of the same category and market side by side (Matter, every ecosystem, radio, hub, local control, category facts), each cell linking to the source on the device's page, plus generated quick answers mirrored in FAQPage JSON-LD. Pairs come from the data in `src/lib/compare.ts`, never by hand: every pair of the same category and market that differs somewhere gets a page, so any two devices of one type can be compared without client JS. Only each device's `RIVALS_PER_DEVICE` (3) closest rivals (same kind first, e.g. two GU10 bulbs or two doorbells) are indexed; the other pairs are `noindex`, and `astro.config.mjs` keeps every noindex page out of the sitemap. `/compare/`, charts and llms.txt list only indexed pairs; device pages list every rival under "Compare the X", closest first. Adding a device adds its comparisons automatically.
- `/methodology/`: how we verify (trust signal).
- Every page needs a unique `<title>` and meta description, a canonical URL, OG tags and breadcrumbs (with BreadcrumbList JSON-LD). Sitemap via `@astrojs/sitemap`.
- Keep pages light: no client JS (the CSP allows none), system fonts, no trackers.
- Device pages open with a "Compatibility at a glance" tile grid linking to `#compat-<eco>` rows, then an "On this page" list. Chart pages have region and brand filter chips: CSS-only checkboxes (multi-select, "Show all" is a form reset) that hide the other sections and rows in place; the rules for up to 40 brands are at the end of `global.css`. The section ids (`#us`, `#eu`, `#uk`) and brand row anchors (`#<market>-brand-<brand>`) stay for links. Keep these when editing pages.
- **Markets:** lists never mix regions. `src/lib/markets.ts` groups records into US & Canada, Europe, UK (Australia and Japan when they exist); charts, `/works-with/` pages and the Matter page show one table per market. Region pages: `/<market>/` (home), `/<market>/<category>/`, `/<market>/works-with/<ecosystem>/` and `/<market>/works-with/matter/`, generated only when the market has at least 3 devices for that page (`getRegionPages()`, `MIN_REGION_DEVICES`). The page bodies live in `src/components/pages/` (CategoryChart, EcosystemPage, MatterPage) and render both the all-regions and the one-region version. The header is one row: logo, a **Devices** `<details>` menu (all categories), By ecosystem, How we verify, and a locale `<details>` ("EN · All regions") holding the region switch (All · US · EU · UK, linking to the same page in the other market, or its closest page) and the language links; on phones the nav collapses into a **Menu** `<details>`. The footer repeats every category, ecosystem, region and language as plain links, so each section stays one crawlable click away from every page. Device pages show a region badge (linking to that market's chart) and "Other regions" links. `/api/<market>/devices.json` and `/api/<market>/<category>.json` hold one market; every API record has `market` and `variants`. `llms.txt` has a "By region" section and lists devices per category and market.
- Tables with `class="stack"` turn into one card per row below 980 px (labels come from `data-label`; `td.wide` spans the card). New tables should use it, so nothing scrolls sideways on phones.

### Languages (i18n)

- English at the root; every other language under its prefix with translated path segments, e.g. `/es/enchufes-inteligentes/<slug>/`, `/de/smarte-steckdosen/`, `/fr/prises-connectees/`, `/it/prese-smart/`, `/es/compatible-con/apple-home/`, `/de/kompatibel-mit/`, `/fr/compatible-avec/`, `/it/compatibile-con/`, `/es/eu/enchufes-inteligentes/`, `/es/metodologia/`, `/de/impressum/`, `/fr/mentions-legales/`, `/it/note-legali/`. The segment map is in `src/i18n/lang.ts` (`localize()`, `toEnglish()`); market codes, ecosystem slugs and device slugs stay the same.
- Pages are written against English paths; components read the language from the URL (`langOf()`) and localize every link. Interface strings live in `src/i18n/ui.ts` or inline as `T({ en, es, de, fr, it })` (`const T = pick(lang)`) in the page components (`src/components/pages/`); the types force every language to be filled. Category, market, spec and status names have per-language versions in `categories.ts` (with grammatical gender), `markets.ts` (`phrase` after "for", `inPhrase` for "sold in") and `devices.ts`.
- Translated device prose lives in `src/data/i18n/<lang>/<slug>.json` (schema `src/schema/translation.ts`): summary, caveats, one entry per note, `via` and text `values`. Facts and sources exist only in the English record, so they can't diverge. `basedOn` must equal the record's `updatedAt`: **any edit to a record makes its translation stale and the validator fails until the translator updates it.**
- `ENABLED_LANGS` in `src/site.config.ts` lists the languages built besides English. While a language is on, every verified record needs a translation in `src/data/i18n/<lang>/`. Languages, prefixes and path segments are in `src/i18n/lang.ts` (`LANGS`, `localize()`, `pick()` for inline per-language strings). Every translated route comes from `getLocalePages(lang)` (`src/lib/routes-i18n.ts`) and renders through `src/pages/<lang>/[...path].astro` and `src/components/pages/LocalePage.astro`.
- Every page has hreflang `en`, `es-ES`, `de`, `fr`, `it` and `x-default` (English) alternates, plus language links in the header's locale menu and the footer. Fixed pages (methodology, legal, privacy) are hand-written per language in `src/components/pages/<lang>/` and registered in `FIXED` in `LocalePage.astro`; a new language needs entries in `LANGS`, `ui.ts`, every `Record<Lang…>` (`astro check` lists them), `FIXED`, a `src/pages/<lang>/[...path].astro` file and `BANNED_IN` in the validator. The JSON API and `llms*.txt` stay in English.
- Copy rules: Spain Spanish ("enchufe", "bombilla", "wifi", tú), German with "du" and "WLAN", French with "vous", Italian with "tu". Same facts and numbers as the English (the validator rejects any number not in the English text), decimal comma for measures but dots in version numbers ("Matter 1.4"), banned phrases per language listed in `scripts/validate-data.mjs`. Glossaries are in `.claude/agents/translator.md`.

### AI search and agents (GEO)

- `/llms.txt` (site map for assistants), `/llms-full.txt` (every device as Markdown), `/api/devices.json` and `/api/<category>.json` (published records plus a ready-made answer per ecosystem) are generated from the same data. Drafts never appear in them.
- Every device page has a visible "Quick answers" block ("Does X work with Y?") mirrored in FAQPage JSON-LD. The wording comes from `answerFor()` in `src/lib/devices.ts`, so the page, the FAQ, llms.txt and the API always agree.
- `robots.txt` explicitly allows AI search and assistant crawlers. Don't block them at Cloudflare (no Bot Fight Mode, no "Block AI bots"): the live site check warns if they get blocked.
- After each deploy, CI submits the sitemap URLs to IndexNow (Bing, Yandex…).

## Roadmap

- **Phase 1 (done):** Astro setup, schema and validation, agents, first smart plugs, GitHub Pages + Cloudflare deploy, security hardening, legal pages, SEO/GEO.
- **Phase 2 (in progress):** more devices and categories. Plugs, bulbs, locks, thermostats, sensors, cameras and doorbells, switches and dimmers, robot vacuums, hubs and bridges, and LED light strips are live. Each new category needs code: schema in `src/schema/device.ts`, plus registry and labels in `src/lib/categories.ts`. Comparison pages ("X vs Y") are live. Then filters and per-ecosystem buying guides.
- **Phase 3:** data freshness (re-verify records older than 6 months), contribution and corrections form, monetisation (see below).

## Current state (handoff, updated 2026-10-12)

Read this first if you are picking the project up.

### What is live on https://workswithwhat.com
- **Five languages:** English at the root, Spanish (Spain) under `/es/`, German under `/de/`, French under `/fr/` and Italian under `/it/`, page for page, with hreflang and a language switch.
- **194 verified devices:** 44 smart plugs (US, EU, UK), 19 smart bulbs (US, EU, UK), 24 smart locks (US, EU, UK), 15 smart thermostats (US, EU, UK), 13 smart sensors (US, EU, UK), 20 smart cameras and doorbells (US, EU, UK), 14 smart switches and dimmers (US, EU, UK), 12 robot vacuums (US, EU, UK), 27 hubs and bridges (US, EU, UK) and 6 LED light strips (US, EU), each with sourced compatibility for Apple Home, Google Home, Alexa, SmartThings and Home Assistant.
- **Pages:**
  - `/smart-plugs/`, `/smart-bulbs/`, `/smart-locks/`, `/smart-thermostats/`, `/smart-sensors/`, `/smart-cameras/`, `/smart-switches/`, `/robot-vacuums/`, `/smart-hubs/` and `/light-strips/`: comparison charts.
  - A page per device.
  - `/works-with/<ecosystem>/` and `/works-with/matter/`.
  - `/methodology/`, `/legal/` and `/privacy/`.
- **Regions:** every list split by market, region pages under `/us/`, `/eu/`, `/uk/` (and `/es/us/` …), a region switch in the header.
- **For AI assistants:** `/llms.txt`, `/llms-full.txt`, `/api/devices.json` and `/api/<category>.json`.

### Unfinished work
- **Hub links:** `src/lib/hubs.ts` maps a `via` name (Hue Bridge, DIRIGERA, SwitchBot Hub 2) to the hub record **in the same market**; device pages link to it next to the compatibility note, and hub pages list "Devices that work through the …" by category. Most Hue-via records are EU, Hue Bridge EU/UK, SwitchBot Hub 2 EU, Hive Hub and Lutron Caséta Smart Bridge are mapped too; append a slug to `HUB_NAMES` when you add a regional sibling. Generic names ("Aqara hub") stay unlinked on purpose.
- **Next:** more hubs: Aeotec Hub, Echo Show / Echo Hub, Apple TV 4K, Google Nest Hub, Hue Bridge Pro (US, UK). SmartThings Station has no Z-Wave or Ethernet (an earlier draft wrongly said so). Echo 4th gen, HomePod mini and the Station stay `matter.certified: null`: their CSA listings are software components or Zigbee-only. A one-model, multi-region product (e.g. ZBT-1) stays one record; it is listed under the first market in `MARKETS` order. LED strips are a cheap add on the bulb schema. Each new category needs schema and registry work first, as thermostats did. More thermostats (Honeywell T6 Pro, Bosch, Danfoss Ally) and sensors (US versions, IKEA MYGGBETT and KLIPPBOK, SwitchBot, Shelly) are also open. More cameras are open too (Arlo, Reolink, Wyze, Ring outdoor, eufy indoor). Arlo Essential Indoor (2nd gen) was dropped: its only Alexa source was on Arlo's staging host. Switches: a radio outside the enum (e.g. Lutron Clear Connect) means `radios: null` with a note, and a generic Zigbee coordinator (ZHA, Zigbee2MQTT) is `hub`, not `native`. For cameras, ecosystem notes say what works (live view, announcements, HomeKit Secure Video); Matter camera support is new, so never assume it. Lockly Secure Pro was dropped: no lockly.com page surfaced in search. Robot vacuums: Matter often arrives by firmware (Roborock); a maker's newsroom statement is accepted, but say in the note when no CSA listing names the model. Dropped: Shark EU (no official EU page), Cecotec Conga 11090 (no ecosystem confirmed). Open: more vacuums (Roborock Qrevo S, Ecovacs X-series, iRobot Combo 10 Max, Dreame X-series).
- **Bestsellers queue:** `docs/bestsellers/<market>.md` is the 2026-10-12 snapshot; its whole queue went through the pipeline that day (PRs #51, #52, #53 and #56). Dropped for weak official sourcing: Nest Learning Thermostat 4th gen (UK) (Google's UK store sells only the 3rd gen), Roborock Qrevo S and Dreame L10s Ultra (EU) (no EU maker page), Shark AI Ultra (one official page only), Ecovacs Deebot T30 Omni (EU) (no ecosystem confirmed, sold out), Meross MSS315 (UK) (no Meross page), Hue Lightstrip Plus V4 (Hue lists it as no longer available). Skipped as the same SKU as an existing record: Hue White and Colour Ambiance E27 (UK), tado X radiator thermostat (UK), Nuki Smart Lock 4th gen (UK). Round 2 (same day, top 10 per category, files overwritten) added 12 EU/UK devices (PRs #59 and #60), including two current Hue strips. Round 2 drops: Govee M1 (EU, UK) (no current product page; the EU listing is delisted), Hue Gradient Lightstrip (UK) (same SKU as the EU record). The Roomba Combo 10 Max (UK) stays `matter: null`: CSA lists only the US model. US round 2 added 9 devices (Kwikset Aura Reach, Honeywell T6 Pro, Wyze Lock Bolt v2, Ring Outdoor Cam, Apple TV 4K, Echo Show 5, Kasa EP40, Wyze Cam Pan v4, Ring Battery Doorbell 2K Plus). Dropped: Govee M1 (US) (only refurbished listings left). The rest of the `us.md` queue (batches 3–4) is open. Run `bestsellers` again next month.
- There is no EU Schuko Shelly Gen4 adapter yet; the Plug C Gen4 had no official page as of 2026-10-11.
- **Who decides content:** the owner doesn't pick devices or review content. Claude chooses what to add next and writes it, following the principles above.

### How content gets added (lessons learned)
- **What to add:** run `bestsellers` (one run per market, `us`, `eu`, `uk`, in parallel) about once a month, then feed its queue to the collector in batches. It only writes `docs/bestsellers/`; adding a new category it recommends needs schema and registry work first.
- **Batch size:** 5 devices per agent. Run collector, then verifier, then editor, then open a PR, then run the reviewer on it. Once CI is green and the reviewer says **Ready to merge**, Claude squash-merges (the owner asked for this on 2026-10-12); the `main` ruleset requires a PR and a green `build`. Run at most ~3 agents at once; more hits the account's usage limit.
- **Network:** curl can't open external sites. Since 2026-10-12 WebFetch works for most maker pages (amazon.com and eu.roborock.com refuse it), but its page summaries are sometimes wrong, so verifiers cross-check them. Agents must cite only URLs that appeared in search results or that they fetched.
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
- **Saving tokens without losing quality:**
  - Let scripts do the mechanical checks. `npm run validate` enforces principle 2 (no fact resting only on retailer or review sources), that every source backs a field (or has `"forCaveat": true`), banned words, no exclamation marks or summary questions, and unique summary openings. Fix what it reports instead of asking an agent to scan every record.
  - Use `npm run seo:diff` (page-by-page SEO comparison with `main`) and `npm run check:overflow` (no sideways scrolling at 320–1280 px). Never have an agent write its own.
  - Models: `collector`, `editor`, `reviewer` and `ux` run on Sonnet; the `verifier` keeps the default model because it's the quality gate for facts.
  - Scale the review to the diff: data-only PRs skip `seo:diff` and `check:overflow`.
  - Keep agent prompts focused and ask for short reports (about 10 lines per record). Give the verifier the collector's doubts so it doesn't rediscover them.
  - Fix small reviewer suggestions directly in the main session rather than spinning up another agent.
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
- **Email:** `info@workswithwhat.com` is a Cloudflare Email Routing rule that forwards to the owner's Gmail (no mailbox). The footer's "Tell us" link is a `mailto:` to it. Cloudflare Email Obfuscation rewrites `mailto:` links and needs a script the CSP blocks (visitors saw "[email protected]"), so every email link goes through `src/components/MailLink.astro`, which wraps it in `<!--email_off-->`; the site check fails if an obfuscated link reaches the live site. The footer and every category chart also have a "Can't find your device?" link (a `mailto:` with a prefilled subject and body).
- **Legal:** the site sets no cookies and has no trackers, so there is no consent banner. The privacy policy names GitHub Pages and Cloudflare as processors, plus Cloudflare Email Routing and Gmail for email. In `src/site.config.ts`, `OPERATOR` holds the operator details Spain's LSSI requires (name, NIF, address, email); they were filled in on 2026-10-12 and show on `/legal/` and `/es/aviso-legal/`.

### Owner's to-do list
- **Done 2026-10-12:** Google Search Console (domain property, sitemap submitted, indexing requested for the key EN/ES pages), Bing Webmaster Tools (imported from GSC), DNSSEC, DMARC at `p=none`, GitHub Pages domain verification, and a ruleset on `main` (PR required, 0 approvals, `build` check required, no force pushes or deletion; repository admins may bypass).
- Email: keep the SPF record Email Routing created (add `include:_spf.google.com` if replying as info@ from Gmail). Only move DMARC to `p=reject` once outgoing mail is DKIM-signed with the domain.
- HSTS in Cloudflare, once the site has been stable for a few days.
- Post the community texts from `docs/launch-kit.md` (Reddit, Home Assistant forum).
- **Cloudflare Cache Rule** (optional, speeds up repeat visits): cache `/_astro/*` at the edge and in browsers for a year; those files are content-hashed, so a new deploy never serves stale CSS.
- Post the Spanish community texts from `docs/launch-kit.md`.
- **Optional:** Cloudflare Web Analytics, which is cookieless. It needs its JS token. To add it, allow `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (connect) in the CSP, mention it in `/privacy/`, and change "no trackers" in the footer.

### Monetisation plan (agreed direction, not implemented)
**Rule:** no monetisation work (affiliate links, ads, paid API, newsletter, sponsorships, donation links, sign-ups) is implemented without the owner's explicit confirmation of that specific option. The `monetization` agent researches and proposes; it never builds. Ask the owner first even when an option below is marked as agreed direction.

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
npm run seo:diff   # after build: compare every page's SEO with origin/main
npm run check:overflow  # after build: no page or table scrolls sideways (global Playwright)
```
