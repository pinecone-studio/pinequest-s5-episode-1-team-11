import type { Device, HaloEvent } from "./types";

type HomeStatus = "alert" | "empty" | "offline" | "attention" | "calm";

/** Same order as the web (src/features/home/status.ts). */
export function homeStatus(devices: Device[], events: HaloEvent[]): HomeStatus {
  if (events.some((event) => event.status === "new" && event.severity === "critical"))
    return "alert";
  if (!devices.length) return "empty";
  if (devices.some((device) => device.status !== "online")) return "offline";
  return events.some((event) => event.status === "new") ? "attention" : "calm";
}
