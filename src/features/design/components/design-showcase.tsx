"use client";

import { ArrowCounterClockwiseIcon, BellIcon, CameraIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { DeviceStatus } from "@/components/domain/device-status";
import { EventIcon } from "@/components/domain/event-icon";
import { RelativeTime } from "@/components/domain/relative-time";
import { EventStatusBadge, SeverityBadge } from "@/components/domain/severity-badge";
import { SlideToConfirm } from "@/components/domain/slide-to-confirm";
import { type RingState, StatusRing } from "@/components/domain/status-ring";
import type { Palette } from "@/components/theme/palettes";
import { LanguageSelect, ModeSelect, PaletteSelect } from "@/components/theme/theme-switcher";
import { Accordion } from "@/components/ui/accordion";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ListGroup, ListItem } from "@/components/ui/list";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { makeFixtures } from "@/contracts/fixtures";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid min-w-0 gap-4 border-t border-hairline pt-6">
      <h2 className="font-display text-lg">{title}</h2>
      {children}
    </section>
  );
}

export function DesignShowcase({ palette }: { palette: Palette }) {
  const t = useTranslations("design");
  const c = useTranslations("common");
  const [ring, setRing] = useState<RingState>("calm");
  const [enabled, setEnabled] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [fixtures] = useState(() => makeFixtures());
  return (
    <AppFrame>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Button asChild variant="secondary">
        <Link href="/home">{t("openApp")}</Link>
      </Button>
      <Section title={t("appearance")}>
        <ModeSelect />
        <PaletteSelect value={palette} />
        <LanguageSelect />
      </Section>
      <Section title={t("status")}>
        <SegmentedControl
          label={t("status")}
          value={ring}
          onValueChange={setRing}
          options={(["calm", "warning", "alert", "empty"] as const).map((value) => ({
            value,
            label: t(value),
          }))}
        />
        <div className="grid justify-items-center gap-2 py-4">
          <StatusRing state={ring}>
            <b>03</b>
            <span>{c("statusRing.rooms")}</span>
          </StatusRing>
          <p className="font-display text-xl" aria-live="polite">
            {t(ring)}
          </p>
        </div>
      </Section>
      <Section title={t("buttons")}>
        <Button onClick={() => toast.success(t("toast"))}>{t("primary")}</Button>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => toast(t("toast"))}>
            {t("secondary")}
          </Button>
          <Button variant="ghost" onClick={() => toast(t("toast"))}>
            {t("ghost")}
          </Button>
          <IconButton label={t("toast")} onClick={() => toast(t("toast"))}>
            <BellIcon aria-hidden="true" />
          </IconButton>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="warning" onClick={() => toast.warning(t("warning"))}>
            {t("warning")}
          </Button>
          <Button variant="destructive" onClick={() => setDialog(true)}>
            {c("actions.delete")}
          </Button>
          <Button disabled>{t("disabled")}</Button>
          <Button loading>{t("loading")}</Button>
        </div>
      </Section>
      <Section title={t("forms")}>
        <Input label={t("deviceName")} defaultValue="Halo" hint={t("inputHint")} />
        <Input label={t("room")} error={t("inputError")} />
        <ListGroup>
          <ListItem
            title={t("notifications")}
            leading={<BellIcon className="size-6" aria-hidden="true" />}
            trailing={
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                aria-label={t("notifications")}
              />
            }
          />
        </ListGroup>
      </Section>
      <Section title={t("events")}>
        <div className="glass grid gap-4 rounded-lg p-4">
          {fixtures.events.map((event) => (
            <div key={event.id} className="flex min-w-0 items-start gap-3">
              <EventIcon kind={event.kind} severity={event.severity} />
              <div className="grid min-w-0 flex-1 gap-2">
                <b>{c(`eventKind.${event.kind}`)}</b>
                <RelativeTime date={event.occurredAt} className="text-sm text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  <SeverityBadge severity={event.severity} />
                  <EventStatusBadge status={event.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title={t("lists")}>
        <ListGroup title={t("people")}>
          {fixtures.watchedPeople.map((person) => (
            <ListItem
              key={person.id}
              title={person.name}
              leading={<Avatar name={person.name} ring="ok" />}
            />
          ))}
        </ListGroup>
        <ListGroup title={t("devices")}>
          {fixtures.devices.map((device) => (
            <ListItem
              key={device.id}
              title={device.name}
              description={device.roomName}
              leading={<CameraIcon className="size-6" aria-hidden="true" />}
              trailing={<DeviceStatus status={device.status} />}
            />
          ))}
        </ListGroup>
      </Section>
      <Section title={t("feedback")}>
        <Sheet
          title={t("sheetTitle")}
          description={t("sheetDescription")}
          trigger={<Button variant="secondary">{t("openSheet")}</Button>}
        >
          <Input label={t("deviceName")} defaultValue="Halo" />
          <SheetClose asChild>
            <Button>{c("actions.close")}</Button>
          </SheetClose>
        </Sheet>
        {confirmed ? (
          <Button variant="secondary" onClick={() => setConfirmed(false)}>
            <ArrowCounterClockwiseIcon aria-hidden="true" />
            {t("reset")}
          </Button>
        ) : (
          <SlideToConfirm
            label={t("confirm")}
            onConfirm={() => {
              setConfirmed(true);
              toast.success(t("confirmed"));
            }}
          />
        )}
        <Accordion items={[{ id: "privacy", title: t("faqTitle"), content: t("faqAnswer") }]} />
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          icon={<CameraIcon aria-hidden="true" />}
        />
        <div className="glass grid gap-3 rounded-lg p-4" role="status" aria-label={t("loading")}>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-16" />
        </div>
      </Section>
      <AlertDialog
        open={dialog}
        onOpenChange={setDialog}
        title={t("dialogTitle")}
        description={t("dialogDescription")}
        confirmLabel={c("actions.confirm")}
        cancelLabel={c("actions.cancel")}
        onConfirm={() => {
          setDialog(false);
          toast.success(t("toast"));
        }}
      />
    </AppFrame>
  );
}
