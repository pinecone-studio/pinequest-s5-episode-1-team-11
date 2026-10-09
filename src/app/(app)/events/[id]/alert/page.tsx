import { ArrowLeftIcon, PhoneCallIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HouseholdRealtime } from "@/components/app/household-realtime";
import { EventIcon } from "@/components/domain/event-icon";
import { EventStatusBadge } from "@/components/domain/severity-badge";
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
  if (event.severity !== "critical") redirect(routes.event(event.id));
  return (
    <>
      {isSupabaseConfigured && household && (
        <HouseholdRealtime householdId={household.id} tables={tables} />
      )}
      <Link
        href={routes.event(event.id)}
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-muted-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-5" />
        {common("actions.back")}
      </Link>
      <header className="grid justify-items-center gap-3 rounded-2xl border border-destructive/32 bg-destructive/8 p-6 text-center md:p-8">
        <EventIcon kind={event.kind} severity={event.severity} size="lg" />
        <p className="text-sm font-bold text-destructive-text">{t("alertTitle")}</p>
        <h1 className="font-display text-[28px] leading-9 md:text-[32px]">
          {common(`eventKind.${event.kind}`)}
        </h1>
        <p className="text-base text-muted-foreground">
          {[event.personName, event.roomName].filter(Boolean).join(" · ")}
        </p>
        <EventStatusBadge status={event.status} />
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="grid gap-6">
          <EventSnapshot url={event.snapshotUrl} />
          <EventFacts event={event} />
        </div>
        <aside className="glass-strong grid gap-6 rounded-2xl p-6 lg:sticky lg:top-8">
          <p className="text-base font-semibold">{t("alert.check")}</p>
          <div className="grid gap-2">
            <Button asChild variant="destructive" size="lg" block>
              <a href="tel:103">
                <PhoneCallIcon aria-hidden="true" />
                {t("alert.call")}
              </a>
            </Button>
            <p className="text-center text-sm text-muted-foreground">{t("alert.callHint")}</p>
          </div>
          <EventActions event={event} demo={!isSupabaseConfigured} />
        </aside>
      </div>
    </>
  );
}
