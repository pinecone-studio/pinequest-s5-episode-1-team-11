"use client";

import { useFormatter, useNow } from "next-intl";

/**
 * "3 минутын өмнө", refreshed every 30 seconds.
 * The exact date and time is in the title and in <time dateTime> for screen readers.
 */
export function RelativeTime({ date, className }: { date: string | Date; className?: string }) {
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const d = typeof date === "string" ? new Date(date) : date;
  return (
    <time
      dateTime={d.toISOString()}
      title={format.dateTime(d, { dateStyle: "medium", timeStyle: "short" })}
      className={className}
      suppressHydrationWarning
    >
      {format.relativeTime(d, now)}
    </time>
  );
}
