"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { deliverPush, isPushConfigured } from "./server/web-push";
import type { NotificationActionResult } from "./state";
import { StoredPushSubscription, SubscriptionEndpoint } from "./subscription";

async function authenticatedClient() {
  const client = await createClient();
  if (!client) return { ok: false, error: "demo" } as const;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { ok: false, error: "login" } as const;
  return { ok: true, client, userId: data.user.id } as const;
}

export async function savePushSubscription(input: unknown): Promise<NotificationActionResult> {
  const context = await authenticatedClient();
  if (!context.ok) return context;
  if (!isPushConfigured()) return { ok: false, error: "unconfigured" };
  const parsed = StoredPushSubscription.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const subscription = parsed.data;
  const { error } = await context.client.from("push_subscriptions").upsert(
    {
      user_id: context.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expiration_time: subscription.expirationTime ?? null,
    },
    { onConflict: "endpoint" },
  );
  return error ? { ok: false, error: "saveFailed" } : { ok: true, data: undefined };
}

export async function getPushSubscriptionState(
  input: unknown,
): Promise<NotificationActionResult<{ saved: boolean }>> {
  const context = await authenticatedClient();
  if (!context.ok) return context;
  const parsed = SubscriptionEndpoint.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { data, error } = await context.client
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", context.userId)
    .eq("endpoint", parsed.data)
    .maybeSingle();
  if (error) return { ok: false, error: "stateFailed" };
  return { ok: true, data: { saved: Boolean(data) } };
}

export async function removePushSubscription(input: unknown): Promise<NotificationActionResult> {
  const context = await authenticatedClient();
  if (!context.ok) return context;
  const parsed = SubscriptionEndpoint.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await context.client
    .from("push_subscriptions")
    .delete()
    .eq("user_id", context.userId)
    .eq("endpoint", parsed.data);
  return error ? { ok: false, error: "removeFailed" } : { ok: true, data: undefined };
}

/** Send only to this browser's endpoint, after confirming it belongs to the signed-in user. */
export async function sendTestNotification(input: unknown): Promise<NotificationActionResult> {
  const context = await authenticatedClient();
  if (!context.ok) return context;
  if (!isPushConfigured()) return { ok: false, error: "unconfigured" };
  const parsed = SubscriptionEndpoint.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { data, error } = await context.client
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", context.userId)
    .eq("endpoint", parsed.data)
    .maybeSingle();
  if (error) return { ok: false, error: "stateFailed" };
  if (!data) return { ok: false, error: "noSubscription" };
  const subscription = StoredPushSubscription.safeParse({
    endpoint: data.endpoint,
    keys: { p256dh: data.p256dh, auth: data.auth },
    expirationTime: data.expiration_time,
  });
  if (!subscription.success) return { ok: false, error: "invalid" };
  const t = await getTranslations("notifications");
  const result = await deliverPush(
    {
      title: t("testTitle"),
      body: t("testBody"),
      url: "/settings",
      tag: "halo-notification-test",
      severity: "info",
    },
    [subscription.data],
  );
  if (result.expired.length) {
    const { error: removeError } = await context.client
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.userId)
      .in("endpoint", result.expired);
    if (removeError) return { ok: false, error: "removeFailed" };
    return { ok: false, error: "noSubscription" };
  }
  return result.sent > 0 ? { ok: true, data: undefined } : { ok: false, error: "sendFailed" };
}
