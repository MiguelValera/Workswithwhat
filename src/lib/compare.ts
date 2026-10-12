// "X vs Y" comparison pages (/compare/<a>-vs-<b>/). Pairs are picked from the data, never
// by hand: two devices of the same category sold in the same market, and only pairs that
// differ somewhere (an identical pair has nothing to compare). Every such pair gets a page,
// so any two devices of the same type can be compared, but only each device's few closest
// rivals are indexed (`indexed`); the rest are noindex and stay out of the sitemap, so
// search engines don't get hundreds of near-identical pages.
import type { CategoryKey } from '../schema/device.ts';
import { catText, categoryOf, specFacts } from './categories';
import {
  ECOSYSTEMS,
  ECOSYSTEM_LABELS,
  deviceText,
  getPublishedDevices,
  listJoin,
  radioList,
  worksWith,
  type Device,
  type DeviceText,
  type Ecosystem,
  type Translation,
} from './devices';
import { marketOf, type Market } from './markets';
import type { Lang } from '../i18n/lang';

/** Indexed comparisons started from each device (it also appears in its rivals' picks). */
export const RIVALS_PER_DEVICE = 3;

// The fact that says what kind of device it is within its category; two devices of the
// same kind (two GU10 bulbs, two video doorbells) are the comparisons people look for.
const KIND_FACT: Partial<Record<CategoryKey, string>> = {
  'smart-bulb': 'bulbBase',
  'smart-lock': 'lockFit',
  'smart-thermostat': 'thermostatType',
  'smart-sensor': 'senses',
  'smart-camera': 'cameraType',
  'smart-switch': 'switchForm',
  'robot-vacuum': 'cleaning',
  'smart-hub': 'hubType',
};

export interface Comparison {
  /** a.id < b.id, so a pair has one URL */
  a: Device;
  b: Device;
  slug: string;
  market: Market;
  /** one of the closest rivals: indexed, in the sitemap, /compare/ and llms.txt */
  indexed: boolean;
}

export const comparePath = (c: { slug: string }) => `/compare/${c.slug}/`;

const factValue = (d: Device, key: string) => (d.data as unknown as Record<string, { value: unknown }>)[key]?.value;

function sameKind(a: Device, b: Device) {
  const key = KIND_FACT[a.data.category];
  if (!key) return true;
  const [x, y] = [factValue(a, key), factValue(b, key)];
  if (x === null || y === null) return false;
  if (Array.isArray(x) && Array.isArray(y)) return x.some((v) => y.includes(v));
  return x === y;
}

/** The rows of a comparison: Matter, each ecosystem, radio, hub, local control, category facts. */
export function compareRows(a: Device, b: Device, lang: Lang, ta?: DeviceText, tb?: DeviceText) {
  const es = lang === 'es';
  const yesNo = (v: boolean | null) => (v === null ? (es ? 'Sin confirmar' : 'Unconfirmed') : v ? (es ? 'Sí' : 'Yes') : 'No');
  const matter = (d: Device) => {
    const m = d.data.matter;
    if (m.certified === null) return es ? 'Sin confirmar' : 'Unconfirmed';
    if (!m.certified) return 'No';
    const t = m.transport === 'wifi' ? (es ? 'wifi' : 'Wi-Fi') : m.transport === 'thread' ? 'Thread' : 'Ethernet';
    return es ? `Sí, por ${t}` : `Yes, over ${t}`;
  };
  const [sa, sb] = [specFacts(a.data, lang, ta?.values), specFacts(b.data, lang, tb?.values)];
  return [
    { key: 'matter', label: 'Matter', a: matter(a), b: matter(b), sa: a.data.matter.sources, sb: b.data.matter.sources },
    {
      key: 'radios',
      label: 'Radio',
      a: radioList(a.data.radios.value, lang) || yesNo(null),
      b: radioList(b.data.radios.value, lang) || yesNo(null),
      sa: a.data.radios.sources,
      sb: b.data.radios.sources,
    },
    {
      key: 'hubRequired',
      label: es ? 'Necesita hub' : 'Hub required',
      a: yesNo(a.data.hubRequired.value),
      b: yesNo(b.data.hubRequired.value),
      sa: a.data.hubRequired.sources,
      sb: b.data.hubRequired.sources,
    },
    {
      key: 'localControl',
      label: es ? 'Control local' : 'Local control',
      a: yesNo(a.data.localControl.value),
      b: yesNo(b.data.localControl.value),
      sa: a.data.localControl.sources,
      sb: b.data.localControl.sources,
    },
    ...sa.map((s, i) => ({ key: s.key, label: s.label, a: s.text, b: sb[i].text, sa: s.fact.sources, sb: sb[i].fact.sources })),
  ];
}

