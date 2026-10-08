import { authenticateDevice, isDeviceApiConfigured } from "@/lib/device-api/auth";
import { apiError } from "@/lib/device-api/http";
import { createAdminClient } from "@/lib/supabase/admin";

/** The camera disconnects itself. Its token is removed with the device; events stay. */
export async function DELETE(request: Request) {
  if (!isDeviceApiConfigured) return apiError(503, "not_configured");
  const device = await authenticateDevice(request);
  if (!device) return apiError(401, "unauthorized");
  const { error } = await createAdminClient().from("devices").delete().eq("id", device.id);
  if (error) throw error;
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
