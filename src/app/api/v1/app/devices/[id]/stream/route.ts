import { z } from "zod";
import { liveChannelsFor } from "@/features/live/server/channel";
import { cameraStream } from "@/features/live/server/stream";
import { apiError, apiJson } from "@/lib/device-api/http";
import { requestClient } from "@/lib/supabase/request";

/**
 * A family member asks to watch one of their cameras: a CCTV camera gets a short-lived WHEP token,
 * a phone or laptop camera the broadcast channel it listens on (the same one the web uses).
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/v1/app/devices/[id]/stream">,
) {
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) return apiError(400, "invalid_request");
  const client = await requestClient(request);
  if (!client) return apiError(503, "not_configured");
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return apiError(401, "unauthorized");
  const { data: device } = await client
    .from("devices")
    .select("id, kind")
    .eq("id", id.data)
    .maybeSingle();
  if (!device) return apiError(404, "invalid_request");
  if (device.kind !== "ip_camera") {
    const channel = liveChannelsFor(device.id)?.[0];
    return channel ? apiJson({ channel }) : apiError(503, "not_configured");
  }
  const stream = cameraStream(device.id);
  return stream ? apiJson(stream) : apiError(503, "not_configured");
}
