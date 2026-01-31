import type { TFunction } from "i18next";

const todayFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const todayFormatterCache: Record<string, Intl.DateTimeFormat> = {};
export function getTodayFormatter(
  lang: string | undefined,
): Intl.DateTimeFormat {
  if (!lang) {
    return todayFormatter;
  }
  if (!todayFormatterCache[lang]) {
    todayFormatterCache[lang] = new Intl.DateTimeFormat(lang, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return todayFormatterCache[lang];
}

const thisWeekFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});
const weekFormatterCache: Record<string, Intl.DateTimeFormat> = {};
export function getThisWeekFormatter(
  lang: string | undefined,
): Intl.DateTimeFormat {
  if (!lang) {
    return thisWeekFormatter;
  }
  if (!weekFormatterCache[lang]) {
    weekFormatterCache[lang] = new Intl.DateTimeFormat(lang, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return weekFormatterCache[lang];
}

const defaultFormatter = new Intl.DateTimeFormat(undefined, {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const defaultFormatterCache: Record<string, Intl.DateTimeFormat> = {};
export function getDefaultFormatter(
  lang: string | undefined,
): Intl.DateTimeFormat {
  if (!lang) {
    return defaultFormatter;
  }
  if (!defaultFormatterCache[lang]) {
    defaultFormatterCache[lang] = new Intl.DateTimeFormat(lang, {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return defaultFormatterCache[lang];
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function calendarTimeFormat(
  d: Date,
  t: TFunction,
  language: string,
  now: Date = new Date(),
): string {
  if (isSameDay(d, now)) {
    return `${t("datetime.todayAt", "Today at")} ${getTodayFormatter(language).format(d)}`;
  }

  const diff = now.getTime() - d.getTime();
  if (diff > 0 && diff < 6 * 24 * 60 * 60 * 1000) {
    return getThisWeekFormatter(language).format(d);
  }

  return getDefaultFormatter(language).format(d);
}

// Extra compact formatting used in the chat window on the puzzle page
export function shortCalendarTimeFormat(
  d: Date,
  t: TFunction,
  language: string,
  now: Date = new Date(),
): string {
  if (isSameDay(d, now)) {
    return getTodayFormatter(language).format(d);
  }
  return calendarTimeFormat(d, t, language, now);
}
