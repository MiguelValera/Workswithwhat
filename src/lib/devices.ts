import { getCollection, type CollectionEntry } from 'astro:content';
import { ECOSYSTEMS, ECOSYSTEM_LABELS, type CategoryKey } from '../schema/device.ts';
import { CATEGORIES, categoryOf } from './categories';
import { ACTIVE_LANGS, formatDate as fmtDate, localize, pick, type Lang } from '../i18n/lang';
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
const STATUS_TEXT_IN: Record<Exclude<Lang, 'en'>, Record<keyof typeof STATUS_TEXT, string>> = {
  es: { native: 'Sí', matter: 'Vía Matter', hub: 'Vía hub', no: 'No', unknown: 'Sin confirmar' },
  de: { native: 'Ja', matter: 'Über Matter', hub: 'Über Hub', no: 'Nein', unknown: 'Nicht bestätigt' },
  fr: { native: 'Oui', matter: 'Via Matter', hub: 'Via hub', no: 'Non', unknown: 'Non confirmé' },
  it: { native: 'Sì', matter: 'Tramite Matter', hub: 'Tramite hub', no: 'No', unknown: 'Non confermato' },
};
export const statusText = (s: keyof typeof STATUS_TEXT, lang: Lang) => (lang === 'en' ? STATUS_TEXT[s] : STATUS_TEXT_IN[lang][s]);

/** "Yes", "No" or "Unconfirmed" (null) for a yes/no fact. */
export const yesNoText = (v: boolean | null, lang: Lang) => {
  const t = ui(lang);
  return v === null ? t.unconfirmed : v ? t.yes : t.no;
};