/** True when two devices differ in at least one ecosystem or fact. */
function differ(a: Device, b: Device) {
  const eco = ECOSYSTEMS.some((e) => {
    const [x, y] = [a.data.compatibility[e], b.data.compatibility[e]];
    return x.status !== y.status || (x.status === 'hub' && x.via !== y.via);
  });
  return eco || compareRows(a, b, 'en').some((r) => r.a !== r.b);
}

// Closer rivals first: same kind of device, then the ecosystems both reach, then a shared radio.
function closeness(a: Device, b: Device) {
  const shared = ECOSYSTEMS.filter((e) => worksWith(a, e) && worksWith(b, e)).length;
  const radio = (a.data.radios.value ?? []).some((r) => (b.data.radios.value ?? []).includes(r)) ? 1 : 0;
  return (sameKind(a, b) ? 10 : 0) + shared + radio;
}

let cache: Comparison[] | undefined;

/** Every comparison page (indexed or not), sorted by category, market and names. */
export async function getComparisons(): Promise<Comparison[]> {
  if (cache) return cache;
  const devices = await getPublishedDevices();
  const pairs = new Map<string, Comparison>();
  for (const d of devices) {
    const market = marketOf(d);
    const rivals = devices
      .filter((o) => o.id !== d.id && o.data.category === d.data.category && marketOf(o) === market && differ(d, o))
      .map((o) => ({ o, score: closeness(d, o) }))
      .sort((x, y) => y.score - x.score || x.o.data.name.localeCompare(y.o.data.name));
    rivals.forEach(({ o }, i) => {
      const [a, b] = d.id < o.id ? [d, o] : [o, d];
      const slug = `${a.id}-vs-${b.id}`;
      const pair = pairs.get(slug) ?? { a, b, slug, market, indexed: false };
      pair.indexed ||= i < RIVALS_PER_DEVICE;
      pairs.set(slug, pair);
    });
  }
  const order = devices.map((d) => d.id);
  cache = [...pairs.values()].sort(
    (x, y) =>
      x.a.data.category.localeCompare(y.a.data.category) ||
      order.indexOf(x.a.id) - order.indexOf(y.a.id) ||
      order.indexOf(x.b.id) - order.indexOf(y.b.id),
  );
  return cache;
}

/** Comparisons that include a device, closest rivals (indexed) first. */
export async function comparisonsFor(device: Device) {
  return (await getComparisons())
    .filter((c) => c.a.id === device.id || c.b.id === device.id)
    .map((c) => ({ ...c, other: c.a.id === device.id ? c.b : c.a }))
    .sort((x, y) => Number(y.indexed) - Number(x.indexed));
}

/** "Tapo P110 (EU) vs Meross MSS210 (EU)" */
export const compareName = (c: Comparison) => `${c.a.data.name} vs ${c.b.data.name}`;

// ---- Wording -------------------------------------------------------------------
// Built only from the verified statuses, like answerFor(), so the page, its FAQ data and
// llms.txt say the same thing.

const how = (d: Device, e: Ecosystem, lang: Lang, words: DeviceText) => {
  const c = d.data.compatibility[e];
  const thread = c.status === 'matter' && d.data.matter.transport === 'thread';
  if (lang === 'es') {
    switch (c.status) {
      case 'native':
        return 'funciona directamente';
      case 'matter':
        return thread ? 'funciona mediante Matter por Thread (necesita un router de borde Thread)' : 'funciona mediante Matter';
      case 'hub':
        return `funciona a través de ${words.via(e)}`;
      case 'no':
        return 'no es compatible';
      default:
        return 'no está confirmado';
    }
  }
  switch (c.status) {
    case 'native':
      return 'works directly';
    case 'matter':
      return thread ? 'works through Matter over Thread (needs a Thread border router)' : 'works through Matter';
    case 'hub': {
      const via = c.via ?? '';
      return `works through ${/^(the|a|an) /i.test(via) ? via : `the ${via}`}`;
    }
    case 'no':
      return `doesn't work with ${ECOSYSTEM_LABELS[e]}`;
    default:
      return "isn't confirmed either way";
  }
};

