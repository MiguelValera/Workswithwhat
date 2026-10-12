import { CATEGORY_KEYS, type CategoryKey, type DeviceData } from '../schema/device.ts';
import { formatNumber, type Lang, type LocaleLang } from '../i18n/lang';
import { ui } from '../i18n/ui';

type Spec = { key: string; label: string; labelIn: Record<LocaleLang, string>; format: (v: unknown, lang: Lang) => string };

/** A category's names in another language; `gender` picks "otros"/"otras" and similar agreement. */
export interface CategoryNames {
  label: string;
  navLabel: string;
  singular: string;
  plural: string;
  gender: 'm' | 'f' | 'n';
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
  i18n: Record<LocaleLang, CategoryNames>;
}

const yesNo = (v: unknown, lang: Lang) => (v ? ui(lang).yes : ui(lang).no);
// enum value → label, per language
const labels = (map: Record<string, Record<Lang, string>>) => (v: unknown, lang: Lang) => map[String(v)]?.[lang] ?? String(v);
const COLOR_LABELS = labels({
  white: { en: 'White only', es: 'Solo blanca' },
  'tunable-white': { en: 'Tunable white', es: 'Blanco regulable' },
  color: { en: 'Full colour', es: 'Color' },
});

const FIT_LABELS = labels({
  deadbolt: { en: 'Replaces deadbolt', es: 'Sustituye el cerrojo' },
  retrofit: { en: 'Retrofit (keeps keys)', es: 'Sobre el cilindro (mantiene las llaves)' },
  cylinder: { en: 'Euro cylinder', es: 'Cilindro europeo' },
  lever: { en: 'Lever handle', es: 'Manilla' },
});

const THERMOSTAT_LABELS = labels({
  wall: { en: 'Wall thermostat', es: 'Termostato de pared' },
  'radiator-valve': { en: 'Radiator valve', es: 'Válvula de radiador' },
});

const SENSE_LABELS = labels({
  contact: { en: 'Contact', es: 'Apertura' },
  motion: { en: 'Motion', es: 'Movimiento' },
  presence: { en: 'Presence', es: 'Presencia' },
  temperature: { en: 'Temperature', es: 'Temperatura' },
  humidity: { en: 'Humidity', es: 'Humedad' },
  leak: { en: 'Water leak', es: 'Fugas de agua' },
  light: { en: 'Light', es: 'Luz' },
  vibration: { en: 'Vibration', es: 'Vibración' },
  'air-quality': { en: 'Air quality', es: 'Calidad del aire' },
});

const CAMERA_LABELS = labels({
  indoor: { en: 'Indoor camera', es: 'Cámara de interior' },
  outdoor: { en: 'Outdoor camera', es: 'Cámara de exterior' },
  doorbell: { en: 'Video doorbell', es: 'Videotimbre' },
  floodlight: { en: 'Floodlight camera', es: 'Cámara con foco' },
});

const SWITCH_LABELS = labels({
  'wall-switch': { en: 'Wall switch', es: 'Interruptor de pared' },
  module: { en: 'In-wall module', es: 'Módulo empotrable' },
});

const CLEANING_LABELS = labels({
  vacuum: { en: 'Vacuum', es: 'Aspira' },
  'vacuum-mop': { en: 'Vacuum and mop', es: 'Aspira y friega' },
});

const HUB_LABELS = labels({
  hub: { en: 'Hub or bridge', es: 'Hub o pasarela' },
  'usb-dongle': { en: 'USB dongle', es: 'Dongle USB' },
  'speaker-display': { en: 'Speaker or display', es: 'Altavoz o pantalla' },
});

const PROTOCOL_LABELS = labels({
  zigbee: { en: 'Zigbee', es: 'Zigbee' },
  thread: { en: 'Thread', es: 'Thread' },
  'z-wave': { en: 'Z-Wave', es: 'Z-Wave' },
  bluetooth: { en: 'Bluetooth', es: 'Bluetooth' },
  infrared: { en: 'Infrared', es: 'Infrarrojos' },
  proprietary: { en: 'Proprietary radio', es: 'Radio propia' },
});

