import { getCollection, type CollectionEntry } from 'astro:content';
import { ECOSYSTEMS, ECOSYSTEM_LABELS } from '../schema/device.ts';

export type Device = CollectionEntry<'devices'>;
export type Ecosystem = (typeof ECOSYSTEMS)[number];

export { ECOSYSTEMS, ECOSYSTEM_LABELS };

// Drafts never reach the public site; only records the verifier signed off.
// `astro dev` shows drafts too, so they can be reviewed before publishing.
export async function getPublishedDevices(): Promise<Device[]> {
  const all = await getCollection('devices', (d) => import.meta.env.DEV || d.data.status === 'verified');
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

export const devicePath = (d: Device) => `/smart-plugs/${d.id}/`;
