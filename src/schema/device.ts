// Single source of truth for device data. Used by Astro's content collection
// (src/content.config.ts) and by scripts/validate-data.mjs, so the build and
// the CI check can never disagree about what a valid record is.
import { z } from 'zod';

export const ECOSYSTEMS = ['apple_home', 'google_home', 'alexa', 'smartthings', 'home_assistant'] as const;

export const ECOSYSTEM_LABELS: Record<(typeof ECOSYSTEMS)[number], string> = {
  apple_home: 'Apple Home',
  google_home: 'Google Home',
  alexa: 'Amazon Alexa',
  smartthings: 'SmartThings',
  home_assistant: 'Home Assistant',
};

// How a device reaches an ecosystem.
// native  – works directly through the brand's own integration/skill/HAP
// matter  – works through Matter (needs that ecosystem's Matter controller)
// hub     – works only through an extra bridge/hub (named in `via`)
// no      – manufacturer or ecosystem states it is not supported
// unknown – we could not confirm either way; never guess
export const SUPPORT = ['native', 'matter', 'hub', 'no', 'unknown'] as const;

export const REGIONS = ['US', 'CA', 'EU', 'UK', 'AU', 'JP'] as const;
export const RADIOS = ['wifi', 'thread', 'zigbee', 'z-wave', 'bluetooth', 'ethernet'] as const;
export const SOURCE_KINDS = ['manufacturer', 'certification', 'ecosystem', 'retailer', 'review'] as const;

const sourceRef = z.string().regex(/^[a-z0-9-]+$/, 'source ids are kebab-case');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

const sourced = { sources: z.array(sourceRef).default([]), note: z.string().max(280).optional() };
const withSources = <S extends z.ZodRawShape>(shape: S) => z.object({ ...shape, ...sourced }).strict();

// A fact with a value: null means "not confirmed". Anything non-null must be
// sourced; that rule is enforced in deviceSchema's superRefine below.
const fact = <T extends z.ZodType>(value: T) =>
  z.object({ value: z.nullable(value), sources: sourced.sources, note: sourced.note }).strict();

const compatibility = withSources({
  status: z.enum(SUPPORT),
  via: z.string().max(80).optional(),
})
  .refine((c) => c.status === 'unknown' || c.sources.length > 0, {
    message: 'only "unknown" may be left without sources',
  })
  .refine((c) => c.status !== 'hub' || Boolean(c.via), { message: 'status "hub" requires `via`' });

export const sourceSchema = z
  .object({
    id: sourceRef,
    url: z.url().refine((u) => u.startsWith('https://'), 'https only'),
    title: z.string().min(3),
    publisher: z.string().min(2),
    kind: z.enum(SOURCE_KINDS),
    accessed: isoDate,
    // true for a source that backs only a caveat (end of support, safety), not a field
    forCaveat: z.literal(true).optional(),
  })
  .strict();

// Fields every device has, whatever its category.
const baseShape = {
  brand: z.string().min(1),
  model: z.string().min(1),
  name: z.string().min(3),
  regions: z.array(z.enum(REGIONS)).min(1),
  officialUrl: z.url(),
  radios: fact(z.array(z.enum(RADIOS)).min(1)),
  matter: withSources({
    certified: z.boolean().nullable(),
    transport: z.enum(['wifi', 'thread', 'ethernet']).optional(),
  }).refine((m) => m.certified === null || m.sources.length > 0, {
    message: 'Matter status must be sourced',
  }),
  compatibility: z
    .object({
      apple_home: compatibility,
      google_home: compatibility,
      alexa: compatibility,
      smartthings: compatibility,
      home_assistant: compatibility,
    })
    .strict(),
  hubRequired: fact(z.boolean()),
  localControl: fact(z.boolean()),
  summary: z.string().min(80).max(700),
  caveats: z.array(z.string().min(10).max(300)).default([]),
  sources: z.array(sourceSchema).min(2),
  // slugs of the same product sold in other regions (e.g. the UK and EU Tapo P110); must be mutual
  variants: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
  status: z.enum(['draft', 'verified']),
  verifiedAt: isoDate.optional(),
  updatedAt: isoDate,
};

