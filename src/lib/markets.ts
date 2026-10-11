import type { Device } from './devices';

// Buyers shop in one market at a time, so lists are split by market instead of
// mixing a US plug with its EU sibling. A record belongs to the first market
// whose regions it lists (a US+CA record goes under "US & Canada").
export interface Market {
  key: string;
  label: string;
  /** for headings: "Smart plugs for the US and Canada" */
  phrase: string;
  regions: string[];
}

export const MARKETS: Market[] = [
  { key: 'us', phrase: 'the US and Canada', label: 'US & Canada', regions: ['US', 'CA'] },
  { key: 'eu', phrase: 'Europe', label: 'Europe', regions: ['EU'] },
  { key: 'uk', phrase: 'the UK', label: 'UK', regions: ['UK'] },
  { key: 'au', phrase: 'Australia', label: 'Australia', regions: ['AU'] },
  { key: 'jp', phrase: 'Japan', label: 'Japan', regions: ['JP'] },
];

export const marketOf = (d: Device) =>
  MARKETS.find((m) => d.data.regions.some((r) => m.regions.includes(r))) ?? MARKETS[0];

/** Devices grouped by market, in MARKETS order, empty markets left out. Order within a group is kept. */
export const byMarket = (devices: Device[]) =>
  MARKETS.map((market) => ({ market, devices: devices.filter((d) => marketOf(d) === market) })).filter(
    (g) => g.devices.length > 0,
  );
