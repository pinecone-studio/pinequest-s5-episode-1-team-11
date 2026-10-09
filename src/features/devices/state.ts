import { z } from "zod";
import { DetectionSettings, DeviceKind, type PairingCode } from "@/contracts";

const label = z.string().trim().min(1).max(60);
const expectedDraft = z
  .object({
    name: z.string().min(1).max(60),
    roomName: z.string().min(1).max(60),
    settings: DetectionSettings.strict(),
  })
  .strict();
export const NewDeviceInput = z.object({ name: label, roomName: label, kind: DeviceKind }).strict();
export const EditDeviceInput = z
  .object({
    id: z.uuid(),
    name: label,
    roomName: label,
    settings: DetectionSettings.strict(),
    expected: expectedDraft,
  })
  .strict();

export type DeviceActionError =
  | "invalid"
  | "unavailable"
  | "unauthorized"
  | "notFound"
  | "failed"
  | "limit"
  | "conflict";
export type DeviceActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: DeviceActionError };
export type PairingDetails = PairingCode & { monitorUrl: string; qrDataUrl: string };
export type PairingStatus =
  | { status: "waiting" | "expired" }
  | { status: "paired"; deviceId: string };

/** Derive from the deadline, rather than subtracting ticks in a suspended tab. */
export function pairingSecondsRemaining(expiresAt: string, now: number) {
  const deadline = Date.parse(expiresAt);
  return Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}

export function pairingStatus(pairing: PairingCode, now: number): PairingStatus {
  // Claiming a code also expires it: success takes precedence over its deadline.
  if (pairing.deviceId) return { status: "paired", deviceId: pairing.deviceId };
  return { status: pairingSecondsRemaining(pairing.expiresAt, now) ? "waiting" : "expired" };
}

export function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
