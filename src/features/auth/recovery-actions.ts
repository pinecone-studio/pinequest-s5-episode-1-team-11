"use server";

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { safeNext } from "@/lib/auth/redirect";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getRecoveryContext } from "./recovery-session";
import type { AuthState } from "./state";

const emailInput = z.string().trim().toLowerCase().pipe(z.email().max(254));
const passwordInput = z.string().min(8).max(200);
const cooldownCookie = "halo-auth-email-until";

async function sendEmail(kind: "recovery" | "confirmation", form: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");
  const input = emailInput.safeParse(form.get("email"));
  if (!input.success) return { error: t("invalidForm") };
  const client = await createClient();
  if (!client) return { error: t("demoDescription") };
  const store = await cookies();
  const now = Date.now();
  const previous = Number(store.get(cooldownCookie)?.value);
  if (Number.isFinite(previous) && previous > now && previous <= now + 60_000) {
    return { error: t("emailCooldown"), retryAt: previous };
  }
  const retryAt = now + 60_000;
  // This browser courtesy limit supplements Supabase's authoritative per-email/server limits.
  store.set(cooldownCookie, String(retryAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
  const next = safeNext(String(form.get("next") ?? "/home"));
  const redirectTo = new URL("/auth/callback", publicEnv.siteUrl);
  redirectTo.searchParams.set("next", next);
  try {
    const result =
      kind === "recovery"
        ? await client.auth.resetPasswordForEmail(input.data, { redirectTo: redirectTo.toString() })
        : await client.auth.resend({
            type: "signup",
            email: input.data,
            options: { emailRedirectTo: redirectTo.toString() },
          });
    if (result.error) {
      if (result.error.status === 429 || result.error.code?.includes("rate_limit")) {
        return { error: t("emailCooldown"), retryAt };
      }
      // Neither an absent account nor an already confirmed account changes the public response.
      const identityErrors = [
        "user_not_found",
        "email_not_confirmed",
        "email_exists",
        "user_already_exists",
      ];
      if (!identityErrors.includes(result.error.code ?? "")) {
        return { error: t("emailSendFailed"), retryAt };
      }
    }
    return { success: t(kind === "recovery" ? "recoverySent" : "confirmationSent"), retryAt };
  } catch {
    return { error: t("emailSendFailed"), retryAt };
  }
}

export async function sendRecoveryEmail(_previous: AuthState, form: FormData): Promise<AuthState> {
  return sendEmail("recovery", form);
}

export async function resendConfirmation(_previous: AuthState, form: FormData): Promise<AuthState> {
  return sendEmail("confirmation", form);
}

export async function resetPassword(_previous: AuthState, form: FormData): Promise<AuthState> {
  const t = await getTranslations("auth");
  const password = passwordInput.safeParse(form.get("password"));
  if (!password.success) return { error: t("passwordWeak") };
  if (password.data !== form.get("confirmPassword")) return { error: t("passwordMismatch") };
  const context = await getRecoveryContext();
  if (!context) return { error: t("recoveryExpired") };
  try {
    const { data, error } = await context.client.auth.updateUser({ password: password.data });
    if (error) {
      return {
        error: t(
          error.code === "weak_password"
            ? "passwordWeak"
            : error.code === "same_password"
              ? "passwordSame"
              : "passwordUpdateFailed",
        ),
      };
    }
    if (!data.user || data.user.id !== context.userId) return { error: t("passwordUpdateFailed") };
    return { success: t("passwordUpdated") };
  } catch {
    return { error: t("passwordUpdateFailed") };
  }
}
