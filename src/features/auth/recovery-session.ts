import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const claimsSchema = z.object({
  sub: z.uuid(),
  session_id: z.uuid(),
  role: z.literal("authenticated"),
  amr: z.array(z.object({ method: z.string(), timestamp: z.number().int() })),
});

/** Password reset requires Auth-verified recovery credentials, not a query parameter. */
export async function getRecoveryContext() {
  try {
    const client = await createClient();
    if (!client) return null;
    const { data: identity, error: identityError } = await client.auth.getUser();
    if (identityError || !identity.user) return null;
    // getClaims verifies the JWT signature/expiry; getUser also checks current Auth validity.
    const { data, error } = await client.auth.getClaims();
    if (error) return null;
    const parsed = claimsSchema.safeParse(data?.claims);
    if (!parsed.success || parsed.data.sub !== identity.user.id) return null;
    const now = Math.floor(Date.now() / 1000);
    const recentRecovery = parsed.data.amr.some(
      (entry) =>
        entry.method === "recovery" &&
        entry.timestamp >= now - 15 * 60 &&
        entry.timestamp <= now + 30,
    );
    return recentRecovery ? { client, userId: identity.user.id } : null;
  } catch {
    return null;
  }
}
