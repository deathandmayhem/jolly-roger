import type { TFunction } from "i18next";

const timeUnits = [
  { millis: 1000, singular: "second" as const, terse: "s" },
  {
    millis: 60 * 1000,
    singular: "minute" as const,
    terse: "m",
  },
  {
    millis: 60 * 60 * 1000,
    singular: "hour" as const,
    terse: "h",
  },
  {
    millis: 24 * 60 * 60 * 1000,
    singular: "day" as const,
    terse: "d",
  },
  {
    millis: 365 * 24 * 60 * 60 * 1000,
    singular: "year" as const,
    terse: "y",
  },
].toReversed();

export type RelativeTimeFormatOpts = {
  minimumUnit?: (typeof timeUnits)[number]["singular"];
  maxElements?: number;
  terse?: boolean;
  now?: Date;
};

export function complete(
  d: Date,
  t: TFunction,
  opts: RelativeTimeFormatOpts = {},
) {
  const {
    minimumUnit = "second",
    terse = false,
    maxElements = terse ? -1 : 1,
    now = new Date(),
  } = opts;
  const diff = now.getTime() - d.getTime();
  const relative =
    diff < 0 ? t("datetime.fromNow", " from now") : t("datetime.ago", " ago");

  let remainder = Math.abs(diff);
  const terms = [] as string[];
  let stop = false;
  let lastUnit: (typeof timeUnits)[number] | undefined;
  timeUnits.forEach(({ millis, singular, terse: terseSuffix }) => {
    if (stop) {
      return;
    }

    lastUnit = {
      millis,
      singular,
      terse: terseSuffix,
    };

    const count = Math.floor(remainder / millis);
    if (count > 0) {
      const suffix = terse
        ? terseSuffix
        : `${t("datetime.suffixLeadingSpace", " ")}${t(`datetime.${singular}`, singular, { count: count })}`;
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
    formatted = terse
      ? t("datetime.now", "now")
      : t("datetime.justNow", "just now");
  } else if (terse) {
    formatted = terms.join("");
  } else {
    formatted = `${terms.join(t("datetime.termSeparator", ", "))}${relative}`;
  }

  return { formatted, millisUntilChange };
}

export default function relativeTimeFormat(
  d: Date,
  t: TFunction,
  opts: RelativeTimeFormatOpts = {},
) {
  const { formatted } = complete(d, t, opts);
  return formatted;
}
