import "server-only";
import { PushSubscriptionJSON } from "@/contracts";
import { notifyEvent } from "@/features/notifications/server/notify-event";
import { isPushConfigured } from "@/features/notifications/server/web-push";
import { mapEvent } from "@/lib/data/mappers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow } from "@/lib/supabase/database.types";

/**
 * Pushes an event to every member of its household, prunes subscriptions that expired and marks
 * the queued delivery done. Throwing leaves the delivery queued for the minute job to retry.
 */
export async function notifyHousehold(row: EventRow) {
  const admin = createAdminClient();
  const members = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", row.household_id);
  if (members.error) throw members.error;
  const subscriptions = await admin
    .from("push_subscriptions")
    .select("*")
    .in(
      "user_id",
      members.data.map((member) => member.user_id),
    );
  if (subscriptions.error) throw subscriptions.error;
  // Nothing can be delivered: no subscribers, or no VAPID keys on this deployment.
  if (!subscriptions.data.length || !isPushConfigured()) return complete(row.id);
  const result = await notifyEvent(
    mapEvent(row),
    subscriptions.data.map((subscription) =>
      PushSubscriptionJSON.parse({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expiration_time,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }),
    ),
  );
  if (result.expired.length) {
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", result.expired);
    if (error) throw error;
  }
  if (result.sent > 0) {
    const { error } = await admin
      .from("events")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw error;
  }
  // Every push service refused (outage): keep it queued so the minute job retries.
  if (result.sent === 0 && result.expired.length < subscriptions.data.length) return;
  await complete(row.id);
}

async function complete(eventId: string) {
  const { error } = await createAdminClient().rpc("complete_push_delivery", {
    p_event_id: eventId,
  });
  if (error) throw error;
}
