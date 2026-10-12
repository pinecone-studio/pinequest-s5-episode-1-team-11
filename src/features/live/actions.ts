"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { liveChannelsFor } from "./server/channel";

export type LiveAccess =
  | { ok: true; channel: string }
  | { ok: false; error: "invalid" | "unavailable" | "notFound" };

/** A family member asks to watch one of their cameras. RLS proves the camera is theirs. */
export async function openLiveView(deviceId: unknown): Promise<LiveAccess> {
  const parsed = z.uuid().safeParse(deviceId);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const client = await createClient();
  if (!client) return { ok: false, error: "unavailable" };
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return { ok: false, error: "notFound" };
  const { data, error } = await client
    .from("devices")
    .select("id")
    .eq("id", parsed.data)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "notFound" };
  const channel = liveChannelsFor(data.id)?.[0];
  return channel ? { ok: true, channel } : { ok: false, error: "unavailable" };
}
