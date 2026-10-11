import { ECOSYSTEMS, answerFor, devicePath, type Device } from './devices';
import { categoryOf } from './categories';

/** A published record as exposed by the JSON API, plus a ready-made answer per ecosystem. */
export function apiRecord(dev: Device, site: URL) {
  const { status: _status, ...data } = dev.data;
  return {
    slug: dev.id,
    url: new URL(devicePath(dev), site).href,
    categoryLabel: categoryOf(dev.data).singular,
    ...data,
    answers: Object.fromEntries(ECOSYSTEMS.map((e) => [e, answerFor(dev, e)])),
  };
}
