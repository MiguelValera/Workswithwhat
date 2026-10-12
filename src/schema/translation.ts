// Spanish (and future) translations of a device record's prose. Facts, statuses and
// sources live only in the English record, so a fact can never differ between
// languages; a translation holds just the words around them.
import { z } from 'zod';
import { ECOSYSTEMS } from './device.ts';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

/** String-valued facts whose wording can be translated (e.g. power "Rechargeable battery"). */
export const TRANSLATABLE_VALUES = ['power', 'systems', 'subscription', 'gangs', 'bulbBase', 'navigation'] as const;

export const translationSchema = z
  .object({
    // the English record's updatedAt this translation was made from; a newer record means it's stale
    basedOn: isoDate,
    summary: z.string().min(80).max(800),
    caveats: z.array(z.string().min(10).max(340)).default([]),
    // one entry per English note: "radios", "matter", "hubRequired", "localControl", a category fact key,
    // or "compatibility.<ecosystem>"
    notes: z.record(z.string(), z.string().min(2).max(340)).default({}),
    // translated `via` text for ecosystems with status "hub"
    via: z.partialRecord(z.enum(ECOSYSTEMS), z.string().min(2).max(90)).optional(),
    // translated wording of string facts, where the English value is words rather than a code
    values: z.partialRecord(z.enum(TRANSLATABLE_VALUES), z.string().min(1).max(90)).optional(),
  })
  .strict();

export type TranslationData = z.infer<typeof translationSchema>;
