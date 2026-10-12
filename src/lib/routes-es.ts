// Every Spanish page (/es/…), derived from the English ones so the two sites always
// match page for page. Nothing is returned while ES_ENABLED is off.
import { CATEGORIES } from './categories';
import { ECOSYSTEMS, ecosystemPath, getPublishedDevices, getTranslations, type Ecosystem, type Device } from './devices';
import { getRegionPages, marketOf, type Market } from './markets';
import { comparePath, getComparisons, type Comparison } from './compare';
import { localize } from '../i18n/lang';
import { ES_ENABLED } from '../site.config';
import type { Category } from './categories';

export type EsPage =
  | { kind: 'home' }
  | { kind: 'methodology' | 'legal' | 'privacy' | 'ecosystems' | 'matter' }
  | { kind: 'chart'; cat: Category; devices: Device[]; market?: Market }
  | { kind: 'market'; market: Market; devices: Device[] }
  | { kind: 'ecosystem'; eco: Ecosystem; market?: Market }
  | { kind: 'regionMatter'; market: Market }
  | { kind: 'device'; device: Device; devices: Device[] }
  | { kind: 'compareIndex' }
  | { kind: 'compare'; comparison: Comparison };

/** Spanish pages keyed by their path segments after /es/. */
export async function getEsPages(): Promise<{ segments: string[]; page: EsPage }[]> {
  if (!ES_ENABLED) return [];
  const all = await getPublishedDevices();
  const translations = await getTranslations();
  const pages: { en: string; page: EsPage }[] = [
    { en: '/', page: { kind: 'home' } },
    { en: '/methodology/', page: { kind: 'methodology' } },
    { en: '/legal/', page: { kind: 'legal' } },
    { en: '/privacy/', page: { kind: 'privacy' } },
    { en: '/works-with/', page: { kind: 'ecosystems' } },
    { en: '/works-with/matter/', page: { kind: 'matter' } },
    ...ECOSYSTEMS.map((eco) => ({ en: ecosystemPath(eco), page: { kind: 'ecosystem' as const, eco } })),
  ];
  for (const cat of CATEGORIES) {
    const devices = all.filter((d) => d.data.category === cat.key);
    if (devices.length) pages.push({ en: `/${cat.path}/`, page: { kind: 'chart', cat, devices } });
    // a device gets a Spanish page once its prose is translated
    for (const device of devices)
      if (translations.has(device.id)) pages.push({ en: `/${cat.path}/${device.id}/`, page: { kind: 'device', device, devices: all } });
  }
  pages.push({ en: '/compare/', page: { kind: 'compareIndex' } });
  for (const comparison of await getComparisons())
    if (translations.has(comparison.a.id) && translations.has(comparison.b.id))
      pages.push({ en: comparePath(comparison), page: { kind: 'compare', comparison } });
  for (const { market, path } of await getRegionPages()) {
    const mine = all.filter((d) => marketOf(d) === market);
    const rest = path.slice(market.key.length + 1);
    const cat = CATEGORIES.find((c) => rest === `/${c.path}/`);
    const eco = ECOSYSTEMS.find((e) => rest === ecosystemPath(e));
    const page: EsPage | undefined =
      rest === '/'
        ? { kind: 'market', market, devices: mine }
        : cat
          ? { kind: 'chart', cat, devices: mine.filter((d) => d.data.category === cat.key), market }
          : eco
            ? { kind: 'ecosystem', eco, market }
            : rest === '/works-with/matter/'
              ? { kind: 'regionMatter', market }
              : undefined;
    if (page) pages.push({ en: path, page });
  }
  return pages.map(({ en, page }) => ({ segments: localize(en, 'es').split('/').filter(Boolean).slice(1), page }));
}
