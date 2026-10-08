import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, readBearer } from "./tokens";

/** Device routes need the server key; without it they answer 503 instead of failing later. */
export const isDeviceApiConfigured = isSupabaseConfigured && Boolean(serverEnv.supabaseSecretKey);

/** Returns the calling device and records the request as a heartbeat, or null for a bad token. */
export async function authenticateDevice(request: Request) {
  const token = readBearer(request);
  if (!token) return null;
  const { data, error } = await createAdminClient().rpc("authenticate_device", {
    p_token_hash: hashToken(token),
  });
  if (error) throw error;
  return data?.[0] ?? null;
}
