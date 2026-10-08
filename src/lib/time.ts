const units = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
] as const;

/** Use translated messages: browser ICU locale support can differ from Node's. */
export function relativeTimeParts(date: Date, now: Date) {
  const difference = date.getTime() - now.getTime();
  if (!Number.isFinite(difference)) throw new RangeError("Invalid date");
  const elapsed = Math.abs(difference);
  if (elapsed < 60_000) return { key: difference > 0 ? "soon" : "now", count: 0 } as const;
  const [unit, duration] = units.find(([, duration]) => elapsed >= duration) ?? units[4];
  return {
    key: `${difference > 0 ? "future" : "past"}.${unit}` as const,
    count: Math.round(elapsed / duration),
  };
}

/** Fixed numeric tooltip with an explicit zone; no locale-specific punctuation. */
export function formatTimestamp(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}
