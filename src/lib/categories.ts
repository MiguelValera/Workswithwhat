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
  white: { en: 'White only', es: 'Solo blanca', de: 'Nur Weiß', fr: 'Blanc uniquement', it: 'Solo bianco' },
  'tunable-white': { en: 'Tunable white', es: 'Blanco regulable', de: 'Weißtöne einstellbar', fr: 'Blanc réglable', it: 'Bianco regolabile' },
  color: { en: 'Full colour', es: 'Color', de: 'Vollfarbe', fr: 'Couleur', it: 'A colori' },
});

const FIT_LABELS = labels({
  deadbolt: { en: 'Replaces deadbolt', es: 'Sustituye el cerrojo', de: 'Ersetzt das Riegelschloss', fr: 'Remplace le verrou', it: 'Sostituisce il chiavistello' },
  retrofit: { en: 'Retrofit (keeps keys)', es: 'Sobre el cilindro (mantiene las llaves)', de: 'Nachrüstung (Schlüssel bleiben)', fr: 'Sur le cylindre (garde les clés)', it: 'Sul cilindro (mantiene le chiavi)' },
  cylinder: { en: 'Euro cylinder', es: 'Cilindro europeo', de: 'Profilzylinder', fr: 'Cylindre européen', it: 'Cilindro europeo' },
  lever: { en: 'Lever handle', es: 'Manilla', de: 'Türdrücker', fr: 'Poignée', it: 'Maniglia' },
});

const THERMOSTAT_LABELS = labels({
  wall: { en: 'Wall thermostat', es: 'Termostato de pared', de: 'Wandthermostat', fr: 'Thermostat mural', it: 'Termostato a parete' },
  'radiator-valve': { en: 'Radiator valve', es: 'Válvula de radiador', de: 'Heizkörperthermostat', fr: 'Tête thermostatique', it: 'Valvola termostatica' },
});

const SENSE_LABELS = labels({
  contact: { en: 'Contact', es: 'Apertura', de: 'Kontakt', fr: 'Ouverture', it: 'Apertura' },
  motion: { en: 'Motion', es: 'Movimiento', de: 'Bewegung', fr: 'Mouvement', it: 'Movimento' },
  presence: { en: 'Presence', es: 'Presencia', de: 'Anwesenheit', fr: 'Présence', it: 'Presenza' },
  temperature: { en: 'Temperature', es: 'Temperatura', de: 'Temperatur', fr: 'Température', it: 'Temperatura' },
  humidity: { en: 'Humidity', es: 'Humedad', de: 'Luftfeuchtigkeit', fr: 'Humidité', it: 'Umidità' },
  leak: { en: 'Water leak', es: 'Fugas de agua', de: 'Wasserleck', fr: 'Fuite d’eau', it: 'Perdite d’acqua' },
  light: { en: 'Light', es: 'Luz', de: 'Licht', fr: 'Luminosité', it: 'Luce' },
  vibration: { en: 'Vibration', es: 'Vibración', de: 'Vibration', fr: 'Vibration', it: 'Vibrazione' },
  'air-quality': { en: 'Air quality', es: 'Calidad del aire', de: 'Luftqualität', fr: 'Qualité de l’air', it: 'Qualità dell’aria' },
});

const CAMERA_LABELS = labels({
  indoor: { en: 'Indoor camera', es: 'Cámara de interior', de: 'Innenkamera', fr: 'Caméra intérieure', it: 'Telecamera da interno' },
  outdoor: { en: 'Outdoor camera', es: 'Cámara de exterior', de: 'Außenkamera', fr: 'Caméra extérieure', it: 'Telecamera da esterno' },
  doorbell: { en: 'Video doorbell', es: 'Videotimbre', de: 'Video-Türklingel', fr: 'Sonnette vidéo', it: 'Videocitofono' },
  floodlight: { en: 'Floodlight camera', es: 'Cámara con foco', de: 'Kamera mit Flutlicht', fr: 'Caméra avec projecteur', it: 'Telecamera con faro' },
});

const SWITCH_LABELS = labels({
  'wall-switch': { en: 'Wall switch', es: 'Interruptor de pared', de: 'Wandschalter', fr: 'Interrupteur mural', it: 'Interruttore a parete' },
  module: { en: 'In-wall module', es: 'Módulo empotrable', de: 'Unterputzmodul', fr: 'Module encastrable', it: 'Modulo da incasso' },
});

