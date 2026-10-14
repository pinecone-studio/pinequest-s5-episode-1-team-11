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
