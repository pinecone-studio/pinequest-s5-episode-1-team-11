import { PlusIcon, VideoCameraIcon, WifiSlashIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HouseholdRealtime } from "@/components/app/household-realtime";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeviceCard } from "@/features/devices/components/device-card";
import { getHousehold, listDevices } from "@/features/devices/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";

export default async function Page() {
  const [t, devices, household] = await Promise.all([
    getTranslations("devices"),
    listDevices(),
    getHousehold(),
  ]);
  const online = devices.filter((device) => device.status === "online").length;
  const hasOffline = devices.some((device) => device.status === "offline");
  return (
    <>
      {isSupabaseConfigured && household && (
        <HouseholdRealtime householdId={household.id} tables={["devices"]} />
      )}
      <PageHeader title={t("title")} subtitle={t("summary", { online, total: devices.length })} />
      <Button asChild block className="lg:w-fit">
        <Link href={routes.newDevice}>
          <PlusIcon aria-hidden="true" />
          {t("add")}
        </Link>
      </Button>
      {!isSupabaseConfigured && (
        <p className="text-base text-muted-foreground">{t("demoNotice")}</p>
      )}
      {devices.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<VideoCameraIcon aria-hidden="true" />}
          title={t("empty.title")}
          description={t("empty.body")}
        />
      )}
      {hasOffline && (
        <aside className="flex gap-3 rounded-lg border border-warning/25 bg-warning/5 p-5">
          <WifiSlashIcon aria-hidden="true" className="mt-1 size-6 shrink-0 text-warning-text" />
          <div className="grid gap-2">
            <h2 className="text-md font-bold">{t("offline.title")}</h2>
            <p className="text-base text-muted-foreground">{t("offline.body")}</p>
            <p className="text-sm text-muted-foreground">{t("offline.help")}</p>
          </div>
        </aside>
      )}
    </>
  );
}
