const todayFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const thisWeekFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

const defaultFormatter = new Intl.DateTimeFormat(undefined, {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function calendarTimeFormat(d: Date, now: Date = new Date()): string {
  if (isSameDay(d, now)) {
    return `Today at ${todayFormatter.format(d)}`;
  }

  const diff = now.getTime() - d.getTime();
  if (diff > 0 && diff < 6 * 24 * 60 * 60 * 1000) {
    return thisWeekFormatter.format(d);
  }

  return defaultFormatter.format(d);
}

// Extra compact formatting used in the chat window on the puzzle page
export function shortCalendarTimeFormat(
  d: Date,
  now: Date = new Date(),
): string {
  if (isSameDay(d, now)) {
    return todayFormatter.format(d);
  }
  return calendarTimeFormat(d, now);
}
