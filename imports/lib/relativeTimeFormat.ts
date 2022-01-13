const timeUnits = [
  { millis: 1000, singular: 'second', plural: 'seconds' },
  { millis: 60 * 1000, singular: 'minute', plural: 'minutes' },
  { millis: 60 * 60 * 1000, singular: 'hour', plural: 'hours' },
  { millis: 24 * 60 * 60 * 1000, singular: 'day', plural: 'days' },
  { millis: 365 * 24 * 60 * 60 * 1000, singular: 'year', plural: 'years' },
].reverse();

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
