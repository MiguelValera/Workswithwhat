import { getCollection, type CollectionEntry } from 'astro:content';
import { ECOSYSTEMS, ECOSYSTEM_LABELS, type CategoryKey } from '../schema/device.ts';
import { CATEGORIES, categoryOf } from './categories';
import { formatDate as fmtDate, localize, type Lang } from '../i18n/lang';
import { ui } from '../i18n/ui';
import type { TranslationData } from '../schema/translation.ts';

export type Device = CollectionEntry<'devices'>;
export type Ecosystem = (typeof ECOSYSTEMS)[number];

export { ECOSYSTEMS, ECOSYSTEM_LABELS };

// Drafts never reach the public site; only records the verifier signed off.
// `astro dev` shows drafts too, so they can be reviewed before publishing.
export async function getPublishedDevices(category?: CategoryKey): Promise<Device[]> {
  const all = await getCollection(
    'devices',
    (d) => (import.meta.env.DEV || d.data.status === 'verified') && (!category || d.data.category === category),
  );
  return all.sort((a, b) => `${a.data.brand} ${a.data.name}`.localeCompare(`${b.data.brand} ${b.data.name}`));
}

export const ecosystemSlug = (e: string) => e.replace(/_/g, '-');
/** English path of an ecosystem page, e.g. /works-with/apple-home/ */
export const ecosystemPath = (e: Ecosystem) => `/works-with/${ecosystemSlug(e)}/`;

export const STATUS_TEXT = {
  native: 'Yes',
  matter: 'Via Matter',
  hub: 'Via hub',
  no: 'No',
  unknown: 'Unconfirmed',
} as const;
export const STATUS_TEXT_ES: Record<keyof typeof STATUS_TEXT, string> = {
  native: 'Sí',
  matter: 'Vía Matter',
  hub: 'Vía hub',
  no: 'No',
  unknown: 'Sin confirmar',
};
export const statusText = (s: keyof typeof STATUS_TEXT, lang: Lang) => (lang === 'es' ? STATUS_TEXT_ES[s] : STATUS_TEXT[s]);

/** "Yes", "No" or "Unconfirmed" (null) for a yes/no fact. */
export const yesNoText = (v: boolean | null, lang: Lang) => {
  const t = ui(lang);
  return v === null ? t.unconfirmed : v ? t.yes : t.no;
};

/** A device's Matter certification in words: "Yes, over Wi-Fi", "No" or "Unconfirmed". */
export function matterText(d: Device, lang: Lang) {
  const m = d.data.matter;
  if (!m.certified) return yesNoText(m.certified, lang);
  const es = lang === 'es';
  const transport = m.transport === 'wifi' ? (es ? 'wifi' : 'Wi-Fi') : m.transport === 'thread' ? 'Thread' : 'Ethernet';
  return es ? `Sí, por ${transport}` : `Yes, over ${transport}`;
}

/** "Hue Bridge" → "the Hue Bridge"; names that already start with an article stay as they are. */
export const withArticle = (name: string) => (/^(the|a|an) /i.test(name) ? name : `the ${name}`);

export const worksWith = (d: Device, e: Ecosystem) => {
  const s = d.data.compatibility[e].status;
  return s === 'native' || s === 'matter' || s === 'hub';
};

export const RADIO_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  thread: 'Thread',
  zigbee: 'Zigbee',
  'z-wave': 'Z-Wave',
  bluetooth: 'Bluetooth',
  ethernet: 'Ethernet',
};

export const formatDate = fmtDate;
export const radioList = (radios: string[] | null, lang: Lang, sep = ', ') =>
  (radios ?? []).map((r) => (r === 'wifi' && lang === 'es' ? 'Wifi' : RADIO_LABELS[r])).join(sep);

/** English path of a device page; localize() it for other languages (see devicePathIn). */
export const devicePath = (d: Device) => `/${categoryOf(d.data).path}/${d.id}/`;

