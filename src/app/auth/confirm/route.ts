import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const client = await createClient();
  let destination = "/login?error=confirmation";
  if (token_hash && (type === "email" || type === "signup") && client) {
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error) destination = safeNext(request.nextUrl.searchParams.get("next"));
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
