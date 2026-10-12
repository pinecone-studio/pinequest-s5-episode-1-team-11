import "server-only";
import { createHmac } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

/** Channel names change every hour, so someone removed from a household loses access soon. */
const WINDOW_MS = 60 * 60_000;

/**
 * Broadcast channels for one camera: this hour's name first, then last hour's. Derived with the
 * server key, so only the camera itself (told on heartbeat) and members of its household (told by
 * an action) can find them. The camera listens on both, so a view open at the turn of the hour
 * keeps working.
 */
export function liveChannelsFor(deviceId: string, now = Date.now()): [string, string] | null {
  const secret = serverEnv.supabaseSecretKey;
  if (!secret) return null;
  const window = Math.floor(now / WINDOW_MS);
  const name = (slot: number) => {
    const digest = createHmac("sha256", secret)
      .update(`halo-live:${deviceId}:${slot}`)
      .digest("hex");
    return `live-${digest.slice(0, 40)}`;
  };
  return [name(window), name(window - 1)];
}