export const COLOR_TYPES = ['white', 'tunable-white', 'color'] as const;
// deadbolt = replaces a whole US-style deadbolt; retrofit = fits over the existing
// interior thumb-turn or cylinder and keeps your keys; cylinder = replaces a
// European (euro-profile) cylinder; lever = handle set with the lock built in
export const LOCK_FITS = ['deadbolt', 'retrofit', 'cylinder', 'lever'] as const;
// wall = wall thermostat that switches a heating/cooling system (US HVAC, boiler);
// radiator-valve = thermostatic head that replaces a radiator's valve head (TRV)
export const THERMOSTAT_TYPES = ['wall', 'radiator-valve'] as const;
// wall-switch = replaces a wall switch (US/UK style or EU rocker); module = in-wall relay or
// dimmer module that sits behind an existing switch (e.g. Shelly, Sonoff)
export const SWITCH_FORMS = ['wall-switch', 'module'] as const;
// indoor / outdoor = standalone cameras; doorbell = video doorbell; floodlight = camera with built-in lights
export const CAMERA_TYPES = ['indoor', 'outdoor', 'doorbell', 'floodlight'] as const;
// vacuum = vacuums only; vacuum-mop = vacuums and mops (pad or roller)
export const CLEANING_TYPES = ['vacuum', 'vacuum-mop'] as const;
// hub = standalone hub, bridge or gateway with its own app (Hue Bridge, DIRIGERA, Aqara);
// usb-dongle = radio stick for a computer running Home Assistant, Zigbee2MQTT and the like;
// speaker-display = smart speaker or display with a hub built in (Echo with Zigbee, HomePod, Nest Hub)
export const HUB_TYPES = ['hub', 'usb-dongle', 'speaker-display'] as const;
// what a hub talks to on the device side
export const HUB_PROTOCOLS = ['zigbee', 'thread', 'z-wave', 'bluetooth', 'infrared', 'proprietary'] as const;
// what a sensor reports; presence = mmWave-style presence that sees people who sit still
export const SENSES = ['contact', 'motion', 'presence', 'temperature', 'humidity', 'leak', 'light', 'vibration', 'air-quality'] as const;

// Category-specific facts. Add a category here, in CATEGORY_FACTS and in
// src/lib/categories.ts (labels and routes).
const plugSchema = z
  .object({
    ...baseShape,
    category: z.literal('smart-plug'),
    energyMonitoring: fact(z.boolean()),
    maxLoadWatts: fact(z.number().int().positive()),
  })
  .strict();

const bulbSchema = z
  .object({
    ...baseShape,
    category: z.literal('smart-bulb'),
    // white = fixed white, tunable-white = adjustable colour temperature, color = full RGB
    colorType: fact(z.enum(COLOR_TYPES)),
    lumens: fact(z.number().int().positive()),
    // e.g. "E27", "E26 (A19)", "GU10", "B22"
    bulbBase: fact(z.string().min(2).max(30)),
  })
  .strict();

const lockSchema = z
  .object({
    ...baseShape,
    category: z.literal('smart-lock'),
    lockFit: fact(z.enum(LOCK_FITS)),
    // a keypad on the lock itself (not a separate accessory)
    keypad: fact(z.boolean()),
    // e.g. "4 × AA", "Rechargeable battery"
    power: fact(z.string().min(2).max(40)),
  })
  .strict();

const thermostatSchema = z
  .object({
    ...baseShape,
    category: z.literal('smart-thermostat'),
    thermostatType: fact(z.enum(THERMOSTAT_TYPES)),
    // what it can control, e.g. "24 V HVAC, incl. heat pumps", "Boilers with OpenTherm"
    systems: fact(z.string().min(2).max(80)),
    // e.g. "C-wire (24 V)", "2 × AA", "Rechargeable battery"
    power: fact(z.string().min(2).max(40)),
  })
  .strict();

const sensorSchema = z
  .object({
    ...baseShape,
    category: z.literal('smart-sensor'),
    senses: fact(z.array(z.enum(SENSES)).min(1)),
    // e.g. "CR2032", "2 × AAA", "USB-C (mains)"
    power: fact(z.string().min(2).max(40)),
  })
  .strict();

const cameraSchema = z
  .object({
    ...baseShape,
    category: z.literal('smart-camera'),
    cameraType: fact(z.enum(CAMERA_TYPES)),
    // e.g. "Wired (doorbell 16–24 V AC)", "Rechargeable battery", "USB-C (mains)"
    power: fact(z.string().min(2).max(40)),
    // records video without a cloud plan (microSD, a base station or NVR)
    localStorage: fact(z.boolean()),
    // what a paid plan is needed for, as the maker states it, e.g. "Video history (Ring Protect)"
    subscription: fact(z.string().min(2).max(80)),
  })
  .strict();

const switchSchema = z
  .object({
    ...baseShape,
    category: z.literal('smart-switch'),
    switchForm: fact(z.enum(SWITCH_FORMS)),
    dimmer: fact(z.boolean()),
    // needs a neutral wire at the switch box
    neutralRequired: fact(z.boolean()),
    // e.g. "1 gang", "2 channels"; the maker's wording
    gangs: fact(z.string().min(1).max(30)),
  })
  .strict();

