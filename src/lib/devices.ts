import { getCollection, type CollectionEntry } from 'astro:content';
import { ECOSYSTEMS, ECOSYSTEM_LABELS, type CategoryKey } from '../schema/device.ts';
import { CATEGORIES, categoryOf } from './categories';

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
export const ecosystemFromSlug = (s: string) => ECOSYSTEMS.find((e) => ecosystemSlug(e) === s);

export const STATUS_TEXT = {
  native: 'Yes',
  matter: 'Via Matter',
  hub: 'Via hub',
  no: 'No',
  unknown: 'Unconfirmed',
} as const;

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

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export const devicePath = (d: Device) => `/${categoryOf(d.data).path}/${d.id}/`;

export const listJoin = (xs: string[]) =>
  xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;

const ensureStop = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

// One plain-English answer per device × ecosystem, built only from verified
// data. Used on device pages, in FAQ structured data, llms.txt and the JSON API.
export function answerFor(d: Device, e: Ecosystem): string {
  const c = d.data.compatibility[e];
  const label = ECOSYSTEM_LABELS[e];
  const note = c.note ? ` ${ensureStop(c.note)}` : '';
  switch (c.status) {
    case 'native':
      return `Yes. The ${d.data.name} works with ${label} directly.${note}`;
    case 'matter': {
      const thread = d.data.matter.transport === 'thread' ? ' It uses Thread, so you also need a Thread border router.' : '';
      const possessive = label.endsWith('s') ? `${label}'` : `${label}'s`;
      return `Yes, through Matter: add it with ${possessive} Matter pairing.${thread}${note}`;
    }
    case 'hub':
      const via = /^(the|a|an) /i.test(c.via ?? '') ? c.via : `the ${c.via}`;
      return `Yes, but only through ${via}.${note}`;
    case 'no':
      return `No.${note}`;
    default:
      return `Not confirmed. We couldn't find an official source either way.${note}`;
  }
}

export const deviceTitle = (d: Device) => `Does the ${d.data.name} work with Apple Home, Google Home or Alexa?`;

/** Categories that have at least one published device (only these get pages). */
export async function getActiveCategories() {
  const devices = await getPublishedDevices();
  return CATEGORIES.filter((c) => devices.some((d) => d.data.category === c.key));
}
