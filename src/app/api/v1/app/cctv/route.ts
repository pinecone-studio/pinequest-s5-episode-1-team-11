import { z } from "zod";
import { pairCctv } from "@/features/live/server/stream";
import { apiError, apiJson, readJson } from "@/lib/device-api/http";
import { requestClient } from "@/lib/supabase/request";

const Input = z.object({
  name: z.string().trim().min(1).max(60),
  roomName: z.string().trim().min(1).max(60),
});

/** The app adds a CCTV camera; the answer is what to type into the camera (RTMP server, key). */
export async function POST(request: Request) {
  const input = await readJson(request, Input);
  if (!input) return apiError(400, "invalid_request");
  const client = await requestClient(request);
  if (!client) return apiError(503, "not_configured");
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return apiError(401, "unauthorized");
  const camera = await pairCctv(client, input.name, input.roomName);
  if (camera === "limit") return apiError(429, "rate_limited");
  if (camera === "forbidden") return apiError(403, "forbidden");
  if (camera === "camera") return apiError(502, "camera_server_failed");
  return apiJson(camera);
}