const vacuumSchema = z
  .object({
    ...baseShape,
    category: z.literal('robot-vacuum'),
    cleaning: fact(z.enum(CLEANING_TYPES)),
    // e.g. "LiDAR", "Camera (vSLAM)", "LiDAR and camera"; the maker's wording
    navigation: fact(z.string().min(2).max(40)),
    // suction as the maker states it, in pascals
    suctionPa: fact(z.number().int().positive()),
    // the included dock empties the bin by itself
    selfEmptying: fact(z.boolean()),
  })
  .strict();

// For hubs, `compatibility` means the hub's connected devices show up in that ecosystem
// (natively or through the hub's Matter bridge), not the hub box itself.
const hubSchema = z
  .object({
    ...baseShape,
    category: z.literal('smart-hub'),
    hubType: fact(z.enum(HUB_TYPES)),
    deviceProtocols: fact(z.array(z.enum(HUB_PROTOCOLS)).min(1)),
    // exposes the devices paired to it to Matter controllers (Apple Home, Google Home, Alexa…)
    matterBridge: fact(z.boolean()),
    threadBorderRouter: fact(z.boolean()),
    // maximum number of connected devices, as the maker states it
    maxDevices: fact(z.number().int().positive()),
  })
  .strict();

export const CATEGORY_KEYS = ['smart-plug', 'smart-bulb', 'smart-lock', 'smart-thermostat', 'smart-sensor', 'smart-camera', 'smart-switch', 'robot-vacuum', 'smart-hub'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

const COMMON_FACTS = ['radios', 'hubRequired', 'localControl'] as const;
export const CATEGORY_FACTS = {
  'smart-plug': ['energyMonitoring', 'maxLoadWatts'],
  'smart-bulb': ['colorType', 'lumens', 'bulbBase'],
  'smart-lock': ['lockFit', 'keypad', 'power'],
  'smart-thermostat': ['thermostatType', 'systems', 'power'],
  'smart-sensor': ['senses', 'power'],
  'smart-camera': ['cameraType', 'power', 'localStorage', 'subscription'],
  'smart-switch': ['switchForm', 'dimmer', 'neutralRequired', 'gangs'],
  'robot-vacuum': ['cleaning', 'navigation', 'suctionPa', 'selfEmptying'],
  'smart-hub': ['hubType', 'deviceProtocols', 'matterBridge', 'threadBorderRouter', 'maxDevices'],
} as const satisfies Record<CategoryKey, readonly string[]>;

type FactValue = { value: unknown; sources: string[] };

export const deviceSchema = z
  .discriminatedUnion('category', [plugSchema, bulbSchema, lockSchema, thermostatSchema, sensorSchema, cameraSchema, switchSchema, vacuumSchema, hubSchema])
  .superRefine((d, ctx) => {
    const ids = d.sources.map((s) => s.id);
    const known = new Set(ids);
    if (known.size !== ids.length) ctx.addIssue({ code: 'custom', message: 'duplicate source id', path: ['sources'] });

    if (!d.sources.some((s) => s.kind === 'manufacturer'))
      ctx.addIssue({ code: 'custom', message: 'at least one manufacturer source is required', path: ['sources'] });

    // every source a claim points at must exist
    const check = (refs: string[], path: (string | number)[]) =>
      refs.forEach((r, i) => {
        if (!known.has(r)) ctx.addIssue({ code: 'custom', message: `unknown source "${r}"`, path: [...path, i] });
      });
    check(d.matter.sources, ['matter', 'sources']);
    const facts = d as unknown as Record<string, FactValue>;
    for (const k of [...COMMON_FACTS, ...CATEGORY_FACTS[d.category]]) {
      check(facts[k].sources, [k, 'sources']);
      if (facts[k].value !== null && facts[k].sources.length === 0)
        ctx.addIssue({ code: 'custom', message: 'a confirmed value needs at least one source', path: [k, 'sources'] });
    }
    for (const e of ECOSYSTEMS) check(d.compatibility[e].sources, ['compatibility', e, 'sources']);

    // a Matter device must say which transport it uses (Wi-Fi vs Thread matters for buyers)
    if (d.matter.certified && !d.matter.transport)
      ctx.addIssue({ code: 'custom', message: 'Matter devices need `transport`', path: ['matter', 'transport'] });

    if (d.status === 'verified' && !d.verifiedAt)
      ctx.addIssue({ code: 'custom', message: 'verified records need verifiedAt', path: ['verifiedAt'] });
  });

export type DeviceData = z.infer<typeof deviceSchema>;
