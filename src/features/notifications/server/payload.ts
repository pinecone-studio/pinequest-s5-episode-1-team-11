import type { Event, EventKind, PushPayload } from "@/contracts";
import { routes } from "@/lib/routes";

const labels: Record<EventKind, string> = {
  fall: "Уналт илэрлээ",
  scream: "Хашгирах дуу илэрлээ",
  cry: "Удаан уйлах дуу илэрлээ",
  glass: "Шил хагарах дуу илэрлээ",
  alarm: "Дохиоллын дуу илэрлээ",
  offline: "Камерын холболт тасарлаа",
  test: "Halo туршилтын мэдэгдэл",
};

export function eventPayload(event: Event): PushPayload {
  return {
    title: labels[event.kind],
    body: `${event.roomName}. ${event.severity === "critical" ? "Нөхцөл байдлыг одоо шалгана уу." : "Дэлгэрэнгүйг нээж шалгана уу."}`,
    url: event.severity === "critical" ? routes.alert(event.id) : routes.event(event.id),
    tag: event.id,
    severity: event.severity,
  };
}