export const CATEGORIES: Category[] = [
  {
    key: 'smart-plug',
    i18n: { es: { label: 'Enchufes inteligentes', navLabel: 'Enchufes', singular: 'enchufe inteligente', plural: 'enchufes inteligentes', gender: 'm' } },
    path: 'smart-plugs',
    label: 'Smart plugs',
    navLabel: 'Plugs',
    singular: 'smart plug',
    plural: 'smart plugs',
    specs: [
      { key: 'energyMonitoring', label: 'Energy monitoring', labelIn: { es: 'Medición de consumo' }, format: yesNo },
      { key: 'maxLoadWatts', label: 'Max load', labelIn: { es: 'Carga máxima' }, format: (v, lang) => `${formatNumber(Number(v), lang)} W` },
    ],
  },
  {
    key: 'smart-bulb',
    i18n: { es: { label: 'Bombillas inteligentes', navLabel: 'Bombillas', singular: 'bombilla inteligente', plural: 'bombillas inteligentes', gender: 'f' } },
    path: 'smart-bulbs',
    label: 'Smart bulbs',
    navLabel: 'Bulbs',
    singular: 'smart bulb',
    plural: 'smart bulbs',
    specs: [
      { key: 'colorType', label: 'Light', labelIn: { es: 'Luz' }, format: COLOR_LABELS },
      { key: 'lumens', label: 'Brightness', labelIn: { es: 'Brillo' }, format: (v, lang) => `${formatNumber(Number(v), lang)} lm` },
      { key: 'bulbBase', label: 'Base', labelIn: { es: 'Casquillo' }, format: String },
    ],
  },
  {
    key: 'smart-lock',
    i18n: { es: { label: 'Cerraduras inteligentes', navLabel: 'Cerraduras', singular: 'cerradura inteligente', plural: 'cerraduras inteligentes', gender: 'f' } },
    path: 'smart-locks',
    label: 'Smart locks',
    navLabel: 'Locks',
    singular: 'smart lock',
    plural: 'smart locks',
    specs: [
      { key: 'lockFit', label: 'Fit', labelIn: { es: 'Montaje' }, format: FIT_LABELS },
      { key: 'keypad', label: 'Keypad', labelIn: { es: 'Teclado' }, format: yesNo },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación' }, format: String },
    ],
  },
  {
    key: 'smart-thermostat',
    i18n: { es: { label: 'Termostatos inteligentes', navLabel: 'Termostatos', singular: 'termostato inteligente', plural: 'termostatos inteligentes', gender: 'm' } },
    path: 'smart-thermostats',
    label: 'Smart thermostats',
    navLabel: 'Thermostats',
    singular: 'smart thermostat',
    plural: 'smart thermostats',
    specs: [
      { key: 'thermostatType', label: 'Type', labelIn: { es: 'Tipo' }, format: THERMOSTAT_LABELS },
      { key: 'systems', label: 'Controls', labelIn: { es: 'Controla' }, format: String },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación' }, format: String },
    ],
  },
  {
    key: 'smart-sensor',
    i18n: { es: { label: 'Sensores inteligentes', navLabel: 'Sensores', singular: 'sensor inteligente', plural: 'sensores inteligentes', gender: 'm' } },
    path: 'smart-sensors',
    label: 'Smart sensors',
    navLabel: 'Sensors',
    singular: 'smart sensor',
    plural: 'smart sensors',
    specs: [
      {
        key: 'senses',
        label: 'Senses',
        labelIn: { es: 'Detecta' },
        format: (v, lang) => (v as string[]).map((x) => SENSE_LABELS(x, lang)).join(', '),
      },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación' }, format: String },
    ],
  },
  {
    key: 'smart-camera',
    i18n: { es: { label: 'Cámaras y timbres inteligentes', navLabel: 'Cámaras', singular: 'cámara inteligente', plural: 'cámaras inteligentes', gender: 'f' } },
    path: 'smart-cameras',
    label: 'Smart cameras and doorbells',
    navLabel: 'Cameras',
    singular: 'smart camera',
    plural: 'smart cameras',
    specs: [
      { key: 'cameraType', label: 'Type', labelIn: { es: 'Tipo' }, format: CAMERA_LABELS },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación' }, format: String },
      { key: 'localStorage', label: 'Local recording', labelIn: { es: 'Grabación local' }, format: yesNo },
      { key: 'subscription', label: 'Paid plan needed for', labelIn: { es: 'Requiere suscripción para' }, format: String },
    ],
  },
  {
    key: 'smart-switch',
    i18n: { es: { label: 'Interruptores y reguladores inteligentes', navLabel: 'Interruptores', singular: 'interruptor inteligente', plural: 'interruptores inteligentes', gender: 'm' } },
    path: 'smart-switches',
    label: 'Smart switches and dimmers',
    navLabel: 'Switches',
    singular: 'smart switch',
    plural: 'smart switches',
    specs: [
      { key: 'switchForm', label: 'Form', labelIn: { es: 'Formato' }, format: SWITCH_LABELS },
      { key: 'dimmer', label: 'Dimmer', labelIn: { es: 'Regulable' }, format: yesNo },
      { key: 'neutralRequired', label: 'Needs neutral wire', labelIn: { es: 'Necesita neutro' }, format: yesNo },
      { key: 'gangs', label: 'Gangs / channels', labelIn: { es: 'Teclas / canales' }, format: String },
    ],
  },
  {
    key: 'robot-vacuum',
    i18n: { es: { label: 'Robots aspiradores', navLabel: 'Robots', singular: 'robot aspirador', plural: 'robots aspiradores', gender: 'm' } },
    path: 'robot-vacuums',
    label: 'Robot vacuums',
    navLabel: 'Vacuums',
    singular: 'robot vacuum',
    plural: 'robot vacuums',
    specs: [
      { key: 'cleaning', label: 'Cleaning', labelIn: { es: 'Limpieza' }, format: CLEANING_LABELS },
      { key: 'navigation', label: 'Navigation', labelIn: { es: 'Navegación' }, format: String },
      { key: 'suctionPa', label: 'Suction', labelIn: { es: 'Succión' }, format: (v, lang) => `${formatNumber(Number(v), lang)} Pa` },
      { key: 'selfEmptying', label: 'Self-emptying dock', labelIn: { es: 'Base de autovaciado' }, format: yesNo },
    ],
  },
  {
    key: 'smart-hub',
    i18n: { es: { label: 'Hubs y pasarelas', navLabel: 'Hubs', singular: 'hub', plural: 'hubs', gender: 'm' } },
    path: 'smart-hubs',
    label: 'Smart home hubs and bridges',
    navLabel: 'Hubs',
    singular: 'smart home hub',
    plural: 'smart home hubs',
    specs: [
      { key: 'hubType', label: 'Type', labelIn: { es: 'Tipo' }, format: HUB_LABELS },
      {
        key: 'deviceProtocols',
        label: 'Connects devices over',
        labelIn: { es: 'Conecta dispositivos por' },
        format: (v, lang) => (v as string[]).map((x) => PROTOCOL_LABELS(x, lang)).join(', '),
      },
      { key: 'matterBridge', label: 'Matter bridge', labelIn: { es: 'Puente Matter' }, format: yesNo },
      { key: 'threadBorderRouter', label: 'Thread border router', labelIn: { es: 'Router de borde Thread' }, format: yesNo },
      { key: 'maxDevices', label: 'Max devices', labelIn: { es: 'Máx. dispositivos' }, format: (v, lang) => formatNumber(Number(v), lang) },
    ],
  },
  {
    key: 'light-strip',
    i18n: { es: { label: 'Tiras LED inteligentes', navLabel: 'Tiras LED', singular: 'tira LED inteligente', plural: 'tiras LED inteligentes', gender: 'f' } },
    path: 'light-strips',
    label: 'Smart LED light strips',
    navLabel: 'Light strips',
    singular: 'smart light strip',
    plural: 'smart light strips',
    specs: [
      { key: 'colorType', label: 'Light', labelIn: { es: 'Luz' }, format: COLOR_LABELS },
      { key: 'lengthM', label: 'Length', labelIn: { es: 'Longitud' }, format: (v, lang) => `${formatNumber(Number(v), lang)} m` },
      { key: 'multiZone', label: 'Several colours at once', labelIn: { es: 'Varios colores a la vez' }, format: yesNo },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación' }, format: String },
    ],
  },
];

