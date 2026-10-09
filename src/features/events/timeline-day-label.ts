const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

type DayTranslator = (
  key: "days.today" | "days.yesterday" | "days.date" | `days.months.${(typeof months)[number]}`,
  values?: { year: string; month: string; day: string },
) => string;

/** Translate date text explicitly: browsers may fall back from Mongolian ICU dates to English. */
export function timelineDayLabel(day: string, today: string, translate: DayTranslator) {
  const yesterday = new Date(new Date(`${today}T12:00:00Z`).getTime() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (day === today) return translate("days.today");
  if (day === yesterday) return translate("days.yesterday");
  const [year, month, date] = day.split("-");
  const monthKey = months[Number(month) - 1];
  if (!monthKey || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new RangeError("Invalid timeline day");
  return translate("days.date", {
    year,
    month: translate(`days.months.${monthKey}`),
    day: String(Number(date)),
  });
}
