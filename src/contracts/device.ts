import { z } from "zod";

export const DeviceKind = z.enum(["phone", "laptop", "ip_camera"]);
export type DeviceKind = z.infer<typeof DeviceKind>;

export const DeviceStatus = z.enum(["online", "offline", "pairing"]);
export type DeviceStatus = z.infer<typeof DeviceStatus>;

export const WatchedKind = z.enum(["child", "elderly", "disabled"]);
export type WatchedKind = z.infer<typeof WatchedKind>;

export const DetectionSettings = z.object({
  watching: WatchedKind,
  sensitivity: z.enum(["low", "medium", "high"]),
  fall: z.boolean(),
  /** Screaming and long crying. */
  distress: z.boolean(),
  /** Breaking glass and smoke/fire alarms. */
  hazard: z.boolean(),
});
export type DetectionSettings = z.infer<typeof DetectionSettings>;

export const defaultDetectionSettings: DetectionSettings = {
  watching: "elderly",
  sensitivity: "medium",
  fall: true,
  distress: true,
  hazard: true,
};

export const Device = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  name: z.string().min(1).max(60),
  roomName: z.string().min(1).max(60),
  kind: DeviceKind,
  status: DeviceStatus,
  lastSeenAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  settings: DetectionSettings,
});
export type Device = z.infer<typeof Device>;

/** A device counts as offline when no heartbeat arrived for this long. */
export const OFFLINE_AFTER_MS = 90_000;
