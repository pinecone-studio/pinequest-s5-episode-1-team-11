"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getHousehold } from "@/lib/data/queries";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { personForm } from "./person-input";

export type PersonState = { error?: string; success?: string };

export async function saveWatchedPerson(
  _previous: PersonState,
  form: FormData,
): Promise<PersonState> {
  const t = await getTranslations("household");
  const input = personForm(form);
  if (!input.success) return { error: t("personInvalid") };
  const client = await createClient();
  if (!client) return { error: t("personDemo") };
  await requireUser();
  const home = await getHousehold();
  if (!home) return { error: t("personUnavailable") };
  const { id, name, kind, age, notes, emergencyPhone } = input.data;
  const values = { name, kind, age, notes, emergency_phone: emergencyPhone };
  const result = id
    ? await client
        .from("watched_people")
        .update(values)
        .eq("id", id)
        .eq("household_id", home.id)
        .select("id")
        .maybeSingle()
    : await client
        .from("watched_people")
        .insert({ ...values, household_id: home.id })
        .select("id")
        .single();
  if (result.error || !result.data) return { error: t("personUnavailable") };
  revalidatePath(routes.people);
  revalidatePath(routes.home);
  return { success: t("personSaved") };
}

export async function removeWatchedPerson(
  _previous: PersonState,
  form: FormData,
): Promise<PersonState> {
  const t = await getTranslations("household");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: t("personInvalid") };
  const client = await createClient();
  if (!client) return { error: t("personDemo") };
  await requireUser();
  const home = await getHousehold();
  if (!home) return { error: t("personUnavailable") };
  const result = await client
    .from("watched_people")
    .delete()
    .eq("id", id.data)
    .eq("household_id", home.id)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data) return { error: t("personUnavailable") };
  revalidatePath(routes.people);
  revalidatePath(routes.home);
  return { success: t("personRemoved") };
}
