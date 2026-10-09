"use client";

import { BellIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useNow, useTimeZone, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Event } from "@/contracts";
import { routes } from "@/lib/routes";
import { formatTimestamp } from "@/lib/time";
import { timelineDayLabel } from "../timeline-day-label";
import { EventCard } from "./event-card";

type Filter = "all" | "new" | "critical";

export function EventTimeline({ events }: { events: Event[] }) {
  const t = useTranslations("events");
  const timeZone = useTimeZone() ?? "Asia/Ulaanbaatar";
  const now = useNow({ updateInterval: 60_000 });
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = events.filter((event) =>
    filter === "new"
      ? event.status === "new"
      : filter === "critical"
        ? event.severity === "critical"
        : true,
  );
  const groups = new Map<string, Event[]>();
  for (const event of filtered) {
    const key = formatTimestamp(new Date(event.occurredAt), timeZone).slice(0, 10);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  const today = formatTimestamp(now, timeZone).slice(0, 10);
  const dayLabel = (day: string) => timelineDayLabel(day, today, t);

  return (
    <div className="grid gap-6">
      <SegmentedControl
        options={(["all", "new", "critical"] as const).map((value) => ({
          value,
          label: t(`filters.${value}`),
        }))}
        value={filter}
        onValueChange={setFilter}
        label={t("filters.label")}
        className="max-w-xl"
      />
      <p className="text-sm text-muted-foreground" role="status">
        {t("count", { count: filtered.length })}
      </p>
      {!filtered.length && (
        <EmptyState
          icon={<BellIcon weight="duotone" />}
          title={t(events.length ? "empty.filteredTitle" : "empty.title")}
          description={t(events.length ? "empty.filteredBody" : "empty.body")}
          className="glass rounded-2xl"
          action={
            events.length ? (
              <Button variant="secondary" onClick={() => setFilter("all")}>
                {t("filters.clear")}
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href={routes.devices}>{t("empty.cameras")}</Link>
              </Button>
            )
          }
        />
      )}
      {[...groups].map(([day, group]) => (
        <section key={day} className="grid gap-3" aria-label={dayLabel(day)}>
          <h2 className="text-sm font-bold text-muted-foreground">{dayLabel(day)}</h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {group.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
