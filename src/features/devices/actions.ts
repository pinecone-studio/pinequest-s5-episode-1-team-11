"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { z } from "zod";
import { PairingCode, PairingCodeValue } from "@/contracts";
import { publicEnv } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import {
  type DeviceActionResult,
  EditDeviceInput,
  NewDeviceInput,
  type PairingDetails,
  type PairingStatus,
  pairingStatus,
} from "./state";

async function context() {
  const client = await createClient();
  if (!client) return { ok: false, error: "unavailable" } as const;
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return { ok: false, error: "unauthorized" } as const;
  const { data, error } = await client
    .from("household_members")
    .select("household_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) return { ok: false, error: "failed" } as const;
  if (!data) return { ok: false, error: "unauthorized" } as const;
  return { ok: true, client, householdId: data.household_id } as const;
}

/** Publishable user client + household filters + existing RLS for every operation. */
export async function createDevicePairing(
  input: unknown,
): Promise<DeviceActionResult<PairingDetails>> {
  const parsed = NewDeviceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const access = await context();
  if (!access.ok) return access;
  const { data, error } = await access.client.rpc("create_pairing", {
    p_name: parsed.data.name,
    p_room_name: parsed.data.roomName,
    p_kind: parsed.data.kind,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes("Too many active pairing codes") ? "limit" : "failed",
    };
  }
  const row = data?.[0];
  const pairing = PairingCode.safeParse(
    row && {
      code: row.code,
      expiresAt: row.expires_at,
      deviceId: row.device_id,
    },
  );
  if (!pairing.success) return { ok: false, error: "failed" };
  const url = new URL(routes.monitor, publicEnv.siteUrl);
  url.searchParams.set("code", pairing.data.code);
  const svg = await QRCode.toString(url.toString(), {
    type: "svg",
    width: 240,
    margin: 2,
    color: { dark: "#173B2F", light: "#FFFFFF" },
  });
  return {
    ok: true,
    data: {
      ...pairing.data,
      monitorUrl: url.toString(),
      qrDataUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    },
  };
}

export async function getPairingStatus(code: unknown): Promise<DeviceActionResult<PairingStatus>> {
  const parsed = PairingCodeValue.safeParse(code);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const access = await context();
  if (!access.ok) return access;
  const { data, error } = await access.client
    .from("pairing_codes")
    .select("code, expires_at, device_id")
    .eq("code", parsed.data)
    .eq("household_id", access.householdId)
    .maybeSingle();
  if (error) return { ok: false, error: "failed" };
  if (!data) return { ok: false, error: "notFound" };
  const pairing = PairingCode.safeParse({
    code: data.code,
    expiresAt: data.expires_at,
    deviceId: data.device_id,
  });
  if (!pairing.success) return { ok: false, error: "failed" };
  return { ok: true, data: pairingStatus(pairing.data, Date.now()) };
}

export async function updateDevice(input: unknown): Promise<DeviceActionResult> {
  const parsed = EditDeviceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const access = await context();
  if (!access.ok) return access;
  const { id, name, roomName, settings, expected } = parsed.data;
  const { data, error } = await access.client
    .from("devices")
    .update({ name, room_name: roomName, settings })
    .eq("id", id)
    .eq("household_id", access.householdId)
    .eq("name", expected.name)
    .eq("room_name", expected.roomName)
    .filter("settings", "eq", JSON.stringify(expected.settings))
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "failed" };
  if (!data) {
    const current = await access.client
      .from("devices")
      .select("id")
      .eq("id", id)
      .eq("household_id", access.householdId)
      .maybeSingle();
    if (current.error) return { ok: false, error: "failed" };
    return { ok: false, error: current.data ? "conflict" : "notFound" };
  }
  revalidatePath(routes.devices);
  revalidatePath(routes.device(id));
  revalidatePath(routes.home);
  return { ok: true, data: undefined };
}

export async function deleteDevice(id: unknown): Promise<DeviceActionResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const access = await context();
  if (!access.ok) return access;
  // The checked-in FK cascades to private.device_tokens, revoking this camera's token.
  const { data, error } = await access.client
    .from("devices")
    .delete()
    .eq("id", parsed.data)
    .eq("household_id", access.householdId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "failed" };
  if (!data) return { ok: false, error: "notFound" };
  revalidatePath(routes.devices);
  revalidatePath(routes.device(parsed.data));
  revalidatePath(routes.home);
  return { ok: true, data: undefined };
}
