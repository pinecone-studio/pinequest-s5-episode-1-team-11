import {
  CaretRightIcon,
  DesktopIcon,
  DeviceMobileIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DeviceStatus } from "@/components/domain/device-status";
import { RelativeTime } from "@/components/domain/relative-time";
import type { Device } from "@/contracts";
import { routes } from "@/lib/routes";

export async function DeviceCard({ device }: { device: Device }) {
  const t = await getTranslations("devices");
  const Icon =
    device.kind === "phone"
      ? DeviceMobileIcon
      : device.kind === "laptop"
        ? DesktopIcon
        : VideoCameraIcon;
  return (
    <Link
      href={routes.device(device.id)}
      className="glass grid min-w-0 gap-4 rounded-lg p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary/10 text-primary-text">
          <Icon className="size-6" weight="duotone" aria-hidden="true" />
        </span>
        <DeviceStatus status={device.status} />
      </div>
      <div className="flex items-center gap-3">
        <div className="grid min-w-0 flex-1 gap-1">
          <h2 className="break-words text-lg font-bold">{device.name}</h2>
          <p className="break-words text-base text-muted-foreground">
            {device.roomName} · {t(`kinds.${device.kind}`)}
          </p>
        </div>
        <CaretRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground">
        {t("lastSeen")} ·{" "}
        {device.lastSeenAt ? <RelativeTime date={device.lastSeenAt} /> : t("neverSeen")}
      </p>
    </Link>
  );
}
