import { z } from "zod";
import { DeviceKind } from "./device";

/** 6 digits, shown as "482 917". */
export const PairingCodeValue = z.string().regex(/^\d{6}$/);

/** Created by the guardian's phone, shown on screen and as a QR code. */
export const PairingCode = z.object({
  code: PairingCodeValue,
  expiresAt: z.iso.datetime({ offset: true }),
  /** Set once a camera has used the code. */
  deviceId: z.uuid().nullable(),
});
export type PairingCode = z.infer<typeof PairingCode>;

export const PAIRING_TTL_MS = 10 * 60_000;

/** The camera device (/monitor) sends this to POST /api/v1/devices/pair. */
export const PairRequest = z.object({
  code: PairingCodeValue,
  kind: DeviceKind,
  userAgent: z.string().max(300).optional(),
});
export type PairRequest = z.infer<typeof PairRequest>;

/** Returned once; the device keeps the token and sends it as a Bearer token. */
export const PairResponse = z.object({
  deviceId: z.uuid(),
  deviceToken: z.string().min(32),
  name: z.string(),
  roomName: z.string(),
});
export type PairResponse = z.infer<typeof PairResponse>;

/** "482917" → "482 917" */
export function formatPairingCode(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
