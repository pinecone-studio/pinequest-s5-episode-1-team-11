import { OFFLINE_AFTER_MS } from "@/contracts";
import { authenticateDevice, isDeviceApiConfigured } from "@/lib/device-api/auth";
import { apiError } from "@/lib/device-api/http";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The camera page is closing or hidden. Back-date its last heartbeat so the family sees it as
 * offline at once, and the minute job sends the usual offline notice right away.
 */
export async function POST(request: Request) {
  if (!isDeviceApiConfigured) return apiError(503, "not_configured");
  const device = await authenticateDevice(request);
  if (!device) return apiError(401, "unauthorized");
  const silentSince = new Date(Date.now() - OFFLINE_AFTER_MS - 5_000).toISOString();
  const { error } = await createAdminClient()
    .from("devices")
    .update({ last_seen_at: silentSince })
    .eq("id", device.id);
  if (error) throw error;
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
