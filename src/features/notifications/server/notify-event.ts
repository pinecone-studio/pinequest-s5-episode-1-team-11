import "server-only";
import type { Event, PushSubscriptionJSON } from "@/contracts";
import { eventPayload } from "./payload";
import { deliverPush, type NotifyResult } from "./web-push";

/**
 * sent: how many devices accepted the push.
 * expired: endpoints the push service rejected with 404/410; the caller deletes them.
 */
export type { NotifyResult } from "./web-push";

export async function notifyEvent(
  event: Event,
  subscriptions: readonly PushSubscriptionJSON[],
): Promise<NotifyResult> {
  return deliverPush(eventPayload(event), subscriptions);
}
