import { PairRequest, PairResponse } from "@/contracts";
import { isDeviceApiConfigured } from "@/lib/device-api/auth";
import { apiError, apiJson, readJson } from "@/lib/device-api/http";
import { clientFingerprint, createDeviceToken, hashToken } from "@/lib/device-api/tokens";
import { createAdminClient } from "@/lib/supabase/admin";

/** A camera exchanges a guardian's six-digit code for a long-lived device token. */
export async function POST(request: Request) {
  if (!isDeviceApiConfigured) return apiError(503, "not_configured");
  const body = await readJson(request, PairRequest);
  if (!body) return apiError(400, "invalid_request");
  const token = createDeviceToken();
  const { data, error } = await createAdminClient().rpc("claim_pairing", {
    p_code: body.code,
    p_kind: body.kind,
    p_token_hash: hashToken(token),
    p_client: clientFingerprint(request),
  });
  if (error) throw error;
  const row = data?.[0];
  if (row?.status === "limited") return apiError(429, "too_many_attempts");
  if (row?.status !== "paired" || !row.device_id) return apiError(404, "invalid_code");
  return apiJson(
    PairResponse.parse({
      deviceId: row.device_id,
      deviceToken: token,
      name: row.name,
      roomName: row.room_name,
    }),
    201,
  );
}
