import { PushSubscriptionJSON } from "@/contracts";
import { isPushEndpoint } from "@/features/notifications/subscription";
import { authenticateDevice, isDeviceApiConfigured } from "@/lib/device-api/auth";
import { apiError, readJson } from "@/lib/device-api/http";
import { createAdminClient } from "@/lib/supabase/admin";

/** The camera stores its own push subscription so a closed camera page can be woken up. */
export async function POST(request: Request) {
  if (!isDeviceApiConfigured) return apiError(503, "not_configured");
  const device = await authenticateDevice(request);
  if (!device) return apiError(401, "unauthorized");
  const body = await readJson(request, PushSubscriptionJSON);
  if (!body || !isPushEndpoint(body.endpoint)) return apiError(400, "invalid_request");
  const { error } = await createAdminClient().rpc("save_device_push", {
    p_device_id: device.id,
    p_endpoint: body.endpoint,
    p_p256dh: body.keys.p256dh,
    p_auth: body.keys.auth,
  });
  if (error) throw error;
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
