/* eslint-disable object-curly-newline */
const timeUnits = [
  { millis: 1000, singular: 'second' as const, plural: 'seconds', terse: 's' },
  { millis: 60 * 1000, singular: 'minute' as const, plural: 'minutes', terse: 'm' },
  { millis: 60 * 60 * 1000, singular: 'hour' as const, plural: 'hours', terse: 'h' },
  { millis: 24 * 60 * 60 * 1000, singular: 'day' as const, plural: 'days', terse: 'd' },
  { millis: 365 * 24 * 60 * 60 * 1000, singular: 'year' as const, plural: 'years', terse: 'y' },
].reverse();
/* eslint-enable object-curly-newline */

export default function relativeTimeFormat(d: Date, opts: {
  minimumUnit?: typeof timeUnits[number]['singular'],
  maxElements?: number,
  terse?: boolean,
  now?: Date,
} = {}) {
  const {
    minimumUnit = 'seconds',
    terse = false,
    maxElements = terse ? -1 : 1,
    now = new Date(),
  } = opts;
  const diff = now.getTime() - d.getTime();
  const relative = diff < 0 ? ' from now' : ' ago';

  let remainder = Math.abs(diff);
  const terms = [] as string[];
  let stop = false;
  timeUnits.forEach(({
    millis, singular, plural, terse: terseSuffix,
  }) => {
    if (stop) {
      return;
    }

    const count = Math.floor(remainder / millis);
    if (count > 0) {
      const suffix = terse ? terseSuffix : ` ${count === 1 ? singular : plural}`;
      terms.push(`${count}${suffix}`);
    }
    remainder %= millis;

    if (minimumUnit === singular) {
      stop = true;
    }
    if (maxElements > 0 && terms.length >= maxElements) {
      stop = true;
    }
  });

  if (terms.length === 0) {
    return terse ? 'now' : 'just now';
  }

  if (terse) {
    return terms.join('');
  } else {
    return `${terms.join(', ')}${relative}`;
  }
}
