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
  })
  .strict();

export const deviceSchema = z
  .object({
    category: z.literal('smart-plug'),
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
    energyMonitoring: fact(z.boolean()),
    maxLoadWatts: fact(z.number().int().positive()),
    summary: z.string().min(80).max(700),
    caveats: z.array(z.string().min(10).max(300)).default([]),
    sources: z.array(sourceSchema).min(2),
    status: z.enum(['draft', 'verified']),
    verifiedAt: isoDate.optional(),
    updatedAt: isoDate,
  })
  .strict()
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
    for (const k of ['radios', 'matter', 'hubRequired', 'localControl', 'energyMonitoring', 'maxLoadWatts'] as const)
      check(d[k].sources, [k, 'sources']);
    for (const k of ['radios', 'hubRequired', 'localControl', 'energyMonitoring', 'maxLoadWatts'] as const)
      if (d[k].value !== null && d[k].sources.length === 0)
        ctx.addIssue({ code: 'custom', message: 'a confirmed value needs at least one source', path: [k, 'sources'] });
    for (const e of ECOSYSTEMS) check(d.compatibility[e].sources, ['compatibility', e, 'sources']);

    // a Matter device must say which transport it uses (Wi-Fi vs Thread matters for buyers)
    if (d.matter.certified && !d.matter.transport)
      ctx.addIssue({ code: 'custom', message: 'Matter devices need `transport`', path: ['matter', 'transport'] });

    if (d.status === 'verified' && !d.verifiedAt)
      ctx.addIssue({ code: 'custom', message: 'verified records need verifiedAt', path: ['verifiedAt'] });
  });
