import { CATEGORIES, type Category } from './categories';
import type { Lang, LocaleLang } from '../i18n/lang';
import { ECOSYSTEMS, ecosystemPath, getPublishedDevices, worksWith, type Device } from './devices';

// Buyers shop in one market at a time, so lists are split by market instead of
// mixing a US plug with its EU sibling. A record belongs to the first market
// whose regions it lists (a US+CA record goes under "US & Canada").
export interface Market {
  key: string;
  /** "US & Canada": region switch, section headings */
  label: string;
  /** "US": titles, e.g. "US smart plug compatibility chart" */
  short: string;
  /** "the US and Canada": "Smart plugs for the US and Canada" */
  phrase: string;
  regions: string[];
  /** other languages; `phrase` follows "for" ("für", "pour", "per"), `inPhrase` says where it's sold ("in den USA und Kanada") */
  i18n: Record<LocaleLang, { label: string; short: string; phrase: string; inPhrase: string }>;
}

export const MARKETS: Market[] = [
  {
    key: 'us', label: 'US & Canada', short: 'US', phrase: 'the US and Canada', regions: ['US', 'CA'],
    i18n: {
      es: { label: 'EE. UU. y Canadá', short: 'EE. UU.', phrase: 'Estados Unidos y Canadá', inPhrase: 'en Estados Unidos y Canadá' },
      de: { label: 'USA und Kanada', short: 'US', phrase: 'die USA und Kanada', inPhrase: 'in den USA und Kanada' },
      fr: { label: 'États-Unis et Canada', short: 'US', phrase: 'les États-Unis et le Canada', inPhrase: 'aux États-Unis et au Canada' },
      it: { label: 'USA e Canada', short: 'USA', phrase: 'gli Stati Uniti e il Canada', inPhrase: 'negli Stati Uniti e in Canada' },
    },
  },
  {
    key: 'eu', label: 'Europe', short: 'EU', phrase: 'Europe', regions: ['EU'],
    i18n: {
      es: { label: 'Europa', short: 'UE', phrase: 'Europa', inPhrase: 'en Europa' },
      de: { label: 'Europa', short: 'EU', phrase: 'Europa', inPhrase: 'in Europa' },
      fr: { label: 'Europe', short: 'UE', phrase: 'l’Europe', inPhrase: 'en Europe' },
      it: { label: 'Europa', short: 'UE', phrase: 'l’Europa', inPhrase: 'in Europa' },
    },
  },
  {
    key: 'uk', label: 'UK', short: 'UK', phrase: 'the UK', regions: ['UK'],
    i18n: {
      es: { label: 'Reino Unido', short: 'Reino Unido', phrase: 'Reino Unido', inPhrase: 'en Reino Unido' },
      de: { label: 'Großbritannien', short: 'UK', phrase: 'Großbritannien', inPhrase: 'in Großbritannien' },
      fr: { label: 'Royaume-Uni', short: 'UK', phrase: 'le Royaume-Uni', inPhrase: 'au Royaume-Uni' },
      it: { label: 'Regno Unito', short: 'UK', phrase: 'il Regno Unito', inPhrase: 'nel Regno Unito' },
    },
  },
  {
    key: 'au', label: 'Australia', short: 'Australian', phrase: 'Australia', regions: ['AU'],
    i18n: {
      es: { label: 'Australia', short: 'Australia', phrase: 'Australia', inPhrase: 'en Australia' },
      de: { label: 'Australien', short: 'Australien', phrase: 'Australien', inPhrase: 'in Australien' },
      fr: { label: 'Australie', short: 'Australie', phrase: 'l’Australie', inPhrase: 'en Australie' },
      it: { label: 'Australia', short: 'Australia', phrase: 'l’Australia', inPhrase: 'in Australia' },
    },
  },
  {
    key: 'jp', label: 'Japan', short: 'Japanese', phrase: 'Japan', regions: ['JP'],
    i18n: {
      es: { label: 'Japón', short: 'Japón', phrase: 'Japón', inPhrase: 'en Japón' },
      de: { label: 'Japan', short: 'Japan', phrase: 'Japan', inPhrase: 'in Japan' },
      fr: { label: 'Japon', short: 'Japon', phrase: 'le Japon', inPhrase: 'au Japon' },
      it: { label: 'Giappone', short: 'Giappone', phrase: 'il Giappone', inPhrase: 'in Giappone' },
    },
  },
];

/** A market's names in one language. */
export const marketText = (m: Market, lang: Lang) => (lang === 'en' ? { label: m.label, short: m.short, phrase: m.phrase, inPhrase: `in ${m.phrase}` } : m.i18n[lang]);

export const marketOf = (d: Device) =>
  MARKETS.find((m) => d.data.regions.some((r) => m.regions.includes(r))) ?? MARKETS[0];

/** Devices grouped by market, in MARKETS order, empty markets left out. Order within a group is kept. */
export const byMarket = (devices: Device[]) =>
  MARKETS.map((market) => ({ market, devices: devices.filter((d) => marketOf(d) === market) })).filter(
    (g) => g.devices.length > 0,
  );

/** A region page needs at least this many devices, so no region page is thin. */
export const MIN_REGION_DEVICES = 3;

export async function getMarketDevices(market: Market) {
  return (await getPublishedDevices()).filter((d) => marketOf(d) === market);
}

/**
 * Every region page that exists (/us/, /us/smart-plugs/, /us/works-with/apple-home/, …).
 * The route files and the header's region switch both use this, so a link never points at a missing page.
 */
export async function getRegionPages() {
  const all = await getPublishedDevices();
  const pages: { market: Market; path: string }[] = [];
  for (const market of MARKETS) {
    const devices = all.filter((d) => marketOf(d) === market);
    const paths = [
      ...CATEGORIES.filter((c) => devices.filter((d) => d.data.category === c.key).length >= MIN_REGION_DEVICES).map(
        (c) => `/${market.key}/${c.path}/`,
      ),
      ...ECOSYSTEMS.filter((e) => devices.filter((d) => worksWith(d, e)).length >= MIN_REGION_DEVICES).map(
        (e) => `/${market.key}${ecosystemPath(e)}`,
      ),
      ...(devices.filter((d) => d.data.matter.certified).length >= MIN_REGION_DEVICES
        ? [`/${market.key}/works-with/matter/`]
        : []),
    ];
    if (paths.length) pages.push(...[`/${market.key}/`, ...paths].map((path) => ({ market, path })));
  }
  return pages;
}

/** Markets that have a region home page (/us/, /eu/, …). */
export async function getActiveMarkets() {
  const pages = await getRegionPages();
  return MARKETS.filter((m) => pages.some((p) => p.market === m));
}

/** The region version of a path, if it exists ("/smart-plugs/" → "/us/smart-plugs/"). */
export async function regionPath(market: Market, path: string) {
  const paths = new Set((await getRegionPages()).map((p) => p.path));
  const target = `/${market.key}${path}`;
  return paths.has(target) ? target : undefined;
}

/** A path's region version when there is one for `market`, else the all-regions path. */
export async function regionOrGlobal(market: Market | undefined, path: string) {
  return (market && (await regionPath(market, path))) || path;
}

/** Where a market's devices of one category are listed: its region chart, or its section of the full chart. */
export async function marketChartPath(market: Market, cat: Category) {
  return (await regionPath(market, `/${cat.path}/`)) ?? `/${cat.path}/#${market.key}`;
}
