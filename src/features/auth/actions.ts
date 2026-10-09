"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { safeNext } from "@/lib/auth/redirect";
import { requireUser } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "./state";

const credentials = z.object({ email: z.email().max(254), password: z.string().min(8).max(200) });
const registration = credentials.extend({ name: z.string().trim().min(1).max(60) });

export async function signIn(_previous: AuthState, form: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");
  const input = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!input.success) return { error: t("invalidForm") };
  const client = await createClient();
  if (!client) return { error: t("demoDescription") };
  // A stale login form must not replace another account's active browser session.
  const { data: current } = await client.auth.getUser();
  if (current.user) redirect("/home");
  const { error } = await client.auth.signInWithPassword(input.data);
  if (error) return { error: t("signInError") };
  const next = safeNext(String(form.get("next") ?? "/home"));
  const user = await requireUser();
  const membership = await client
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership.error) return { error: t("genericError") };
  if (!membership.data && !next.startsWith("/invite/"))
    redirect(`/setup-household?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signUp(_previous: AuthState, form: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");
  const input = registration.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!input.success) return { error: t("invalidForm") };
  const client = await createClient();
  if (!client) return { error: t("demoDescription") };
  const { data: current } = await client.auth.getUser();
  if (current.user) redirect("/home");
  const next = safeNext(String(form.get("next") ?? "/home"));
  const { data, error } = await client.auth.signUp({
    email: input.data.email,
    password: input.data.password,
    options: {
      data: { name: input.data.name },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: t("signUpError") };
  if (data.session) {
    if (next.startsWith("/invite/")) redirect(next);
    redirect(`/setup-household?next=${encodeURIComponent(next)}`);
  }
  return { success: t("confirmEmail") };
}

export async function createHousehold(_previous: AuthState, form: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");
  await requireUser();
  const name = z.string().trim().min(1).max(60).safeParse(form.get("name"));
  if (!name.success) return { error: t("invalidName"), fields: { name: t("invalidName") } };
  const client = await createClient();
  if (!client) return { error: t("genericError") };
  const { error } = await client.rpc("create_household", { p_name: name.data });
  if (error) return { error: t("genericError") };
  redirect(safeNext(String(form.get("next") ?? "/home")));
}

export async function signOut() {
  const client = await createClient();
  if (client) {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) {
      const t = await getTranslations("auth");
      return { error: t("genericError") };
    }
  }
  redirect("/login");
}
