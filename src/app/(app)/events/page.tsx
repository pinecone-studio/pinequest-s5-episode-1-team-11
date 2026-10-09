import { getTranslations } from "next-intl/server";
import { HouseholdRealtime } from "@/components/app/household-realtime";
import { PageHeader } from "@/components/app/page-header";
import { EventTimeline } from "@/features/events/components/event-timeline";
import { listEvents } from "@/features/events/queries";
import { getHousehold } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";

const tables = ["events"] as const;

export default async function Page() {
  const [t, events, household] = await Promise.all([
    getTranslations("events"),
    listEvents(),
    getHousehold(),
  ]);
  return (
    <>
      {isSupabaseConfigured && household && (
        <HouseholdRealtime householdId={household.id} tables={tables} />
      )}
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <EventTimeline events={events} />
      <p className="text-sm text-muted-foreground">{t("historyLimit")}</p>
    </>
  );
}
