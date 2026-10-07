import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "./database.types";

/** Only device ingestion and development tools use this. Never use it for user queries. */
export function createAdminClient() {
  if (!publicEnv.supabaseUrl || !serverEnv.supabaseSecretKey) {
    throw new Error("Supabase server credentials are not configured");
  }
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
