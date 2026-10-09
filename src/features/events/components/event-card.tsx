import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EventIcon } from "@/components/domain/event-icon";
import { RelativeTime } from "@/components/domain/relative-time";
import { EventStatusBadge, SeverityBadge } from "@/components/domain/severity-badge";
import type { Event } from "@/contracts";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

export function EventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  const t = useTranslations("common.eventKind");
  return (
    <Link
      href={routes.event(event.id)}
      className={cn(
        "glass grid gap-4 rounded-2xl border p-4 transition-colors hover:bg-card focus-visible:outline-3 focus-visible:outline-ring md:p-6",
        event.severity === "critical" && event.status === "new" && "border-destructive/40",
      )}
    >
      <div className="flex items-start gap-3">
        <EventIcon kind={event.kind} severity={event.severity} />
        <div className="min-w-0 flex-1">
          <h3 className="text-md font-bold leading-6">{t(event.kind)}</h3>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {[event.personName, event.roomName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <CaretRightIcon aria-hidden="true" className="mt-3 size-5 shrink-0 text-muted-foreground" />
      </div>
      {!compact && event.note && (
        <p className="break-words whitespace-pre-wrap text-sm text-muted-foreground">
          {event.note}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RelativeTime date={event.occurredAt} className="text-sm text-muted-foreground" />
        <div className="flex flex-wrap gap-2">
          {!compact && <SeverityBadge severity={event.severity} />}
          <EventStatusBadge status={event.status} />
        </div>
      </div>
    </Link>
  );
}
