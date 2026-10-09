import {
  ArrowRightIcon,
  CameraIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HouseholdRealtime } from "@/components/app/household-realtime";
import { PageHeader } from "@/components/app/page-header";
import { DeviceStatus } from "@/components/domain/device-status";
import { StatusRing } from "@/components/domain/status-ring";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup, ListItem } from "@/components/ui/list";
import { EventCard } from "@/features/events/components/event-card";
import { getHomeSummary } from "@/features/home/queries";
import { homeStatus } from "@/features/home/status";
import { routes } from "@/lib/routes";

export default async function Page() {
  const [t, common, summary] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getHomeSummary(),
  ]);
  const state = homeStatus(summary.devices, summary.criticalEvent, summary.unreadCount);
  const ring =
    state === "alert"
      ? "alert"
      : state === "empty"
        ? "empty"
        : state === "calm"
          ? "calm"
          : "warning";
  return (
    <>
      {summary.household && <HouseholdRealtime householdId={summary.household.id} />}
      <PageHeader
        title={t("greeting", { name: summary.profile.name })}
        subtitle={summary.household?.name}
      />
      <section className="glass grid items-center gap-6 rounded-xl p-6 md:grid-cols-[196px_1fr] lg:p-8">
        <StatusRing state={ring} className="justify-self-center">
          <b>{summary.onlineCount.toString().padStart(2, "0")}</b>
          <span>{common("statusRing.online")}</span>
        </StatusRing>
        <div className="grid gap-3 text-center md:text-left">
          <h2 className="font-display text-2xl">{t(`state.${state}.title`)}</h2>
          <p className="max-w-lg text-base text-muted-foreground">{t(`state.${state}.hint`)}</p>
          <div className="mt-2 flex justify-center md:justify-start">
            <Button asChild variant={state === "alert" ? "destructive" : "primary"}>
              <Link
                href={
                  summary.criticalEvent
                    ? routes.alert(summary.criticalEvent.id)
                    : state === "empty"
                      ? routes.newDevice
                      : state === "offline"
                        ? routes.devices
                        : routes.events
                }
              >
                {t(`state.${state}.action`)}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-md font-bold">
              {t("cameras", { online: summary.onlineCount, total: summary.devices.length })}
            </h2>
            <Link
              href={routes.newDevice}
              aria-label={t("addCamera")}
              className="grid size-11 place-items-center rounded-full text-primary-text hover:bg-hairline"
            >
              <PlusIcon aria-hidden="true" className="size-5" />
            </Link>
          </div>
          {summary.devices.length ? (
            <ListGroup>
              {summary.devices.slice(0, 3).map((device) => (
                <ListItem
                  key={device.id}
                  href={routes.device(device.id)}
                  leading={
                    <CameraIcon
                      weight="duotone"
                      aria-hidden="true"
                      className="size-6 text-primary-text"
                    />
                  }
                  title={device.roomName}
                  description={device.name}
                  trailing={<DeviceStatus status={device.status} />}
                />
              ))}
            </ListGroup>
          ) : (
            <EmptyState
              icon={<CameraIcon />}
              title={t("noCameras")}
              description={t("noCamerasHint")}
            />
          )}
          {summary.devices.length > 0 && (
            <Link
              href={routes.devices}
              className="min-h-11 content-center text-sm font-bold text-primary-text"
            >
              {t("allCameras")}
            </Link>
          )}
        </section>
        <section className="grid gap-3">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <h2 className="text-md font-bold">{t("recentEvents")}</h2>
            <Link href={routes.events} className="text-sm font-bold text-primary-text">
              {common("actions.seeAll")}
            </Link>
          </div>
          {summary.events.length ? (
            summary.events
              .slice(0, 3)
              .map((event) => <EventCard key={event.id} event={event} compact />)
          ) : (
            <EmptyState
              icon={<ShieldCheckIcon />}
              title={t("noEvents")}
              description={t("noEventsHint")}
            />
          )}
        </section>
      </div>
      <p className="text-center text-sm text-muted-foreground">{t("monitorHint")}</p>
    </>
  );
}
