"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_COOKIE, demoStates } from "@/lib/data/demo";
import { getDevice, getHousehold } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function requireDevelopment() {
  if (process.env.NODE_ENV !== "development") notFound();
}

export async function setDemoScenario(form: FormData) {
  requireDevelopment();
  if (isSupabaseConfigured) redirect("/dev");
  const scenario = z.enum(demoStates).parse(form.get("scenario"));
  (await cookies()).set(DEMO_COOKIE, scenario, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86_400,
  });
  redirect("/dev");
}

/** Only the signed-in user's household, only from a development server. */
export async function createTestEvent() {
  requireDevelopment();
  if (!isSupabaseConfigured) redirect("/dev");
  const household = await getHousehold();
  if (!household) redirect("/setup-household");
  const { error } = await createAdminClient().from("events").insert({
    household_id: household.id,
    kind: "test",
    severity: "critical",
    room_name: "Development",
    note: "Development test event; no camera detection or push delivery",
  });
  if (error) throw error;
  redirect("/dev?result=created");
}

export async function setDeviceOffline(form: FormData) {
  requireDevelopment();
  if (!isSupabaseConfigured) redirect("/dev");
  const id = z.uuid().parse(form.get("deviceId"));
  const device = await getDevice(id);
  if (!device) notFound();
  const { error } = await createAdminClient()
    .from("devices")
    .update({ status: "offline" })
    .eq("id", device.id)
    .eq("household_id", device.householdId);
  if (error) throw error;
  redirect("/dev?result=offline");
}

/** Same RPC the guardian's "Add camera" screen uses; lets /monitor be tested before that screen exists. */
export async function createPairingCode() {
  requireDevelopment();
  const client = await createClient();
  if (!client) redirect("/dev");
  const { data, error } = await client.rpc("create_pairing", {
    p_name: "Dev camera",
    p_room_name: "Development",
  });
  if (error) throw error;
  redirect(`/dev?pairing=${data[0].code}`);
}
