import "server-only";
import { PushSubscriptionJSON } from "@/contracts";
import { notifyEvent, notifyEventToApps } from "@/features/notifications/server/notify-event";
import { isPushConfigured } from "@/features/notifications/server/web-push";
import { mapEvent } from "@/lib/data/mappers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow } from "@/lib/supabase/database.types";

const none = { sent: 0, expired: [] as string[] };

/**
 * Pushes an event to every member of its household (browsers and the mobile app), prunes
 * subscriptions that expired and marks the queued delivery done. Throwing leaves the delivery
 * queued for the minute job to retry.
 */
export async function notifyHousehold(row: EventRow) {
  const admin = createAdminClient();
  const members = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", row.household_id);
  if (members.error) throw members.error;
  const users = members.data.map((member) => member.user_id);
  const [subscriptions, apps] = await Promise.all([
    admin.from("push_subscriptions").select("*").in("user_id", users),
    admin.from("expo_push_tokens").select("token").in("user_id", users),
  ]);
  if (subscriptions.error) throw subscriptions.error;
  if (apps.error) throw apps.error;
  // Browsers need this deployment's VAPID keys; the mobile app does not.
  const browsers = isPushConfigured() ? subscriptions.data : [];
  const tokens = apps.data.map((app) => app.token);
  if (!browsers.length && !tokens.length) return complete(row.id);
  const event = mapEvent(row);
  const [web, mobile] = await Promise.all([
    browsers.length
      ? notifyEvent(
          event,
          browsers.map((subscription) =>
            PushSubscriptionJSON.parse({
              endpoint: subscription.endpoint,
              expirationTime: subscription.expiration_time,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            }),
          ),
        )
      : none,
    tokens.length ? notifyEventToApps(event, tokens) : none,
  ]);
  if (web.expired.length) {
    const { error } = await admin.from("push_subscriptions").delete().in("endpoint", web.expired);
    if (error) throw error;
  }
  if (mobile.expired.length) {
    const { error } = await admin.from("expo_push_tokens").delete().in("token", mobile.expired);
    if (error) throw error;
  }
  const sent = web.sent + mobile.sent;
  if (sent > 0) {
    const { error } = await admin
      .from("events")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw error;
  }
  // Every push service refused (outage): keep it queued so the minute job retries.
  const expired = web.expired.length + mobile.expired.length;
  if (sent === 0 && expired < browsers.length + tokens.length) return;
  await complete(row.id);
}

async function complete(eventId: string) {
  const { error } = await createAdminClient().rpc("complete_push_delivery", {
    p_event_id: eventId,
  });
  if (error) throw error;
}
