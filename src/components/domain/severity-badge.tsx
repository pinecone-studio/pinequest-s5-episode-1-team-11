import { useTranslations } from "next-intl";
import { Pill, type PillTone } from "@/components/ui/pill";
import type { EventStatus, Severity } from "@/contracts";

const tone: Record<Severity, PillTone> = {
  critical: "danger",
  warning: "warning",
  info: "neutral",
};

/** "Аюултай" / "Анхааруулга" / "Мэдээлэл" label with matching colour. */
export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const t = useTranslations("common.severity");
  return (
    <Pill tone={tone[severity]} pulse={severity === "critical"} className={className}>
      {t(severity)}
    </Pill>
  );
}

const statusTone: Record<EventStatus, PillTone> = {
  new: "danger",
  acknowledged: "ok",
  false_alarm: "neutral",
  resolved: "neutral",
};

/** "Шинэ" / "Харсан" / "Хуурамч" / "Шийдсэн". */
export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  const t = useTranslations("common.eventStatus");
  return (
    <Pill tone={statusTone[status]} pulse={status === "new"} className={className}>
      {t(status)}
    </Pill>
  );
}
