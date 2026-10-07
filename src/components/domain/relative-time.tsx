"use client";

import { useNow, useTimeZone, useTranslations } from "next-intl";
import { formatTimestamp, relativeTimeParts } from "@/lib/time";

/**
 * "3 минутын өмнө", refreshed every 30 seconds.
 * The exact date and time is in the title and in <time dateTime> for screen readers.
 */
export function RelativeTime({ date, className }: { date: string | Date; className?: string }) {
  const t = useTranslations("common.relativeTime");
  const timeZone = useTimeZone() ?? "Asia/Ulaanbaatar";
  const now = useNow({ updateInterval: 30_000 });
  const d = typeof date === "string" ? new Date(date) : date;
  const { key, count } = relativeTimeParts(d, now);
  return (
    <time dateTime={d.toISOString()} title={formatTimestamp(d, timeZone)} className={className}>
      {t(key, { count })}
    </time>
  );
}
