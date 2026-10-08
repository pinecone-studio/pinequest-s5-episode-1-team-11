import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const client = await createClient();
  let destination = "/login?error=confirmation";
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) destination = safeNext(request.nextUrl.searchParams.get("next"));
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
