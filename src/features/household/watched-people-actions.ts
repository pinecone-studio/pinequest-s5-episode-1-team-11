"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { WatchedKind } from "@/contracts";
import { getHousehold } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type SaveWatchedPersonState = {
  saved?: boolean;
  error?: string;
  fields?: {
    name?: string;
  };
};

const watchedPersonInput = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name: z.string().trim().min(1).max(60),
  kind: WatchedKind,
  age: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(130)])
    .transform((value) => (value === "" ? null : value)),
  notes: z.string().trim().max(300),
  emergencyPhone: z.string().trim().max(30),
});

export async function saveWatchedPerson(
  _previous: SaveWatchedPersonState,
  formData: FormData,
): Promise<SaveWatchedPersonState> {
  const t = await getTranslations("household");

  if (!isSupabaseConfigured) return { error: t("demoSaveUnavailable") };

  const rawName = formData.get("name");
  if (typeof rawName !== "string" || !rawName.trim()) {
    return { fields: { name: t("nameRequired") } };
  }

  const parsed = watchedPersonInput.safeParse({
    id: formData.get("id") ?? "",
    name: rawName,
    kind: formData.get("kind"),
    age: formData.get("age") ?? "",
    notes: formData.get("notes") ?? "",
    emergencyPhone: formData.get("emergencyPhone") ?? "",
  });

  if (!parsed.success) return { error: t("invalidPerson") };

  const client = await createClient();
  if (!client) return { error: t("demoSaveUnavailable") };

  const household = await getHousehold();
  if (!household) return { error: t("householdRequired") };

  const { id, ...input } = parsed.data;
  const values = {
    name: input.name,
    kind: input.kind,
    age: input.age,
    notes: input.notes || null,
    emergency_phone: input.emergencyPhone || null,
  };

  if (id) {
    const { data, error } = await client
      .from("watched_people")
      .update(values)
      .eq("id", id)
      .eq("household_id", household.id)
      .select("id")
      .maybeSingle();

    if (error) return { error: t("saveFailed") };
    if (!data) return { error: t("personNotFound") };
  } else {
    const { error } = await client.from("watched_people").insert({
      household_id: household.id,
      ...values,
    });

    if (error) return { error: t("saveFailed") };
  }

  revalidatePath(routes.people);
  return { saved: true };
}