/** A device's Matter certification in words: "Yes, over Wi-Fi", "No" or "Unconfirmed". */
export function matterText(d: Device, lang: Lang) {
  const m = d.data.matter;
  if (!m.certified) return yesNoText(m.certified, lang);
  const transport = m.transport === 'wifi' ? WIFI[lang].word : m.transport === 'thread' ? 'Thread' : 'Ethernet';
  return pick(lang)({
    en: `Yes, over ${transport}`,
    es: `Sí, por ${transport}`,
    de: `Ja, über ${transport}`,
    fr: `Oui, en ${transport}`,
    it: `Sì, via ${transport}`,
  });
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
// how each language writes Wi-Fi (Spanish: "wifi"); other radios keep their names
export const WIFI: Record<Lang, { label: string; word: string }> = {
  en: { label: 'Wi-Fi', word: 'Wi-Fi' },
  es: { label: 'Wifi', word: 'wifi' },
  de: { label: 'WLAN', word: 'WLAN' },
  fr: { label: 'Wi-Fi', word: 'Wi-Fi' },
  it: { label: 'Wi-Fi', word: 'Wi-Fi' },
};
export const radioList = (radios: string[] | null, lang: Lang, sep = ', ') =>
  (radios ?? []).map((r) => (r === 'wifi' ? WIFI[lang].label : RADIO_LABELS[r])).join(sep);

/** English path of a device page; localize() it for other languages (see devicePathIn). */
export const devicePath = (d: Device) => `/${categoryOf(d.data).path}/${d.id}/`;

const AND: Record<Lang, string> = { en: 'and', es: 'y', de: 'und', fr: 'et', it: 'e' };
export const listJoin = (xs: string[], lang: Lang = 'en') =>
  xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${AND[lang]} ${xs.at(-1)}`;

// ---- Translated prose ----------------------------------------------------------

export type Translation = TranslationData;
const translationCache = new Map<Lang, Map<string, Translation>>();
/** A language's translations by slug (src/data/i18n/<lang>/); English has none. */
export async function getTranslations(lang: Lang): Promise<Map<string, Translation>> {
  if (lang === 'en') return new Map();
  if (!translationCache.has(lang)) {
    const entries = (await getCollection(`devices_${lang}` as 'devices')) as unknown as { id: string; data: Translation }[];
    translationCache.set(lang, new Map(entries.map((t) => [t.id, t.data])));
  }
  return translationCache.get(lang)!;
}

/**
 * A device's words in one language: the translation where one exists, English otherwise
 * (an untranslated record has no page in that language, but can still show up in its lists).
 */
export function deviceText(d: Device, lang: Lang, t?: Translation) {
  const tr = lang === 'en' ? undefined : t;
  const note = (key: string, en: string | undefined) => (en ? (tr?.notes[key] ?? en) : undefined);
  return {
    summary: tr?.summary ?? d.data.summary,
    caveats: tr?.caveats ?? d.data.caveats,
    note,
    compatNote: (e: Ecosystem) => note(`compatibility.${e}`, d.data.compatibility[e].note),
    via: (e: Ecosystem) => tr?.via?.[e] ?? d.data.compatibility[e].via,
    values: (tr?.values ?? {}) as Partial<Record<string, string>>,
  };
}
export type DeviceText = ReturnType<typeof deviceText>;

/** Languages a page about these devices exists in: English, plus each built language that translated them all. */
export async function langsFor(...devices: Device[]): Promise<Lang[]> {
  const out: Lang[] = [];
  for (const l of ACTIVE_LANGS) {
    const t = await getTranslations(l);
    if (l === 'en' || devices.every((d) => t.has(d.id))) out.push(l);
  }
  return out;
}

/** Path of a device page in a language: a translated page exists only for translated records. */
export function devicePathIn(d: Device, lang: Lang, translations?: Map<string, Translation>) {
  return lang !== 'en' && translations?.has(d.id) ? localize(devicePath(d), lang) : devicePath(d);
}

// Category names for titles and descriptions. Past three categories a full list
// makes titles too long, so titles say "smart home devices" and descriptions
// name the categories in brackets.
export const categoryPhrase = (plurals: string[], lang: Lang = 'en') => {
  if (plurals.length <= 3) return { short: listJoin(plurals, lang), long: listJoin(plurals, lang) };
  // the generic name, and what to strip from each category to list it in brackets
  const [short, strip] = pick(lang)<[string, RegExp]>({
    en: ['smart home devices', /^smart /],
    es: ['dispositivos domóticos', / inteligentes$/],
    de: ['Smart-Home-Geräte', /^smarte /],
    fr: ['appareils connectés', / connecté(e)?s$/],
    it: ['dispositivi smart home', / smart$/],
  });
  const bare = listJoin(plurals.map((p) => p.replace(strip, '')), lang);
  return { short, long: `${short} (${bare})` };
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
  const name = d.data.name;
  if (lang === 'de') {
    switch (c.status) {
      case 'native':
        return `Ja. ${name} funktioniert direkt mit ${label}.${note}`;
      case 'matter':
        return `Ja, über Matter: Füge es per Matter-Kopplung in ${label} hinzu.${thread ? ' Es nutzt Thread, du brauchst also auch einen Thread-Border-Router.' : ''}${note}`;
      case 'hub':
        return `Ja, aber nur über ${words.via(e)}.${note}`;
      case 'no':
        return `Nein.${note}`;
      default:
        return `Nicht bestätigt: Wir haben keine offizielle Quelle gefunden, die es bestätigt oder ausschließt.${note}`;
    }
  }
  if (lang === 'fr') {
    switch (c.status) {
      case 'native':
        return `Oui. ${name} fonctionne directement avec ${label}.${note}`;
      case 'matter':
        return `Oui, via Matter : ajoutez-le avec l’appairage Matter de ${label}.${thread ? ' Il utilise Thread, il vous faut donc aussi un routeur de bordure Thread.' : ''}${note}`;
      case 'hub':
        return `Oui, mais uniquement via ${words.via(e)}.${note}`;
      case 'no':
        return `Non.${note}`;
      default:
        return `Non confirmé : nous n’avons trouvé aucune source officielle qui le confirme ou l’exclue.${note}`;
    }
  }
  if (lang === 'it') {
    switch (c.status) {
      case 'native':
        return `Sì. ${name} funziona direttamente con ${label}.${note}`;
      case 'matter':
        return `Sì, tramite Matter: aggiungilo con l’abbinamento Matter di ${label}.${thread ? ' Usa Thread, quindi ti serve anche un border router Thread.' : ''}${note}`;
      case 'hub':
        return `Sì, ma solo tramite ${words.via(e)}.${note}`;
      case 'no':
        return `No.${note}`;
      default:
        return `Non confermato: non abbiamo trovato nessuna fonte ufficiale che lo confermi o lo escluda.${note}`;
    }
  }
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
  pick(lang)({
    en: `Does the ${d.data.name} work with Apple Home, Google Home or Alexa?`,
    es: `¿Es compatible ${d.data.name} con Apple Home, Google Home o Alexa?`,
    de: `Funktioniert ${d.data.name} mit Apple Home, Google Home oder Alexa?`,
    fr: `${d.data.name} est-il compatible avec Apple Home, Google Home ou Alexa ?`,
    it: `${d.data.name} è compatibile con Apple Home, Google Home o Alexa?`,
  });

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
