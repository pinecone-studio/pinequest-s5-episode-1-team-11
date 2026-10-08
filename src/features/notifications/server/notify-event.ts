import "server-only";
import type { Event, PushSubscriptionJSON } from "@/contracts";

/**
 * sent: how many devices accepted the push.
 * expired: endpoints the push service rejected with 404/410; the caller deletes them.
 */
export type NotifyResult = { sent: number; expired: string[] };

/** Integration stub. The notification feature owner implements delivery with web-push. */
export async function notifyEvent(
  _event: Event,
  _subscriptions: readonly PushSubscriptionJSON[],
): Promise<NotifyResult> {
  return { sent: 0, expired: [] };
}
