import "server-only";
import { PushSubscriptionJSON } from "@/contracts";
import { notifyEvent } from "@/features/notifications/server/notify-event";
import { mapEvent } from "@/lib/data/mappers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow } from "@/lib/supabase/database.types";

/** Pushes an event to every member of its household and prunes subscriptions that expired. */
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
  if (!subscriptions.data.length) return;
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
}
