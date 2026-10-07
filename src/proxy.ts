import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/home/:path*",
    "/events/:path*",
    "/devices/:path*",
    "/settings/:path*",
    "/setup-household",
    "/login",
    "/signup",
    "/invite/:path*",
    "/auth/:path*",
    "/dev/:path*",
  ],
};
