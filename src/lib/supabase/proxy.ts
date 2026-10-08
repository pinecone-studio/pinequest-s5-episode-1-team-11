import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

const protectedPaths = ["/home", "/events", "/devices", "/settings", "/setup-household"];

export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabasePublishableKey } = publicEnv;
  let response = NextResponse.next({ request });
  if (!supabaseUrl || !supabasePublishableKey) return response;
  const client = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });
  const { data, error } = await client.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  const path = request.nextUrl.pathname;
  if (
    (error || !data?.claims) &&
    protectedPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", safeNext(path + request.nextUrl.search));
    const login = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) login.cookies.set(cookie);
    for (const key of ["Cache-Control", "Expires", "Pragma"]) {
      const value = response.headers.get(key);
      if (value) login.headers.set(key, value);
    }
    return login;
  }
  return response;
}
