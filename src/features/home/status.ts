import type { Device, Event } from "@/contracts";

export type HomeStatus = "alert" | "empty" | "offline" | "attention" | "calm";
export function homeStatus(
  devices: readonly Device[],
  criticalEvent: Event | null,
  unreadCount: number,
): HomeStatus {
  if (criticalEvent) return "alert";
  if (!devices.length) return "empty";
  if (devices.some((device) => device.status !== "online")) return "offline";
  return unreadCount ? "attention" : "calm";
}
