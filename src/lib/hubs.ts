// Links a record's `via` (e.g. "Philips Hue Bridge") to the hub's own page, and back.
// Only names that clearly mean one hub record are matched: a generic "Aqara hub" could be
// any of several models, so it gets no link rather than a guess.
import type { Device } from './devices';
import { marketOf } from './markets';

// A name can map to several regional records; the link goes to the one in the device's own
// market, and none if that market has no record (lists never mix regions).
const HUB_NAMES: { pattern: RegExp; slugs: string[] }[] = [
  { pattern: /\bhue bridge\b(?!\s*pro)/i, slugs: ['philips-hue-bridge-us', 'philips-hue-bridge-eu', 'philips-hue-bridge-uk'] },
  { pattern: /\bdirigera\b/i, slugs: ['ikea-dirigera-eu'] },
  { pattern: /\bswitchbot hub 2\b/i, slugs: ['switchbot-hub-2-us', 'switchbot-hub-2-eu'] },
  { pattern: /\bhive hub\b/i, slugs: ['hive-hub-uk'] },
  { pattern: /\bcas[eé]ta smart bridge\b/i, slugs: ['lutron-caseta-smart-bridge-us'] },
];

/** The published hub record, in the same market as `device`, that its `via` text names. */
export function hubFor(via: string | undefined, device: Device, devices: Device[]): Device | undefined {
  if (!via) return undefined;
  const names = HUB_NAMES.filter((h) => h.pattern.test(via));
  if (names.length !== 1) return undefined;
  const market = marketOf(device);
  return devices.find((d) => names[0].slugs.includes(d.id) && d.data.category === 'smart-hub' && marketOf(d) === market);
}

/** Published devices that reach at least one ecosystem through this hub. */
export function devicesViaHub(hub: Device, devices: Device[]): Device[] {
  return devices.filter(
    (d) =>
      d.id !== hub.id &&
      Object.values(d.data.compatibility).some((c) => c.status === 'hub' && hubFor(c.via, d, devices)?.id === hub.id),
  );
}
