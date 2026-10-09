import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HouseholdRealtime } from "@/components/app/household-realtime";
import { PageHeader } from "@/components/app/page-header";
import { DeviceStatus } from "@/components/domain/device-status";
import { RelativeTime } from "@/components/domain/relative-time";
import { Button } from "@/components/ui/button";
import { DeviceEditor } from "@/features/devices/components/device-editor";
import { getDevice } from "@/features/devices/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, device] = await Promise.all([getTranslations("devices"), getDevice(id)]);
  if (!device) notFound();
  return (
    <>
      {isSupabaseConfigured && (
        <HouseholdRealtime householdId={device.householdId} tables={["devices"]} />
      )}
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href={routes.devices}>
          <ArrowLeftIcon aria-hidden="true" />
          {t("back")}
        </Link>
      </Button>
      <div className="[&_h1]:break-words [&_p]:break-words">
        <PageHeader
          title={device.name}
          subtitle={`${device.roomName} · ${t(`kinds.${device.kind}`)}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <DeviceStatus status={device.status} />
        <p className="text-sm text-muted-foreground">
          {t("lastSeen")} ·{" "}
          {device.lastSeenAt ? <RelativeTime date={device.lastSeenAt} /> : t("neverSeen")}
        </p>
      </div>
      {device.status === "offline" && (
        <p className="rounded-md border border-warning/25 bg-warning/5 p-4 text-base text-warning-text">
          {t("offline.body")}
        </p>
      )}
      <DeviceEditor key={device.id} device={device} demo={!isSupabaseConfigured} />
    </>
  );
}
