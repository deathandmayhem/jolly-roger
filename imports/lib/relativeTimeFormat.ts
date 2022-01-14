/* eslint-disable object-curly-newline */
const timeUnits = [
  { millis: 1000, singular: 'second', plural: 'seconds', terse: 's' },
  { millis: 60 * 1000, singular: 'minute', plural: 'minutes', terse: 'm' },
  { millis: 60 * 60 * 1000, singular: 'hour', plural: 'hours', terse: 'h' },
  { millis: 24 * 60 * 60 * 1000, singular: 'day', plural: 'days', terse: 'd' },
  { millis: 365 * 24 * 60 * 60 * 1000, singular: 'year', plural: 'years', terse: 'y' },
].reverse();
/* eslint-enable object-curly-newline */

export function terseRelativeTimeFormat(d: Date, opts: {
  minimumUnit?: 'second' | 'minute' | 'hour' | 'day' | 'year',
  maxElements?: number
  now?: Date,
} = {}) {
  const {
    minimumUnit = 'seconds',
    maxElements = -1,
    now = new Date(),
  } = opts;
  const diff = now.getTime() - d.getTime();
  let remainder = Math.abs(diff);
  const terms = [] as string[];
  let stop = false;

  timeUnits.forEach(({ millis, singular, terse }) => {
    if (stop) {
      return;
    }

    const count = Math.floor(remainder / millis);
    if (count > 0) {
      terms.push(`${count}${terse}`);
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
    return 'now';
  }

  return terms.join('');
}

export default function relativeTimeFormat(d: Date, opts: {
  complete?: boolean,
  minimumUnit?: 'second' | 'minute' | 'hour' | 'day' | 'year',
  now?: Date,
} = {}) {
  const {
    complete = false,
    minimumUnit = 'seconds',
    now = new Date(),
  } = opts;
  const diff = now.getTime() - d.getTime();
  const relative = diff < 0 ? ' from now' : ' ago';

  let remainder = Math.abs(diff);
  const terms = [] as string[];
  let stop = false;
  timeUnits.forEach(({ millis, singular, plural }) => {
    if (stop) {
      return;
    }

    const count = Math.floor(remainder / millis);
    if (count > 0) {
      terms.push(`${count} ${count === 1 ? singular : plural}`);
    }
    remainder %= millis;

    if (minimumUnit === singular) {
      stop = true;
    }
  });

  if (terms.length === 0) {
    return 'just now';
  }

  if (complete) {
    return `${terms.join(', ')}${relative}`;
  }

  return `${terms[0]}${relative}`;
}
