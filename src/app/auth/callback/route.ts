import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const client = await createClient();
  let destination = "/login?error=confirmation";
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = safeNext(request.nextUrl.searchParams.get("next"));
      // A password-recovery link signs the user in; send them to choose a new password first.
      const { data } = await client.auth.getClaims();
      const amr = (data?.claims?.amr ?? []) as { method?: string }[];
      destination = amr.some((entry) => entry.method === "recovery")
        ? `/reset-password?next=${encodeURIComponent(next)}`
        : next;
    }
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
