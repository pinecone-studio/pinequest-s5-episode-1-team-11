import "server-only";
import { createHmac } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

/** A view ends by itself; the page asks for a fresh token to keep watching. */
export const STREAM_TTL_S = 600;

/** "<expiry>.<hex HMAC of 'live/<device>:<expiry>'>", checked by cctv/stream_auth.py. */
export function streamToken(deviceId: string, secret: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + STREAM_TTL_S;
  const signature = createHmac("sha256", secret)
    .update(`live/${deviceId}:${expires}`)
    .digest("hex");
  return `${expires}.${signature}`;
}

/** WHEP address and token for one CCTV camera, or null when this deployment has no camera server. */
export function cameraStream(deviceId: string) {
  const { streamSecret, streamUrl } = serverEnv;
  if (!streamSecret || !streamUrl) return null;
  return {
    whep: new URL(`live/${deviceId}/whep`, streamUrl).toString(),
    token: streamToken(deviceId, streamSecret),
    expiresIn: STREAM_TTL_S,
  };
}

export type ProvisionedCamera = { deviceId: string; server: string; streamKey: string };

/**
 * Asks the camera server to pair a CCTV camera with this pairing code (cctv/control.py
 * /provision). Signed "<unix seconds>.<body>" with the shared secret. Null when it failed.
 */
export async function provisionCamera(code: string, now = Date.now()) {
  const { streamSecret, streamUrl } = serverEnv;
  if (!streamSecret || !streamUrl) return null;
  const body = JSON.stringify({ code });
  const sentAt = String(Math.floor(now / 1000));
  const signature = createHmac("sha256", streamSecret).update(`${sentAt}.${body}`).digest("hex");
  const response = await fetch(new URL("provision", streamUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-halo-time": sentAt,
      "x-halo-signature": signature,
    },
    body,
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!response?.ok) return null;
  return (await response.json().catch(() => null)) as ProvisionedCamera | null;
}
