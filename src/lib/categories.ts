import { CATEGORY_KEYS, type CategoryKey, type DeviceData } from '../schema/device.ts';

type Spec = { key: string; label: string; format: (v: unknown) => string };

export interface Category {
  key: CategoryKey;
  /** URL segment, e.g. /smart-plugs/ */
  path: string;
  /** "Smart plugs" */
  label: string;
  /** "smart plug" */
  singular: string;
  /** "smart plugs" */
  plural: string;
  /** Category-specific facts shown on device pages, in llms-full.txt and tables. */
  specs: Spec[];
}

const yesNo = (v: unknown) => (v ? 'Yes' : 'No');
const COLOR_LABELS: Record<string, string> = {
  white: 'White only',
  'tunable-white': 'Tunable white',
  color: 'Full colour',
};

const FIT_LABELS: Record<string, string> = {
  deadbolt: 'Replaces deadbolt',
  retrofit: 'Retrofit (keeps keys)',
  cylinder: 'Euro cylinder',
  lever: 'Lever handle',
};

export const CATEGORIES: Category[] = [
  {
    key: 'smart-plug',
    path: 'smart-plugs',
    label: 'Smart plugs',
    singular: 'smart plug',
    plural: 'smart plugs',
    specs: [
      { key: 'energyMonitoring', label: 'Energy monitoring', format: yesNo },
      { key: 'maxLoadWatts', label: 'Max load', format: (v) => `${Number(v).toLocaleString('en-US')} W` },
    ],
  },
  {
    key: 'smart-bulb',
    path: 'smart-bulbs',
    label: 'Smart bulbs',
    singular: 'smart bulb',
    plural: 'smart bulbs',
    specs: [
      { key: 'colorType', label: 'Light', format: (v) => COLOR_LABELS[String(v)] ?? String(v) },
      { key: 'lumens', label: 'Brightness', format: (v) => `${Number(v).toLocaleString('en-US')} lm` },
      { key: 'bulbBase', label: 'Base', format: String },
    ],
  },
  {
    key: 'smart-lock',
    path: 'smart-locks',
    label: 'Smart locks',
    singular: 'smart lock',
    plural: 'smart locks',
    specs: [
      { key: 'lockFit', label: 'Fit', format: (v) => FIT_LABELS[String(v)] ?? String(v) },
      { key: 'keypad', label: 'Keypad', format: yesNo },
      { key: 'power', label: 'Power', format: String },
    ],
  },
];

// keep the registry and the schema in step
if (CATEGORIES.map((c) => c.key).join() !== CATEGORY_KEYS.join()) throw new Error('CATEGORIES and CATEGORY_KEYS differ');

export const categoryOf = (d: { category: CategoryKey }) => CATEGORIES.find((c) => c.key === d.category)!;
export const categoryByPath = (path: string) => CATEGORIES.find((c) => c.path === path);

type FactLike = { value: unknown; sources: string[]; note?: string };

/** Category-specific facts of a device, ready to display. */
export function specFacts(d: DeviceData) {
  const facts = d as unknown as Record<string, FactLike>;
  return categoryOf(d).specs.map((s) => {
    const f = facts[s.key];
    return { key: s.key, label: s.label, text: f.value === null ? 'Unconfirmed' : s.format(f.value), fact: f };
  });
}
