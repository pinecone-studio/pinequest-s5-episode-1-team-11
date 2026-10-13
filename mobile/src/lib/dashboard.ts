import type { Device, HaloEvent } from "./types";

export function dashboardState(
  devices: Device[],
  events: HaloEvent[],
  pending: boolean,
  disconnected: boolean,
) {
  const online = devices.filter((device) => device.status === "online").length;
  const rooms = new Set(
    devices
      .filter((device) => device.status === "online")
      .map((device) => device.room_name?.trim())
      .filter(Boolean),
  ).size;
  const warnings = events.filter(
    (event) => event.status === "new" && event.severity !== "info",
  ).length;
  const critical = events.some(
    (event) => event.status === "new" && event.severity === "critical",
  );
  const calm =
    !pending &&
    !disconnected &&
    !warnings &&
    devices.length > 0 &&
    online === devices.length;
  const title = pending
    ? "Шалгаж байна…"
    : disconnected
      ? "Холболтоо шалгана уу"
      : critical
        ? "Яаралтай дохио байна"
        : warnings
          ? `${warnings} шинэ анхааруулга`
          : !devices.length
            ? "Төхөөрөмж нэмэгдээгүй"
            : online === 0
              ? "Онлайн төхөөрөмж алга"
              : !calm
                ? "Төхөөрөмжөө шалгана уу"
                : "Бүгд тайван";
  return { online, rooms, warnings, calm, critical, title };
}

// Events are available; continuous motion data is not recorded in this schema.
export function todayEvents(events: HaloEvent[], now: Date) {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).getTime();
  return events.filter((event) => {
    const time = Date.parse(event.occurred_at);
    return time >= start && time < end;
  });
}

export function eventHistogram(events: HaloEvent[], now: Date) {
  const bins = Array.from({ length: 48 }, () => 0);
  for (const event of todayEvents(events, now)) {
    const time = new Date(event.occurred_at);
    bins[time.getHours() * 2 + Math.floor(time.getMinutes() / 30)] += 1;
  }
  return bins;
}

export function elapsedLabel(iso: string | null, now: Date) {
  if (!iso) return "Шалгаагүй";
  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(iso)) / 1000),
  );
  if (!Number.isFinite(seconds)) return "Тодорхойгүй";
  if (seconds < 60) return "Дөнгөж сая";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} минутын өмнө`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} цагийн өмнө`;
  return `${Math.floor(seconds / 86400)} өдрийн өмнө`;
}