const the = (d: Device) => `the ${d.data.name}`;
const cap = (s: string) => s.replace(/^./, (x) => x.toUpperCase());

/** "Which works with Apple Home?" answered for a pair. */
export function compareAnswer(c: Comparison, e: Ecosystem, lang: Lang, wa: DeviceText, wb: DeviceText): string {
  const { a, b } = c;
  const label = ECOSYSTEM_LABELS[e];
  const [x, y] = [a.data.compatibility[e].status, b.data.compatibility[e].status];
  const [ha, hb] = [how(a, e, lang, wa), how(b, e, lang, wb)];
  const [wA, wB] = [worksWith(a, e), worksWith(b, e)];
  const f = lang === 'es' && catText(categoryOf(a.data), 'es').gender === 'f';
  // "only X" needs the other side to be a sourced "no"; an unconfirmed one isn't a no
  if (lang === 'es') {
    if (x === y && ha === hb) {
      if (x === 'no') return `${f ? 'Ninguna' : 'Ninguno'} funciona con ${label}.`;
      if (x === 'unknown') return `Sin confirmar en los dos casos: no hemos encontrado ninguna fuente oficial que lo confirme o lo descarte.`;
      return `${f ? 'Las dos' : 'Los dos'} funcionan con ${label} ${ha.replace(/^funciona /, '')}.`;
    }
    const lead =
      wA && wB
        ? f ? 'Las dos' : 'Los dos'
        : wA || wB
          ? (wA ? y : x) === 'no'
            ? `Solo ${(wA ? a : b).data.name}`
            : `Solo está confirmado para ${(wA ? a : b).data.name}`
          : `${f ? 'Ninguna tiene' : 'Ninguno tiene'} compatibilidad confirmada con ${label}`;
    return `${lead}. ${a.data.name}: ${ha}; ${b.data.name}: ${hb}.`;
  }
  if (x === y && ha === hb) {
    if (x === 'no') return `Neither works with ${label}.`;
    if (x === 'unknown') return `Not confirmed for either: we couldn't find an official source either way.`;
    return `Both work with ${label} ${ha.replace(/^works /, '')}.`;
  }
  const lead =
    wA && wB
      ? 'Both'
      : wA || wB
        ? (wA ? y : x) === 'no'
          ? `Only ${the(wA ? a : b)}`
          : `Confirmed only for ${the(wA ? a : b)}`
        : `Neither is confirmed to work with ${label}`;
  return `${lead}. ${cap(the(a))} ${ha}; ${the(b)} ${hb}.`;
}

/**
 * Ecosystems grouped by who reaches them, for the summary at the top of a page.
 * `onlyA` means the other device is a sourced "no"; `confirmedA` means it is unconfirmed.
 */
export function compareSummary(c: Comparison) {
  const st = (d: Device, e: Ecosystem) => d.data.compatibility[e].status;
  const pick = (fn: (e: Ecosystem) => boolean) => ECOSYSTEMS.filter(fn);
  const [wA, wB] = [(e: Ecosystem) => worksWith(c.a, e), (e: Ecosystem) => worksWith(c.b, e)];
  return {
    both: pick((e) => wA(e) && wB(e)),
    onlyA: pick((e) => wA(e) && st(c.b, e) === 'no'),
    onlyB: pick((e) => wB(e) && st(c.a, e) === 'no'),
    confirmedA: pick((e) => wA(e) && st(c.b, e) === 'unknown'),
    confirmedB: pick((e) => wB(e) && st(c.a, e) === 'unknown'),
    neither: pick((e) => st(c.a, e) === 'no' && st(c.b, e) === 'no'),
    unconfirmed: pick((e) => !wA(e) && !wB(e) && !(st(c.a, e) === 'no' && st(c.b, e) === 'no')),
  };
}

