// Languages and localized URLs. English lives at the root (/smart-plugs/), every other
// language under its own prefix with its own path segments (/es/enchufes-inteligentes/).
// Every page is written against its English path; localize() turns it into the current language.
import { ENABLED_LANGS } from '../site.config.ts';

export const LANGS = ['en', 'es'] as const;
export type Lang = (typeof LANGS)[number];
/** languages other than English: each one lives under /<lang>/ */
export type LocaleLang = Exclude<Lang, 'en'>;
export const LOCALE_LANGS = LANGS.filter((l): l is LocaleLang => l !== 'en');
/** languages that get built */
export const ACTIVE_LANGS: Lang[] = LANGS.filter((l) => l === 'en' || (ENABLED_LANGS as readonly string[]).includes(l));

export const HTML_LANG: Record<Lang, string> = { en: 'en', es: 'es-ES' };
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', es: 'es_ES' };
export const LANG_NAMES: Record<Lang, string> = { en: 'English', es: 'Español' };
/** locale for numbers and dates */
const NUMBER_LOCALE: Record<Lang, string> = { en: 'en-US', es: 'es-ES' };

/** One value per language, picked for the current one: T({ en: 'Specs', es: 'Especificaciones' }). */
export const pick =
  (lang: Lang) =>
  <V>(m: Record<Lang, V>): V =>
    m[lang];

// English path segment → localized one. Device slugs, ecosystem slugs and market codes stay as they are.
const SEGMENTS: Record<LocaleLang, Record<string, string>> = {
  es: {
    'smart-plugs': 'enchufes-inteligentes',
    'smart-bulbs': 'bombillas-inteligentes',
    'smart-locks': 'cerraduras-inteligentes',
    'smart-thermostats': 'termostatos-inteligentes',
    'smart-sensors': 'sensores-inteligentes',
    'smart-cameras': 'camaras-y-timbres',
    'smart-switches': 'interruptores-inteligentes',
    'robot-vacuums': 'robots-aspiradores',
    'smart-hubs': 'hubs-y-pasarelas',
    'light-strips': 'tiras-led',
    'works-with': 'compatible-con',
    compare: 'comparar',
    methodology: 'metodologia',
    legal: 'aviso-legal',
    privacy: 'privacidad',
  },
};
const SEGMENTS_EN = Object.fromEntries(
  LOCALE_LANGS.map((l) => [l, Object.fromEntries(Object.entries(SEGMENTS[l]).map(([en, x]) => [x, en]))]),
) as Record<LocaleLang, Record<string, string>>;

export const segmentIn = (en: string, lang: Lang) => (lang === 'en' ? en : (SEGMENTS[lang][en] ?? en));

export const langOf = (pathname: string): Lang =>
  LOCALE_LANGS.find((l) => pathname === `/${l}/` || pathname.startsWith(`/${l}/`)) ?? 'en';

/** "/smart-plugs/x/#y" → "/es/enchufes-inteligentes/x/#y" for Spanish; unchanged for English. */
export function localize(enPath: string, lang: Lang): string {
  if (lang === 'en' || !enPath.startsWith('/')) return enPath;
  const [path, hash] = enPath.split('#');
  const segs = path.split('/').filter(Boolean).map((s) => SEGMENTS[lang][s] ?? s);
  return `/${lang}/${segs.length ? `${segs.join('/')}/` : ''}${hash !== undefined ? `#${hash}` : ''}`;
}

/** The English path of any page ("/es/enchufes-inteligentes/" → "/smart-plugs/"). */
export function toEnglish(pathname: string): string {
  const lang = langOf(pathname);
  if (lang === 'en') return pathname;
  const segs = pathname.slice(lang.length + 1).split('/').filter(Boolean).map((s) => SEGMENTS_EN[lang][s] ?? s);
  return `/${segs.length ? `${segs.join('/')}/` : ''}`;
}

/** "smart plugs" → "Smart plugs" */
export const capitalize = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/** Locale-formatted number and date. */
export const formatNumber = (n: number, lang: Lang) => n.toLocaleString(NUMBER_LOCALE[lang]);
export const formatDate = (iso: string, lang: Lang = 'en') =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(NUMBER_LOCALE[lang], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
