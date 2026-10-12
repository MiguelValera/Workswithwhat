import { CATEGORY_KEYS, type CategoryKey, type DeviceData } from '../schema/device.ts';
import { formatNumber, type Lang } from '../i18n/lang';

type Spec = { key: string; label: string; labelEs: string; format: (v: unknown, lang: Lang) => string };

/** Spanish names; `gender` picks "otros"/"otras" and similar agreement. */
export interface CategoryEs {
  label: string;
  navLabel: string;
  singular: string;
  plural: string;
  gender: 'm' | 'f';
}

export interface Category {
  key: CategoryKey;
  /** URL segment, e.g. /smart-plugs/ */
  path: string;
  /** "Smart plugs" */
  label: string;
  /** "Plugs": short label for the site header */
  navLabel: string;
  /** "smart plug" */
  singular: string;
  /** "smart plugs" */
  plural: string;
  /** Category-specific facts shown on device pages, in llms-full.txt and tables. */
  specs: Spec[];
  es: CategoryEs;
}

const yesNo = (v: unknown, lang: Lang) => (v ? (lang === 'es' ? 'Sí' : 'Yes') : 'No');
// enum value → label, per language
const labels = (map: Record<string, [string, string]>) => (v: unknown, lang: Lang) =>
  map[String(v)]?.[lang === 'es' ? 1 : 0] ?? String(v);
const COLOR_LABELS = labels({
  white: ['White only', 'Solo blanca'],
  'tunable-white': ['Tunable white', 'Blanco regulable'],
  color: ['Full colour', 'Color'],
});

const FIT_LABELS = labels({
  deadbolt: ['Replaces deadbolt', 'Sustituye el cerrojo'],
  retrofit: ['Retrofit (keeps keys)', 'Sobre el cilindro (mantiene las llaves)'],
  cylinder: ['Euro cylinder', 'Cilindro europeo'],
  lever: ['Lever handle', 'Manilla'],
});

const THERMOSTAT_LABELS = labels({
  wall: ['Wall thermostat', 'Termostato de pared'],
  'radiator-valve': ['Radiator valve', 'Válvula de radiador'],
});

const SENSE_LABELS = labels({
  contact: ['Contact', 'Apertura'],
  motion: ['Motion', 'Movimiento'],
  presence: ['Presence', 'Presencia'],
  temperature: ['Temperature', 'Temperatura'],
  humidity: ['Humidity', 'Humedad'],
  leak: ['Water leak', 'Fugas de agua'],
  light: ['Light', 'Luz'],
  vibration: ['Vibration', 'Vibración'],
  'air-quality': ['Air quality', 'Calidad del aire'],
});

const CAMERA_LABELS = labels({
  indoor: ['Indoor camera', 'Cámara de interior'],
  outdoor: ['Outdoor camera', 'Cámara de exterior'],
  doorbell: ['Video doorbell', 'Videotimbre'],
  floodlight: ['Floodlight camera', 'Cámara con foco'],
});

const SWITCH_LABELS = labels({
  'wall-switch': ['Wall switch', 'Interruptor de pared'],
  module: ['In-wall module', 'Módulo empotrable'],
});

