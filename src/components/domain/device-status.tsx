import { useTranslations } from "next-intl";
import { Pill } from "@/components/ui/pill";
import type { DeviceStatus as Status } from "@/contracts";
import { RelativeTime } from "./relative-time";

/** "Онлайн" / "Салсан · 2 цагийн өмнө" / "Холбогдож байна". Colour plus text. */
export function DeviceStatus({
  status,
  lastSeenAt,
  className,
}: {
  status: Status;
  lastSeenAt?: string | null;
  className?: string;
}) {
  const t = useTranslations("common.deviceStatus");
  if (status === "offline")
    return (
      <Pill tone="warning" className={className}>
        {t("offline")}
        {lastSeenAt && (
          <>
            {" · "}
            <RelativeTime date={lastSeenAt} />
          </>
        )}
      </Pill>
    );
  return (
    <Pill
      tone={status === "online" ? "ok" : "neutral"}
      pulse={status === "pairing"}
      className={className}
    >
      {t(status)}
    </Pill>
  );
}