export const listJoin = (xs: string[], lang: Lang = 'en') =>
  xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${lang === 'es' ? 'y' : 'and'} ${xs.at(-1)}`;

// ---- Spanish prose -------------------------------------------------------------

export type Translation = TranslationData;
let esCache: Map<string, Translation> | undefined;
/** Spanish translations by slug (src/data/i18n/es/). */
export async function getTranslations(): Promise<Map<string, Translation>> {
  esCache ??= new Map((await getCollection('devicesEs')).map((t) => [t.id, t.data]));
  return esCache;
}

/**
 * A device's words in one language: Spanish where a translation exists, English otherwise
 * (an untranslated record has no Spanish page, but can still show up in a Spanish list).
 */
export function deviceText(d: Device, lang: Lang, t?: Translation) {
  const es = lang === 'es' ? t : undefined;
  const note = (key: string, en: string | undefined) => (en ? (es?.notes[key] ?? en) : undefined);
  return {
    summary: es?.summary ?? d.data.summary,
    caveats: es?.caveats ?? d.data.caveats,
    note,
    compatNote: (e: Ecosystem) => note(`compatibility.${e}`, d.data.compatibility[e].note),
    via: (e: Ecosystem) => es?.via?.[e] ?? d.data.compatibility[e].via,
    values: (es?.values ?? {}) as Partial<Record<string, string>>,
  };
}
export type DeviceText = ReturnType<typeof deviceText>;

/** Path of a device page in a language: the Spanish page exists only for translated records. */
export function devicePathIn(d: Device, lang: Lang, translations?: Map<string, Translation>) {
  return lang === 'es' && translations?.has(d.id) ? localize(devicePath(d), 'es') : devicePath(d);
}

// Category names for titles and descriptions. Past three categories a full list
// makes titles too long, so titles say "smart home devices" and descriptions
// name the categories in brackets.
export const categoryPhrase = (plurals: string[], lang: Lang = 'en') => {
  if (plurals.length <= 3) return { short: listJoin(plurals, lang), long: listJoin(plurals, lang) };
  if (lang === 'es') {
    const bare = listJoin(plurals.map((p) => p.replace(/ inteligentes$/, '')), lang);
    return { short: 'dispositivos domóticos', long: `dispositivos domóticos (${bare})` };
  }
  const bare = listJoin(plurals.map((p) => p.replace(/^smart /, '')));
  return { short: 'smart home devices', long: `smart home devices (${bare})` };
};

const ensureStop = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

// One plain answer per device × ecosystem, built only from verified data. Used on
// device pages, in FAQ structured data, llms.txt and the JSON API, so they always agree.
export function answerFor(d: Device, e: Ecosystem, lang: Lang = 'en', text?: DeviceText): string {
  const c = d.data.compatibility[e];
  const label = ECOSYSTEM_LABELS[e];
  const words = text ?? deviceText(d, lang);
  const n = words.compatNote(e);
  const note = n ? ` ${ensureStop(n)}` : '';
  const thread = d.data.matter.transport === 'thread';
  if (lang === 'es') {
    switch (c.status) {
      case 'native':
        return `Sí. ${d.data.name} funciona con ${label} directamente.${note}`;
      case 'matter':
        return `Sí, mediante Matter: añádelo con el emparejamiento Matter de ${label}.${thread ? ' Usa Thread, así que también necesitas un router de borde Thread.' : ''}${note}`;
      case 'hub':
        return `Sí, pero solo a través de ${words.via(e)}.${note}`;
      case 'no':
        return `No.${note}`;
      default:
        return `Sin confirmar: no hemos encontrado ninguna fuente oficial que lo confirme o lo descarte.${note}`;
    }
  }
  switch (c.status) {
    case 'native':
      return `Yes. The ${d.data.name} works with ${label} directly.${note}`;
    case 'matter': {
      const possessive = label.endsWith('s') ? `${label}'` : `${label}'s`;
      return `Yes, through Matter: add it with ${possessive} Matter pairing.${thread ? ' It uses Thread, so you also need a Thread border router.' : ''}${note}`;
    }
    case 'hub':
      return `Yes, but only through ${withArticle(c.via!)}.${note}`;
    case 'no':
      return `No.${note}`;
    default:
      return `Not confirmed. We couldn't find an official source either way.${note}`;
  }
}

export const deviceTitle = (d: Device, lang: Lang = 'en') =>
  lang === 'es'
    ? `¿Es compatible ${d.data.name} con Apple Home, Google Home o Alexa?`
    : `Does the ${d.data.name} work with Apple Home, Google Home or Alexa?`;

// "Name (model)", leaving the model out when the name already says it ("Tapo P110 (EU)", not "Tapo P110 (EU) (Tapo P110)")
export const nameWithModel = (d: Device) => {
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const name = flat(d.data.name.replace(/\s*\([^)]*\)$/, ''));
  const model = flat(d.data.model);
  return name.includes(model) || model.includes(name) ? d.data.name : `${d.data.name} (${d.data.model})`;
};

/** Categories that have at least one published device (only these get pages). */
export async function getActiveCategories() {
  const devices = await getPublishedDevices();
  return CATEGORIES.filter((c) => devices.some((d) => d.data.category === c.key));
}
