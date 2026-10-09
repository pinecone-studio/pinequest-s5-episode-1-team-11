import { ArrowLeftIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HouseholdRealtime } from "@/components/app/household-realtime";
import { PageHeader } from "@/components/app/page-header";
import { EventIcon } from "@/components/domain/event-icon";
import { SeverityBadge } from "@/components/domain/severity-badge";
import { Button } from "@/components/ui/button";
import { EventActions } from "@/features/events/components/event-actions";
import { EventFacts } from "@/features/events/components/event-facts";
import { EventSnapshot } from "@/features/events/components/event-snapshot";
import { getEvent } from "@/features/events/queries";
import { getHousehold } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";

const tables = ["events"] as const;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, household, t, common] = await Promise.all([
    getEvent(id),
    getHousehold(),
    getTranslations("events"),
    getTranslations("common"),
  ]);
  if (!event) notFound();
  return (
    <>
      {isSupabaseConfigured && household && (
        <HouseholdRealtime householdId={household.id} tables={tables} />
      )}
      <Link
        href={routes.events}
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-muted-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-5" />
        {common("actions.back")}
      </Link>
      <PageHeader title={t("detailTitle")} />
      <div className="flex items-start gap-4">
        <EventIcon kind={event.kind} severity={event.severity} size="lg" />
        <div className="grid gap-2">
          <h2 className="font-display text-xl">{common(`eventKind.${event.kind}`)}</h2>
          <p className="text-base text-muted-foreground">
            {[event.personName, event.roomName].filter(Boolean).join(" · ")}
          </p>
          <SeverityBadge severity={event.severity} className="w-fit" />
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="grid gap-6">
          <EventSnapshot url={event.snapshotUrl} />
          <EventFacts event={event} />
        </div>
        <aside className="glass grid gap-6 rounded-2xl p-6 lg:sticky lg:top-8">
          <p className="text-sm text-muted-foreground">{t("detail.checkHint")}</p>
          {event.severity === "critical" && event.status === "new" && (
            <Button asChild variant="destructive" block>
              <Link href={routes.alert(event.id)}>
                <WarningCircleIcon aria-hidden="true" />
                {t("detail.openAlert")}
              </Link>
            </Button>
          )}
          <EventActions event={event} demo={!isSupabaseConfigured} />
        </aside>
      </div>
    </>
  );
}
