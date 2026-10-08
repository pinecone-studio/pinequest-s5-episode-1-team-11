import { z } from "zod";

/** The browser's PushSubscription.toJSON(), stored per user and device. */
export const PushSubscriptionJSON = z.object({
  endpoint: z.url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});
export type PushSubscriptionJSON = z.infer<typeof PushSubscriptionJSON>;

/** What the service worker receives in a push message. */
export const PushPayload = z.object({
  title: z.string(),
  body: z.string(),
  url: z.string(),
  tag: z.string(),
  severity: z.enum(["critical", "warning", "info"]),
});
export type PushPayload = z.infer<typeof PushPayload>;
