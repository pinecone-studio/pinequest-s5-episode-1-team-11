import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { Invite, Member, Profile, PushSubscriptionJSON } from "@/contracts";
import { getUser, requireUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { getDemoFixtures } from "./demo";
import { mapDevice, mapEvent, mapHousehold, mapWatchedPerson } from "./mappers";

/** No global cache: this context only lives for the current server render/request. */
const getContext = cache(async () => {
  const client = await createClient();
  if (!client) return null;
  const user = await requireUser();
  const { data, error } = await client
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return { client, user, householdId: data?.household_id ?? null };
});

async function getHomeContext() {
  const context = await getContext();
  if (context && !context.householdId) redirect("/setup-household");
  return context ? { ...context, householdId: context.householdId as string } : null;
}

export async function getProfile() {
  const context = await getContext();
  if (!context) return (await getDemoFixtures()).profile;
  const { data, error } = await context.client
    .from("profiles")
    .select("id, name")
    .eq("id", context.user.id)
    .single();
  if (error) throw error;
  return Profile.parse(data);
}

export async function getHousehold() {
  const context = await getContext();
  if (!context) return (await getDemoFixtures()).household;
  if (!context.householdId) return null;
  const { data, error } = await context.client
    .from("households")
    .select("*")
    .eq("id", context.householdId)
    .single();
  if (error) throw error;
  return mapHousehold(data);
}

export async function listMembers() {
  const context = await getHomeContext();
  if (!context) return (await getDemoFixtures()).members;
  const { data, error } = await context.client
    .from("household_members")
    .select("*")
    .eq("household_id", context.householdId as string);
  if (error) throw error;
  const profiles = await context.client
    .from("profiles")
    .select("id, name")
    .in(
      "id",
      data.map((member) => member.user_id),
    );
  if (profiles.error) throw profiles.error;
  return data.map((member) =>
    Member.parse({
      userId: member.user_id,
      role: member.role,
      name: profiles.data.find((profile) => profile.id === member.user_id)?.name ?? "Halo",
      isMe: member.user_id === context.user.id,
    }),
  );
}

export async function listWatchedPeople() {
  const context = await getHomeContext();
  if (!context) return (await getDemoFixtures()).watchedPeople;
  const { data, error } = await context.client
    .from("watched_people")
    .select("*")
    .eq("household_id", context.householdId as string)
    .order("created_at");
  if (error) throw error;
  return data.map(mapWatchedPerson);
}

export async function listDevices() {
  const context = await getHomeContext();
  if (!context) return (await getDemoFixtures()).devices;
  const { data, error } = await context.client
    .from("devices")
    .select("*")
    .eq("household_id", context.householdId as string)
    .order("created_at");
  if (error) throw error;
  return data.map(mapDevice);
}

export async function getDevice(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const context = await getHomeContext();
  if (!context) return (await getDemoFixtures()).devices.find((device) => device.id === id) ?? null;
  const { data, error } = await context.client
    .from("devices")
    .select("*")
    .eq("id", id)
    .eq("household_id", context.householdId as string)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDevice(data) : null;
}

export async function listEvents() {
  const context = await getHomeContext();
  if (!context) return (await getDemoFixtures()).events;
  const { data, error } = await context.client
    .from("events")
    .select("*")
    .eq("household_id", context.householdId as string)
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const ids = [
    ...new Set(data.flatMap((event) => (event.acknowledged_by ? [event.acknowledged_by] : []))),
  ];
  const names = new Map<string, string>();
  if (ids.length) {
    const profiles = await context.client.from("profiles").select("id, name").in("id", ids);
    if (profiles.error) throw profiles.error;
    for (const profile of profiles.data) names.set(profile.id, profile.name);
  }
  return data.map((row) =>
    mapEvent(row, row.acknowledged_by ? (names.get(row.acknowledged_by) ?? null) : null),
  );
}

export async function getEvent(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const context = await getHomeContext();
  if (!context) return (await getDemoFixtures()).events.find((event) => event.id === id) ?? null;
  const { data, error } = await context.client
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("household_id", context.householdId as string)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  let name: string | null = null;
  if (data.acknowledged_by) {
    const result = await context.client
      .from("profiles")
      .select("name")
      .eq("id", data.acknowledged_by)
      .maybeSingle();
    if (result.error) throw result.error;
    name = result.data?.name ?? null;
  }
  let snapshotUrl: string | null = null;
  if (data.snapshot_path) {
    const signed = await context.client.storage
      .from("event-snapshots")
      .createSignedUrl(data.snapshot_path, 60);
    snapshotUrl = signed.data?.signedUrl ?? null;
  }
  return mapEvent(data, name, snapshotUrl);
}

export async function getUnreadCount() {
  const context = await getHomeContext();
  if (!context)
    return (await getDemoFixtures()).events.filter((event) => event.status === "new").length;
  const { count, error } = await context.client
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("household_id", context.householdId as string)
    .eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}

export async function getInvite(code: string) {
  if (!/^[a-f0-9]{32}$/.test(code)) return null;
  const client = await createClient();
  if (!client) return null;
  if (!(await getUser())) redirect(`/login?next=${encodeURIComponent(routes.invite(code))}`);
  const { data, error } = await client.rpc("get_invite", { p_code: code });
  if (error) throw error;
  const row = data?.[0];
  return row
    ? Invite.parse({
        code: row.code,
        householdName: row.household_name,
        invitedBy: row.invited_by,
        expiresAt: row.expires_at,
      })
    : null;
}

/** User-facing settings can only read the current user's subscriptions. */
export async function listOwnPushSubscriptions() {
  const context = await getContext();
  if (!context) return [];
  const { data, error } = await context.client
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", context.user.id);
  if (error) throw error;
  return data.map((row) =>
    PushSubscriptionJSON.parse({
      endpoint: row.endpoint,
      expirationTime: row.expiration_time,
      keys: { p256dh: row.p256dh, auth: row.auth },
    }),
  );
}

export async function getHomeSummary() {
  const [profile, household, devices, events, watchedPeople] = await Promise.all([
    getProfile(),
    getHousehold(),
    listDevices(),
    listEvents(),
    listWatchedPeople(),
  ]);
  return {
    profile,
    household,
    devices,
    events,
    watchedPeople,
    onlineCount: devices.filter((device) => device.status === "online").length,
    unreadCount: events.filter((event) => event.status === "new").length,
    criticalEvent:
      events.find((event) => event.severity === "critical" && event.status === "new") ?? null,
    latestEvent: events[0] ?? null,
  };
}