const CLEANING_LABELS = labels({
  vacuum: { en: 'Vacuum', es: 'Aspira', de: 'Saugt', fr: 'Aspire', it: 'Aspira' },
  'vacuum-mop': { en: 'Vacuum and mop', es: 'Aspira y friega', de: 'Saugt und wischt', fr: 'Aspire et lave', it: 'Aspira e lava' },
});

const HUB_LABELS = labels({
  hub: { en: 'Hub or bridge', es: 'Hub o pasarela', de: 'Hub oder Bridge', fr: 'Hub ou passerelle', it: 'Hub o bridge' },
  'usb-dongle': { en: 'USB dongle', es: 'Dongle USB', de: 'USB-Stick', fr: 'Dongle USB', it: 'Chiavetta USB' },
  'speaker-display': { en: 'Speaker or display', es: 'Altavoz o pantalla', de: 'Lautsprecher oder Display', fr: 'Enceinte ou écran', it: 'Altoparlante o display' },
});

const PROTOCOL_LABELS = labels({
  zigbee: { en: 'Zigbee', es: 'Zigbee', de: 'Zigbee', fr: 'Zigbee', it: 'Zigbee' },
  thread: { en: 'Thread', es: 'Thread', de: 'Thread', fr: 'Thread', it: 'Thread' },
  'z-wave': { en: 'Z-Wave', es: 'Z-Wave', de: 'Z-Wave', fr: 'Z-Wave', it: 'Z-Wave' },
  bluetooth: { en: 'Bluetooth', es: 'Bluetooth', de: 'Bluetooth', fr: 'Bluetooth', it: 'Bluetooth' },
  infrared: { en: 'Infrared', es: 'Infrarrojos', de: 'Infrarot', fr: 'Infrarouge', it: 'Infrarossi' },
  proprietary: { en: 'Proprietary radio', es: 'Radio propia', de: 'Eigener Funk', fr: 'Radio propriétaire', it: 'Radio proprietaria' },
});

