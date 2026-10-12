// Languages and localized URLs. English lives at the root (/smart-plugs/), Spanish
// under /es/ with Spanish path segments (/es/enchufes-inteligentes/). Every page is
// written against its English path; localize() turns it into the current language.
import { ES_ENABLED } from '../site.config';

export const LANGS = ['en', 'es'] as const;
export type Lang = (typeof LANGS)[number];
/** languages that get built */
export const ACTIVE_LANGS: Lang[] = ES_ENABLED ? ['en', 'es'] : ['en'];

export const HTML_LANG: Record<Lang, string> = { en: 'en', es: 'es-ES' };
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', es: 'es_ES' };
export const LANG_NAMES: Record<Lang, string> = { en: 'English', es: 'Español' };

// English path segment → Spanish. Device slugs, ecosystem slugs and market codes stay as they are.
const SEGMENTS_ES: Record<string, string> = {
  'smart-plugs': 'enchufes-inteligentes',
  'smart-bulbs': 'bombillas-inteligentes',
  'smart-locks': 'cerraduras-inteligentes',
  'smart-thermostats': 'termostatos-inteligentes',
  'smart-sensors': 'sensores-inteligentes',
  'smart-cameras': 'camaras-y-timbres',
  'smart-switches': 'interruptores-inteligentes',
  'robot-vacuums': 'robots-aspiradores',
  'smart-hubs': 'hubs-y-pasarelas',
  'works-with': 'compatible-con',
  methodology: 'metodologia',
  legal: 'aviso-legal',
  privacy: 'privacidad',
};
const SEGMENTS_EN = Object.fromEntries(Object.entries(SEGMENTS_ES).map(([en, es]) => [es, en]));

export const segmentEs = (en: string) => SEGMENTS_ES[en] ?? en;

export const langOf = (pathname: string): Lang => (pathname === '/es/' || pathname.startsWith('/es/') ? 'es' : 'en');

/** "/smart-plugs/x/#y" → "/es/enchufes-inteligentes/x/#y" for Spanish; unchanged for English. */
export function localize(enPath: string, lang: Lang): string {
  if (lang === 'en' || !enPath.startsWith('/')) return enPath;
  const [path, hash] = enPath.split('#');
  const segs = path.split('/').filter(Boolean).map((s) => SEGMENTS_ES[s] ?? s);
  return `/es/${segs.length ? `${segs.join('/')}/` : ''}${hash !== undefined ? `#${hash}` : ''}`;
}

/** The English path of any page ("/es/enchufes-inteligentes/" → "/smart-plugs/"). */
export function toEnglish(pathname: string): string {
  if (langOf(pathname) === 'en') return pathname;
  const segs = pathname.slice(3).split('/').filter(Boolean).map((s) => SEGMENTS_EN[s] ?? s);
  return `/${segs.length ? `${segs.join('/')}/` : ''}`;
}

/** Locale-formatted number and date. */
export const formatNumber = (n: number, lang: Lang) => n.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
export const formatDate = (iso: string, lang: Lang = 'en') =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