/** The summary as sentences, for the top of the page. */
export function summaryLines(c: Comparison, lang: Lang) {
  const s = compareSummary(c);
  const n = (xs: Ecosystem[]) => listJoin(xs.map((e) => ECOSYSTEM_LABELS[e]), lang);
  const [A, B] = [c.a.data.name, c.b.data.name];
  const f = lang === 'es' && catText(categoryOf(c.a.data), 'es').gender === 'f';
  const lines: [Ecosystem[], string][] =
    lang === 'es'
      ? [
          [s.both, `${f ? 'Las dos' : 'Los dos'} funcionan con ${n(s.both)}.`],
          [s.onlyA, `Solo ${A} funciona con ${n(s.onlyA)}; ${B} no.`],
          [s.onlyB, `Solo ${B} funciona con ${n(s.onlyB)}; ${A} no.`],
          [s.confirmedA, `${A} funciona con ${n(s.confirmedA)}; en ${B} no está confirmado.`],
          [s.confirmedB, `${B} funciona con ${n(s.confirmedB)}; en ${A} no está confirmado.`],
          [s.neither, `${f ? 'Ninguna' : 'Ninguno'} funciona con ${n(s.neither)}.`],
          [s.unconfirmed, `${f ? 'Ninguna tiene' : 'Ninguno tiene'} compatibilidad confirmada con ${n(s.unconfirmed)}.`],
        ]
      : [
          [s.both, `Both work with ${n(s.both)}.`],
          [s.onlyA, `Only the ${A} works with ${n(s.onlyA)}; the ${B} doesn't.`],
          [s.onlyB, `Only the ${B} works with ${n(s.onlyB)}; the ${A} doesn't.`],
          [s.confirmedA, `The ${A} works with ${n(s.confirmedA)}; for the ${B} it isn't confirmed.`],
          [s.confirmedB, `The ${B} works with ${n(s.confirmedB)}; for the ${A} it isn't confirmed.`],
          [s.neither, `Neither works with ${n(s.neither)}.`],
          [s.unconfirmed, `Neither is confirmed to work with ${n(s.unconfirmed)}.`],
        ];
  return lines.filter(([xs]) => xs.length).map(([, text]) => text);
}

/** Meta description: what both reach and where they split. */
export function compareDescription(c: Comparison, lang: Lang) {
  const { both, onlyA, onlyB, confirmedA, confirmedB } = compareSummary(c);
  const names = (es: Ecosystem[]) => listJoin(es.map((e) => ECOSYSTEM_LABELS[e]), lang);
  const parts: string[] = [];
  if (lang === 'es') {
    if (both.length) parts.push(`los dos funcionan con ${names(both)}`);
    if (onlyA.length) parts.push(`solo ${c.a.data.name} con ${names(onlyA)}`);
    if (onlyB.length) parts.push(`solo ${c.b.data.name} con ${names(onlyB)}`);
    if (confirmedA.length) parts.push(`${names(confirmedA)} solo está confirmado para ${c.a.data.name}`);
    if (confirmedB.length) parts.push(`${names(confirmedB)} solo está confirmado para ${c.b.data.name}`);
    const lead = parts.length ? `${cap(parts.join('; '))}. ` : '';
    return `${lead}${c.a.data.name} frente a ${c.b.data.name}: Matter, ecosistemas, hub y especificaciones lado a lado, con fuentes.`;
  }
  if (both.length) parts.push(`both work with ${names(both)}`);
  if (onlyA.length) parts.push(`only ${the(c.a)} with ${names(onlyA)}`);
  if (onlyB.length) parts.push(`only ${the(c.b)} with ${names(onlyB)}`);
  if (confirmedA.length) parts.push(`${names(confirmedA)} confirmed only for ${the(c.a)}`);
  if (confirmedB.length) parts.push(`${names(confirmedB)} confirmed only for ${the(c.b)}`);
  const lead = parts.length ? `${cap(parts.join('; '))}. ` : '';
  return `${lead}${c.a.data.name} vs ${c.b.data.name}: Matter, ecosystems, hub needs and specs side by side, with sources.`;
}

/** deviceText for both sides of a pair. */
export const pairText = (c: Comparison, lang: Lang, translations: Map<string, Translation>) => ({
  wa: deviceText(c.a, lang, translations.get(c.a.id)),
  wb: deviceText(c.b, lang, translations.get(c.b.id)),
});
