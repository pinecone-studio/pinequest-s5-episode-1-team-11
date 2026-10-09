import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { EventStatusBadge } from "@/components/domain/severity-badge";
import type { Event } from "@/contracts";
import { routes } from "@/lib/routes";

export function EventFacts({ event }: { event: Event }) {
  const t = useTranslations("events.detail");
  const format = useFormatter();
  const timestamp = (date: string) =>
    format.dateTime(new Date(date), { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className="glass grid gap-4 rounded-2xl p-6" aria-label={t("facts")}>
      <h2 className="text-md font-bold">{t("facts")}</h2>
      <dl className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-sm text-muted-foreground">{t("status")}</dt>
          <dd>
            <EventStatusBadge status={event.status} />
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-sm text-muted-foreground">{t("time")}</dt>
          <dd className="text-right text-sm font-semibold">
            <time dateTime={event.occurredAt}>{timestamp(event.occurredAt)}</time>
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-sm text-muted-foreground">{t("room")}</dt>
          <dd className="max-w-[65%] break-words text-right text-sm font-semibold">
            {event.roomName}
          </dd>
        </div>
        {event.personName && (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-sm text-muted-foreground">{t("person")}</dt>
            <dd className="max-w-[65%] break-words text-right text-sm font-semibold">
              {event.personName}
            </dd>
          </div>
        )}
        {event.confidence !== null && (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-sm text-muted-foreground">{t("confidence")}</dt>
            <dd className="text-sm font-semibold tabular">{Math.round(event.confidence * 100)}%</dd>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-sm text-muted-foreground">{t("notification")}</dt>
          <dd className="max-w-[65%] text-right text-sm font-semibold">
            {event.notifiedAt ? timestamp(event.notifiedAt) : t("notNotified")}
          </dd>
        </div>
        {event.acknowledgedBy && (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-sm text-muted-foreground">{t("responder")}</dt>
            <dd className="text-right text-sm font-semibold">
              {event.acknowledgedBy}
              {event.acknowledgedAt && (
                <span className="mt-1 block text-muted-foreground">
                  {timestamp(event.acknowledgedAt)}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
      {event.note && (
        <p className="break-words whitespace-pre-wrap border-t border-hairline pt-4 text-sm text-muted-foreground">
          {event.note}
        </p>
      )}
      {event.deviceId && (
        <Link
          href={routes.device(event.deviceId)}
          className="min-h-11 content-center text-sm font-bold text-primary-text underline-offset-4 hover:underline"
        >
          {t("camera")}
        </Link>
      )}
    </section>
  );
}