export const CATEGORIES: Category[] = [
  {
    key: 'smart-plug',
    i18n: {
      es: { label: 'Enchufes inteligentes', navLabel: 'Enchufes', singular: 'enchufe inteligente', plural: 'enchufes inteligentes', gender: 'm' },
      de: { label: 'Smarte Steckdosen', navLabel: 'Steckdosen', singular: 'smarte Steckdose', plural: 'smarte Steckdosen', gender: 'f' },
      fr: { label: 'Prises connectées', navLabel: 'Prises', singular: 'prise connectée', plural: 'prises connectées', gender: 'f' },
      it: { label: 'Prese smart', navLabel: 'Prese', singular: 'presa smart', plural: 'prese smart', gender: 'f' },
    },
    path: 'smart-plugs',
    label: 'Smart plugs',
    navLabel: 'Plugs',
    singular: 'smart plug',
    plural: 'smart plugs',
    specs: [
      { key: 'energyMonitoring', label: 'Energy monitoring', labelIn: { es: 'Medición de consumo', de: 'Verbrauchsmessung', fr: 'Suivi de consommation', it: 'Monitoraggio consumi' }, format: yesNo },
      { key: 'maxLoadWatts', label: 'Max load', labelIn: { es: 'Carga máxima', de: 'Max. Last', fr: 'Charge max.', it: 'Carico massimo' }, format: (v, lang) => `${formatNumber(Number(v), lang)} W` },
    ],
  },
  {
    key: 'smart-bulb',
    i18n: {
      es: { label: 'Bombillas inteligentes', navLabel: 'Bombillas', singular: 'bombilla inteligente', plural: 'bombillas inteligentes', gender: 'f' },
      de: { label: 'Smarte Lampen', navLabel: 'Lampen', singular: 'smarte Lampe', plural: 'smarte Lampen', gender: 'f' },
      fr: { label: 'Ampoules connectées', navLabel: 'Ampoules', singular: 'ampoule connectée', plural: 'ampoules connectées', gender: 'f' },
      it: { label: 'Lampadine smart', navLabel: 'Lampadine', singular: 'lampadina smart', plural: 'lampadine smart', gender: 'f' },
    },
    path: 'smart-bulbs',
    label: 'Smart bulbs',
    navLabel: 'Bulbs',
    singular: 'smart bulb',
    plural: 'smart bulbs',
    specs: [
      { key: 'colorType', label: 'Light', labelIn: { es: 'Luz', de: 'Licht', fr: 'Lumière', it: 'Luce' }, format: COLOR_LABELS },
      { key: 'lumens', label: 'Brightness', labelIn: { es: 'Brillo', de: 'Helligkeit', fr: 'Luminosité', it: 'Luminosità' }, format: (v, lang) => `${formatNumber(Number(v), lang)} lm` },
      { key: 'bulbBase', label: 'Base', labelIn: { es: 'Casquillo', de: 'Sockel', fr: 'Culot', it: 'Attacco' }, format: String },
    ],
  },
  {
    key: 'smart-lock',
    i18n: {
      es: { label: 'Cerraduras inteligentes', navLabel: 'Cerraduras', singular: 'cerradura inteligente', plural: 'cerraduras inteligentes', gender: 'f' },
      de: { label: 'Smarte Türschlösser', navLabel: 'Türschlösser', singular: 'smartes Türschloss', plural: 'smarte Türschlösser', gender: 'n' },
      fr: { label: 'Serrures connectées', navLabel: 'Serrures', singular: 'serrure connectée', plural: 'serrures connectées', gender: 'f' },
      it: { label: 'Serrature smart', navLabel: 'Serrature', singular: 'serratura smart', plural: 'serrature smart', gender: 'f' },
    },
    path: 'smart-locks',
    label: 'Smart locks',
    navLabel: 'Locks',
    singular: 'smart lock',
    plural: 'smart locks',
    specs: [
      { key: 'lockFit', label: 'Fit', labelIn: { es: 'Montaje', de: 'Montage', fr: 'Montage', it: 'Montaggio' }, format: FIT_LABELS },
      { key: 'keypad', label: 'Keypad', labelIn: { es: 'Teclado', de: 'Tastenfeld', fr: 'Clavier', it: 'Tastierino' }, format: yesNo },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación', de: 'Stromversorgung', fr: 'Alimentation', it: 'Alimentazione' }, format: String },
    ],
  },
  {
    key: 'smart-thermostat',
    i18n: {
      es: { label: 'Termostatos inteligentes', navLabel: 'Termostatos', singular: 'termostato inteligente', plural: 'termostatos inteligentes', gender: 'm' },
      de: { label: 'Smarte Thermostate', navLabel: 'Thermostate', singular: 'smartes Thermostat', plural: 'smarte Thermostate', gender: 'n' },
      fr: { label: 'Thermostats connectés', navLabel: 'Thermostats', singular: 'thermostat connecté', plural: 'thermostats connectés', gender: 'm' },
      it: { label: 'Termostati smart', navLabel: 'Termostati', singular: 'termostato smart', plural: 'termostati smart', gender: 'm' },
    },
    path: 'smart-thermostats',
    label: 'Smart thermostats',
    navLabel: 'Thermostats',
    singular: 'smart thermostat',
    plural: 'smart thermostats',
    specs: [
      { key: 'thermostatType', label: 'Type', labelIn: { es: 'Tipo', de: 'Typ', fr: 'Type', it: 'Tipo' }, format: THERMOSTAT_LABELS },
      { key: 'systems', label: 'Controls', labelIn: { es: 'Controla', de: 'Steuert', fr: 'Pilote', it: 'Controlla' }, format: String },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación', de: 'Stromversorgung', fr: 'Alimentation', it: 'Alimentazione' }, format: String },
    ],
  },
  {
    key: 'smart-sensor',
    i18n: {
      es: { label: 'Sensores inteligentes', navLabel: 'Sensores', singular: 'sensor inteligente', plural: 'sensores inteligentes', gender: 'm' },
      de: { label: 'Smarte Sensoren', navLabel: 'Sensoren', singular: 'smarter Sensor', plural: 'smarte Sensoren', gender: 'm' },
      fr: { label: 'Capteurs connectés', navLabel: 'Capteurs', singular: 'capteur connecté', plural: 'capteurs connectés', gender: 'm' },
      it: { label: 'Sensori smart', navLabel: 'Sensori', singular: 'sensore smart', plural: 'sensori smart', gender: 'm' },
    },
    path: 'smart-sensors',
    label: 'Smart sensors',
    navLabel: 'Sensors',
    singular: 'smart sensor',
    plural: 'smart sensors',
    specs: [
      {
        key: 'senses',
        label: 'Senses',
        labelIn: { es: 'Detecta', de: 'Erkennt', fr: 'Détecte', it: 'Rileva' },
        format: (v, lang) => (v as string[]).map((x) => SENSE_LABELS(x, lang)).join(', '),
      },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación', de: 'Stromversorgung', fr: 'Alimentation', it: 'Alimentazione' }, format: String },
    ],
  },
  {
    key: 'smart-camera',
    i18n: {
      es: { label: 'Cámaras y timbres inteligentes', navLabel: 'Cámaras', singular: 'cámara inteligente', plural: 'cámaras inteligentes', gender: 'f' },
      de: { label: 'Smarte Kameras und Türklingeln', navLabel: 'Kameras', singular: 'smarte Kamera', plural: 'smarte Kameras', gender: 'f' },
      fr: { label: 'Caméras et sonnettes connectées', navLabel: 'Caméras', singular: 'caméra connectée', plural: 'caméras connectées', gender: 'f' },
      it: { label: 'Telecamere e videocitofoni smart', navLabel: 'Telecamere', singular: 'telecamera smart', plural: 'telecamere smart', gender: 'f' },
    },
    path: 'smart-cameras',
    label: 'Smart cameras and doorbells',
    navLabel: 'Cameras',
    singular: 'smart camera',
    plural: 'smart cameras',
    specs: [
      { key: 'cameraType', label: 'Type', labelIn: { es: 'Tipo', de: 'Typ', fr: 'Type', it: 'Tipo' }, format: CAMERA_LABELS },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación', de: 'Stromversorgung', fr: 'Alimentation', it: 'Alimentazione' }, format: String },
      { key: 'localStorage', label: 'Local recording', labelIn: { es: 'Grabación local', de: 'Lokale Aufzeichnung', fr: 'Enregistrement local', it: 'Registrazione locale' }, format: yesNo },
      { key: 'subscription', label: 'Paid plan needed for', labelIn: { es: 'Requiere suscripción para', de: 'Abo nötig für', fr: 'Abonnement requis pour', it: 'Abbonamento richiesto per' }, format: String },
    ],
  },
  {
    key: 'smart-switch',
    i18n: {
      es: { label: 'Interruptores y reguladores inteligentes', navLabel: 'Interruptores', singular: 'interruptor inteligente', plural: 'interruptores inteligentes', gender: 'm' },
      de: { label: 'Smarte Schalter und Dimmer', navLabel: 'Schalter', singular: 'smarter Schalter', plural: 'smarte Schalter', gender: 'm' },
      fr: { label: 'Interrupteurs et variateurs connectés', navLabel: 'Interrupteurs', singular: 'interrupteur connecté', plural: 'interrupteurs connectés', gender: 'm' },
      it: { label: 'Interruttori e dimmer smart', navLabel: 'Interruttori', singular: 'interruttore smart', plural: 'interruttori smart', gender: 'm' },
    },
    path: 'smart-switches',
    label: 'Smart switches and dimmers',
    navLabel: 'Switches',
    singular: 'smart switch',
    plural: 'smart switches',
    specs: [
      { key: 'switchForm', label: 'Form', labelIn: { es: 'Formato', de: 'Bauform', fr: 'Format', it: 'Formato' }, format: SWITCH_LABELS },
      { key: 'dimmer', label: 'Dimmer', labelIn: { es: 'Regulable', de: 'Dimmbar', fr: 'Variateur', it: 'Dimmerabile' }, format: yesNo },
      { key: 'neutralRequired', label: 'Needs neutral wire', labelIn: { es: 'Necesita neutro', de: 'Neutralleiter nötig', fr: 'Neutre nécessaire', it: 'Richiede il neutro' }, format: yesNo },
      { key: 'gangs', label: 'Gangs / channels', labelIn: { es: 'Teclas / canales', de: 'Tasten / Kanäle', fr: 'Touches / canaux', it: 'Tasti / canali' }, format: String },
    ],
  },
  {
    key: 'robot-vacuum',
    i18n: {
      es: { label: 'Robots aspiradores', navLabel: 'Robots', singular: 'robot aspirador', plural: 'robots aspiradores', gender: 'm' },
      de: { label: 'Saugroboter', navLabel: 'Saugroboter', singular: 'Saugroboter', plural: 'Saugroboter', gender: 'm' },
      fr: { label: 'Aspirateurs robots', navLabel: 'Aspirateurs', singular: 'aspirateur robot', plural: 'aspirateurs robots', gender: 'm' },
      it: { label: 'Robot aspirapolvere', navLabel: 'Robot', singular: 'robot aspirapolvere', plural: 'robot aspirapolvere', gender: 'm' },
    },
    path: 'robot-vacuums',
    label: 'Robot vacuums',
    navLabel: 'Vacuums',
    singular: 'robot vacuum',
    plural: 'robot vacuums',
    specs: [
      { key: 'cleaning', label: 'Cleaning', labelIn: { es: 'Limpieza', de: 'Reinigung', fr: 'Nettoyage', it: 'Pulizia' }, format: CLEANING_LABELS },
      { key: 'navigation', label: 'Navigation', labelIn: { es: 'Navegación', de: 'Navigation', fr: 'Navigation', it: 'Navigazione' }, format: String },
      { key: 'suctionPa', label: 'Suction', labelIn: { es: 'Succión', de: 'Saugkraft', fr: 'Aspiration', it: 'Aspirazione' }, format: (v, lang) => `${formatNumber(Number(v), lang)} Pa` },
      { key: 'selfEmptying', label: 'Self-emptying dock', labelIn: { es: 'Base de autovaciado', de: 'Absaugstation', fr: 'Station de vidage automatique', it: 'Base di svuotamento automatico' }, format: yesNo },
    ],
  },
  {
    key: 'smart-hub',
    i18n: {
      es: { label: 'Hubs y pasarelas', navLabel: 'Hubs', singular: 'hub', plural: 'hubs', gender: 'm' },
      de: { label: 'Hubs und Bridges', navLabel: 'Hubs', singular: 'Smart-Home-Hub', plural: 'Smart-Home-Hubs', gender: 'm' },
      fr: { label: 'Hubs et passerelles', navLabel: 'Hubs', singular: 'hub', plural: 'hubs', gender: 'm' },
      it: { label: 'Hub e bridge', navLabel: 'Hub', singular: 'hub', plural: 'hub', gender: 'm' },
    },
    path: 'smart-hubs',
    label: 'Smart home hubs and bridges',
    navLabel: 'Hubs',
    singular: 'smart home hub',
    plural: 'smart home hubs',
    specs: [
      { key: 'hubType', label: 'Type', labelIn: { es: 'Tipo', de: 'Typ', fr: 'Type', it: 'Tipo' }, format: HUB_LABELS },
      {
        key: 'deviceProtocols',
        label: 'Connects devices over',
        labelIn: { es: 'Conecta dispositivos por', de: 'Verbindet Geräte über', fr: 'Connecte les appareils via', it: 'Collega dispositivi via' },
        format: (v, lang) => (v as string[]).map((x) => PROTOCOL_LABELS(x, lang)).join(', '),
      },
      { key: 'matterBridge', label: 'Matter bridge', labelIn: { es: 'Puente Matter', de: 'Matter-Bridge', fr: 'Pont Matter', it: 'Bridge Matter' }, format: yesNo },
      { key: 'threadBorderRouter', label: 'Thread border router', labelIn: { es: 'Router de borde Thread', de: 'Thread-Border-Router', fr: 'Routeur de bordure Thread', it: 'Border router Thread' }, format: yesNo },
      { key: 'maxDevices', label: 'Max devices', labelIn: { es: 'Máx. dispositivos', de: 'Max. Geräte', fr: 'Appareils max.', it: 'Dispositivi max.' }, format: (v, lang) => formatNumber(Number(v), lang) },
    ],
  },
  {
    key: 'light-strip',
    i18n: {
      es: { label: 'Tiras LED inteligentes', navLabel: 'Tiras LED', singular: 'tira LED inteligente', plural: 'tiras LED inteligentes', gender: 'f' },
      de: { label: 'Smarte LED-Strips', navLabel: 'LED-Strips', singular: 'smarter LED-Strip', plural: 'smarte LED-Strips', gender: 'm' },
      fr: { label: 'Rubans LED connectés', navLabel: 'Rubans LED', singular: 'ruban LED connecté', plural: 'rubans LED connectés', gender: 'm' },
      it: { label: 'Strisce LED smart', navLabel: 'Strisce LED', singular: 'striscia LED smart', plural: 'strisce LED smart', gender: 'f' },
    },
    path: 'light-strips',
    label: 'Smart LED light strips',
    navLabel: 'Light strips',
    singular: 'smart light strip',
    plural: 'smart light strips',
    specs: [
      { key: 'colorType', label: 'Light', labelIn: { es: 'Luz', de: 'Licht', fr: 'Lumière', it: 'Luce' }, format: COLOR_LABELS },
      { key: 'lengthM', label: 'Length', labelIn: { es: 'Longitud', de: 'Länge', fr: 'Longueur', it: 'Lunghezza' }, format: (v, lang) => `${formatNumber(Number(v), lang)} m` },
      { key: 'multiZone', label: 'Several colours at once', labelIn: { es: 'Varios colores a la vez', de: 'Mehrere Farben gleichzeitig', fr: 'Plusieurs couleurs à la fois', it: 'Più colori insieme' }, format: yesNo },
      { key: 'power', label: 'Power', labelIn: { es: 'Alimentación', de: 'Stromversorgung', fr: 'Alimentation', it: 'Alimentazione' }, format: String },
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
