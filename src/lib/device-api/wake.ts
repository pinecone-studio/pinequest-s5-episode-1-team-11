import "server-only";
import type { PushPayload } from "@/contracts";
import { deliverPush, isPushConfigured } from "@/features/notifications/server/web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type WakeResult = "sent" | "unavailable" | "failed";

const payload: PushPayload = {
  title: "Halo камер унтарсан байна",
  body: "Энд дарж камерыг дахин асаана уу.",
  url: "/monitor?resume=1",
  tag: "halo-wake",
  severity: "critical",
};

/**
 * Asks the camera's own browser to reopen /monitor. Someone at home still has to tap the
 * notification: the web cannot restart a closed page by itself.
 */
export async function wakeCamera(deviceId: string): Promise<WakeResult> {
  if (!isPushConfigured()) return "unavailable";
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_device_wake", { p_device_id: deviceId });
  if (error) throw error;
  const target = data?.[0];
  if (!target) return "unavailable";
  const result = await deliverPush(payload, [
    { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
  ]);
  for (const endpoint of result.expired) {
    await admin.rpc("forget_device_push", { p_device_id: deviceId, p_endpoint: endpoint });
  }
  return result.sent > 0 ? "sent" : result.expired.length ? "unavailable" : "failed";
}
