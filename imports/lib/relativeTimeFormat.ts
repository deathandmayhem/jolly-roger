const timeUnits = [
  { millis: 1000, singular: "second" as const, plural: "seconds", terse: "s" },
  {
    millis: 60 * 1000,
    singular: "minute" as const,
    plural: "minutes",
    terse: "m",
  },
  {
    millis: 60 * 60 * 1000,
    singular: "hour" as const,
    plural: "hours",
    terse: "h",
  },
  {
    millis: 24 * 60 * 60 * 1000,
    singular: "day" as const,
    plural: "days",
    terse: "d",
  },
  {
    millis: 365 * 24 * 60 * 60 * 1000,
    singular: "year" as const,
    plural: "years",
    terse: "y",
  },
].toReversed();

export type RelativeTimeFormatOpts = {
  minimumUnit?: (typeof timeUnits)[number]["singular"];
  maxElements?: number;
  terse?: boolean;
  now?: Date;
};

export function complete(d: Date, opts: RelativeTimeFormatOpts = {}) {
  const {
    minimumUnit = "seconds",
    terse = false,
    maxElements = terse ? -1 : 1,
    now = new Date(),
  } = opts;
  const diff = now.getTime() - d.getTime();
  const relative = diff < 0 ? " from now" : " ago";

  let remainder = Math.abs(diff);
  const terms = [] as string[];
  let stop = false;
  let lastUnit: (typeof timeUnits)[number] | undefined;
  timeUnits.forEach(({ millis, singular, plural, terse: terseSuffix }) => {
    if (stop) {
      return;
    }

    lastUnit = {
      millis,
      singular,
      plural,
      terse: terseSuffix,
    };

    const count = Math.floor(remainder / millis);
    if (count > 0) {
      const suffix = terse
        ? terseSuffix
        : ` ${count === 1 ? singular : plural}`;
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

  const millisUntilChange = (lastUnit?.millis ?? 0) - remainder;

  let formatted: string;
  if (terms.length === 0) {
    formatted = terse ? "now" : "just now";
  } else if (terse) {
    formatted = terms.join("");
  } else {
    formatted = `${terms.join(", ")}${relative}`;
  }

  return { formatted, millisUntilChange };
}

export default function relativeTimeFormat(
  d: Date,
  opts: RelativeTimeFormatOpts = {},
) {
  const { formatted } = complete(d, opts);
  return formatted;
}
