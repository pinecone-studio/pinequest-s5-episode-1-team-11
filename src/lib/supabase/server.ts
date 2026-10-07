import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Request-scoped client. User queries always use the publishable key and RLS. */
export async function createClient() {
  const { supabaseUrl, supabasePublishableKey } = publicEnv;
  if (!supabaseUrl || !supabasePublishableKey) return null;
  const store = await cookies();
  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values) store.set(name, value, options);
        } catch {
          // Server Components cannot write cookies; proxy.ts persists refreshes before rendering.
        }
      },
    },
  });
}