// keep the registry and the schema in step
if (CATEGORIES.map((c) => c.key).join() !== CATEGORY_KEYS.join()) throw new Error('CATEGORIES and CATEGORY_KEYS differ');

export const categoryOf = (d: { category: CategoryKey }) => CATEGORIES.find((c) => c.key === d.category)!;

type FactLike = { value: unknown; sources: string[]; note?: string };

/** A category's names in one language. */
export const catText = (cat: Category, lang: Lang): CategoryNames =>
  lang === 'en' ? { label: cat.label, navLabel: cat.navLabel, singular: cat.singular, plural: cat.plural, gender: 'm' } : cat.i18n[lang];

/**
 * Category-specific facts of a device, ready to display. `values` holds translated
 * wording for text facts (e.g. power "Batería recargable"); codes and numbers need none.
 */
export function specFacts(d: DeviceData, lang: Lang = 'en', values: Partial<Record<string, string>> = {}) {
  const facts = d as unknown as Record<string, FactLike>;
  return categoryOf(d).specs.map((s) => {
    const f = facts[s.key];
    const text = f.value === null ? ui(lang).unconfirmed : (lang !== 'en' && values[s.key]) || s.format(f.value, lang);
    return { key: s.key, label: lang === 'en' ? s.label : s.labelIn[lang], text, fact: f };
  });
}
