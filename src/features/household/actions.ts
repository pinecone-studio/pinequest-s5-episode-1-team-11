"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type CreateInviteState = {
  inviteUrl?: string;
  error?: string;
};

export type AcceptInviteState = {
  error?: string;
};

export async function createHouseholdInvite(
  _previous: CreateInviteState,
  _formData: FormData,
): Promise<CreateInviteState> {
  const t = await getTranslations("household");
  const client = await createClient();

  if (!client) return { error: t("inviteUnavailable") };

  await requireUser();

  const { data, error } = await client.rpc("create_invite");
  if (error) {
    if (error.message.includes("Owner access required")) {
      return { error: t("inviteOwnerOnly") };
    }
    if (error.message.includes("Too many active invites")) {
      return { error: t("inviteLimitReached") };
    }
    throw error;
  }

  const invite = data?.[0];
  if (!invite) throw new Error("Invite creation returned no invite.");

  return {
    inviteUrl: new URL(routes.invite(invite.code), publicEnv.siteUrl).toString(),
  };
}

export async function acceptHouseholdInvite(
  _previous: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const t = await getTranslations("household");
  const code = z
    .string()
    .regex(/^[a-f0-9]{32}$/)
    .safeParse(formData.get("code"));

  if (!code.success) return { error: t("inviteInvalid") };

  const client = await createClient();
  if (!client) return { error: t("inviteUnavailable") };

  await requireUser();

  const { error } = await client.rpc("accept_invite", { p_code: code.data });
  if (error) {
    if (error.message.includes("Invite expired or already used")) {
      return { error: t("inviteExpired") };
    }
    if (error.message.includes("Invalid invite")) {
      return { error: t("inviteInvalid") };
    }
    if (error.message.includes("Account already belongs to a household")) {
      return { error: t("inviteAlreadyInHousehold") };
    }
    throw error;
  }

  redirect(routes.home);
}