export const CATEGORIES: Category[] = [
  {
    key: 'smart-plug',
    es: { label: 'Enchufes inteligentes', navLabel: 'Enchufes', singular: 'enchufe inteligente', plural: 'enchufes inteligentes', gender: 'm' },
    path: 'smart-plugs',
    label: 'Smart plugs',
    navLabel: 'Plugs',
    singular: 'smart plug',
    plural: 'smart plugs',
    specs: [
      { key: 'energyMonitoring', label: 'Energy monitoring', labelEs: 'Medición de consumo', format: yesNo },
      { key: 'maxLoadWatts', label: 'Max load', labelEs: 'Carga máxima', format: (v, lang) => `${formatNumber(Number(v), lang)} W` },
    ],
  },
  {
    key: 'smart-bulb',
    es: { label: 'Bombillas inteligentes', navLabel: 'Bombillas', singular: 'bombilla inteligente', plural: 'bombillas inteligentes', gender: 'f' },
    path: 'smart-bulbs',
    label: 'Smart bulbs',
    navLabel: 'Bulbs',
    singular: 'smart bulb',
    plural: 'smart bulbs',
    specs: [
      { key: 'colorType', label: 'Light', labelEs: 'Luz', format: COLOR_LABELS },
      { key: 'lumens', label: 'Brightness', labelEs: 'Brillo', format: (v, lang) => `${formatNumber(Number(v), lang)} lm` },
      { key: 'bulbBase', label: 'Base', labelEs: 'Casquillo', format: String },
    ],
  },
  {
    key: 'smart-lock',
    es: { label: 'Cerraduras inteligentes', navLabel: 'Cerraduras', singular: 'cerradura inteligente', plural: 'cerraduras inteligentes', gender: 'f' },
    path: 'smart-locks',
    label: 'Smart locks',
    navLabel: 'Locks',
    singular: 'smart lock',
    plural: 'smart locks',
    specs: [
      { key: 'lockFit', label: 'Fit', labelEs: 'Montaje', format: FIT_LABELS },
      { key: 'keypad', label: 'Keypad', labelEs: 'Teclado', format: yesNo },
      { key: 'power', label: 'Power', labelEs: 'Alimentación', format: String },
    ],
  },
  {
    key: 'smart-thermostat',
    es: { label: 'Termostatos inteligentes', navLabel: 'Termostatos', singular: 'termostato inteligente', plural: 'termostatos inteligentes', gender: 'm' },
    path: 'smart-thermostats',
    label: 'Smart thermostats',
    navLabel: 'Thermostats',
    singular: 'smart thermostat',
    plural: 'smart thermostats',
    specs: [
      { key: 'thermostatType', label: 'Type', labelEs: 'Tipo', format: THERMOSTAT_LABELS },
      { key: 'systems', label: 'Controls', labelEs: 'Controla', format: String },
      { key: 'power', label: 'Power', labelEs: 'Alimentación', format: String },
    ],
  },
  {
    key: 'smart-sensor',
    es: { label: 'Sensores inteligentes', navLabel: 'Sensores', singular: 'sensor inteligente', plural: 'sensores inteligentes', gender: 'm' },
    path: 'smart-sensors',
    label: 'Smart sensors',
    navLabel: 'Sensors',
    singular: 'smart sensor',
    plural: 'smart sensors',
    specs: [
      {
        key: 'senses',
        label: 'Senses',
        labelEs: 'Detecta',
        format: (v, lang) => (v as string[]).map((x) => SENSE_LABELS(x, lang)).join(', '),
      },
      { key: 'power', label: 'Power', labelEs: 'Alimentación', format: String },
    ],
  },
  {
    key: 'smart-camera',
    es: { label: 'Cámaras y timbres inteligentes', navLabel: 'Cámaras', singular: 'cámara inteligente', plural: 'cámaras inteligentes', gender: 'f' },
    path: 'smart-cameras',
    label: 'Smart cameras and doorbells',
    navLabel: 'Cameras',
    singular: 'smart camera',
    plural: 'smart cameras',
    specs: [
      { key: 'cameraType', label: 'Type', labelEs: 'Tipo', format: CAMERA_LABELS },
      { key: 'power', label: 'Power', labelEs: 'Alimentación', format: String },
      { key: 'localStorage', label: 'Local recording', labelEs: 'Grabación local', format: yesNo },
      { key: 'subscription', label: 'Paid plan needed for', labelEs: 'Requiere suscripción para', format: String },
    ],
  },
  {
    key: 'smart-switch',
    es: { label: 'Interruptores y reguladores inteligentes', navLabel: 'Interruptores', singular: 'interruptor inteligente', plural: 'interruptores inteligentes', gender: 'm' },
    path: 'smart-switches',
    label: 'Smart switches and dimmers',
    navLabel: 'Switches',
    singular: 'smart switch',
    plural: 'smart switches',
    specs: [
      { key: 'switchForm', label: 'Form', labelEs: 'Formato', format: SWITCH_LABELS },
      { key: 'dimmer', label: 'Dimmer', labelEs: 'Regulable', format: yesNo },
      { key: 'neutralRequired', label: 'Needs neutral wire', labelEs: 'Necesita neutro', format: yesNo },
      { key: 'gangs', label: 'Gangs / channels', labelEs: 'Teclas / canales', format: String },
    ],
  },
];

// keep the registry and the schema in step
if (CATEGORIES.map((c) => c.key).join() !== CATEGORY_KEYS.join()) throw new Error('CATEGORIES and CATEGORY_KEYS differ');

export const categoryOf = (d: { category: CategoryKey }) => CATEGORIES.find((c) => c.key === d.category)!;
export const categoryByPath = (path: string) => CATEGORIES.find((c) => c.path === path);

type FactLike = { value: unknown; sources: string[]; note?: string };

/** A category's names in one language. */
export const catText = (cat: Category, lang: Lang) =>
  lang === 'es'
    ? cat.es
    : { label: cat.label, navLabel: cat.navLabel, singular: cat.singular, plural: cat.plural, gender: 'm' as const };

/**
 * Category-specific facts of a device, ready to display. `values` holds translated
 * wording for text facts (e.g. power "Batería recargable"); codes and numbers need none.
 */
export function specFacts(d: DeviceData, lang: Lang = 'en', values: Partial<Record<string, string>> = {}) {
  const facts = d as unknown as Record<string, FactLike>;
  return categoryOf(d).specs.map((s) => {
    const f = facts[s.key];
    const text =
      f.value === null
        ? lang === 'es'
          ? 'Sin confirmar'
          : 'Unconfirmed'
        : (lang === 'es' && values[s.key]) || s.format(f.value, lang);
    return { key: s.key, label: lang === 'es' ? s.labelEs : s.label, text, fact: f };
  });
}
