"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Event } from "@/contracts";
import { type EventActionState, respondToEvent } from "../actions";

export function EventActions({ event, demo }: { event: Event; demo: boolean }) {
  const t = useTranslations("events");
  const [state, action, pending] = useActionState<EventActionState, FormData>(respondToEvent, {});
  const [falseAlarm, setFalseAlarm] = useState(false);
  // Server refreshes also include another caregiver's response; keep that status authoritative.
  const status = event.status;
  const canRespond = status === "new" || status === "acknowledged";

  return (
    <section className="grid gap-4" aria-label={t("action.title")}>
      {demo && <p className="text-sm text-muted-foreground">{t("action.demo")}</p>}
      {state.status && (
        <p role="status" className="flex items-center gap-2 text-sm font-bold text-primary-text">
          <CheckCircleIcon aria-hidden="true" className="size-5" />
          {t(state.status === "acknowledged" ? "action.acknowledged" : "action.falseAlarmSaved")}
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive-text">
          {state.error}
        </p>
      )}
      {canRespond && (
        <form action={action} className="grid gap-3">
          <input type="hidden" name="eventId" value={event.id} />
          {falseAlarm ? (
            <>
              <label className="grid gap-2 text-sm font-bold">
                {t("action.note")}
                <textarea
                  name="note"
                  maxLength={300}
                  rows={3}
                  defaultValue={event.note ?? ""}
                  placeholder={t("action.notePlaceholder")}
                  className="min-h-24 w-full rounded-xl border border-hairline bg-card p-4 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={pending || demo}
                />
              </label>
              <p className="text-sm text-muted-foreground">{t("action.falseAlarmHint")}</p>
              <Button
                type="submit"
                name="response"
                value="false_alarm"
                block
                loading={pending}
                disabled={demo}
                variant="secondary"
              >
                {t("action.falseAlarmConfirm")}
              </Button>
              <Button variant="ghost" onClick={() => setFalseAlarm(false)} disabled={pending}>
                {t("action.cancel")}
              </Button>
            </>
          ) : (
            <>
              {status === "new" && (
                <Button
                  type="submit"
                  name="response"
                  value="acknowledged"
                  block
                  loading={pending}
                  disabled={demo}
                >
                  <CheckCircleIcon aria-hidden="true" />
                  {t("action.acknowledge")}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setFalseAlarm(true)}
                disabled={pending || demo}
                block
              >
                {t("action.falseAlarm")}
              </Button>
            </>
          )}
        </form>
      )}
      {!canRespond && <p className="text-sm text-muted-foreground">{t("action.closed")}</p>}
    </section>
  );
}
