import { z } from "zod";
import { PushSubscriptionJSON } from "@/contracts";

/** Push endpoints are supplied by browsers; never let a user turn delivery into arbitrary server requests. */
export function isPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      !url.hash &&
      ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(
        url.hostname,
      )
    );
  } catch {
    return false;
  }
}

export const SubscriptionEndpoint = z.string().max(2048).refine(isPushEndpoint);
export const StoredPushSubscription = PushSubscriptionJSON.extend({
  endpoint: SubscriptionEndpoint,
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}(==)?$/),
  }),
});
