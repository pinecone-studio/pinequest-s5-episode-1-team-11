"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type EventActionState = {
  error?: string;
  status?: "acknowledged" | "false_alarm";
};

export async function respondToEvent(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const t = await getTranslations("events");
  const parsed = z
    .object({
      eventId: z.uuid(),
      response: z.enum(["acknowledged", "false_alarm"]),
      note: z.string().trim().max(300),
    })
    .safeParse({
      eventId: formData.get("eventId"),
      response: formData.get("response"),
      note: formData.get("note") ?? "",
    });
  if (!parsed.success) return { error: t("action.invalid") };

  const client = await createClient();
  if (!client) return { error: t("action.unavailable") };
  const user = await requireUser();
  const membership = await client
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership.error) return { error: t("action.failed") };
  if (!membership.data) return { error: t("action.householdRequired") };

  const { eventId, response, note } = parsed.data;
  const update = client
    .from("events")
    .update({
      status: response,
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString(),
      ...(response === "false_alarm" ? { note: note || null } : {}),
    })
    .eq("id", eventId)
    .eq("household_id", membership.data.household_id);
  // A competing response must not silently replace an acknowledgement.
  const eligible =
    response === "acknowledged"
      ? update.eq("status", "new")
      : update.in("status", ["new", "acknowledged"]);
  const result = await eligible.select("id").maybeSingle();
  if (result.error) return { error: t("action.failed") };
  if (!result.data) return { error: t("action.changed") };

  revalidatePath(routes.events);
  revalidatePath(routes.event(eventId));
  revalidatePath(routes.alert(eventId));
  revalidatePath(routes.home);
  revalidatePath("/", "layout");
  return { status: response };
}
