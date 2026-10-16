import { z } from "zod";
import { provisionCamera } from "@/features/live/server/stream";
import { apiError, apiJson, readJson } from "@/lib/device-api/http";
import { requestClient } from "@/lib/supabase/request";

const Input = z.object({
  name: z.string().trim().min(1).max(60),
  roomName: z.string().trim().min(1).max(60),
});

/**
 * The family owner adds a CCTV camera: a pairing code made under their own RLS, claimed by the
 * camera server, which answers with what to type into the camera (RTMP server and stream key).
 */
export async function POST(request: Request) {
  const input = await readJson(request, Input);
  if (!input) return apiError(400, "invalid_request");
  const client = await requestClient(request);
  if (!client) return apiError(503, "not_configured");
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return apiError(401, "unauthorized");
  const { data, error } = await client.rpc("create_pairing", {
    p_name: input.name,
    p_room_name: input.roomName,
    p_kind: "ip_camera",
  });
  if (error) {
    if (error.message.includes("Too many active pairing codes"))
      return apiError(429, "rate_limited");
    return apiError(403, "forbidden");
  }
  const code = data?.[0]?.code;
  if (!code) return apiError(403, "forbidden");
  // An unclaimed code simply expires, so a failure here leaves nothing behind.
  const camera = await provisionCamera(code);
  return camera ? apiJson(camera) : apiError(502, "camera_server_failed");
}
