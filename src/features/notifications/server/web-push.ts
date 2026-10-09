import "server-only";
import webPush from "web-push";
import type { PushPayload, PushSubscriptionJSON } from "@/contracts";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { isPushEndpoint } from "../subscription";

/** Accepted by the push service; this does not prove the recipient read or saw the alert. */
export type NotifyResult = { sent: number; expired: string[] };

export function isPushConfigured() {
  return Boolean(publicEnv.vapidPublicKey && serverEnv.vapidPrivateKey);
}

export async function deliverPush(
  payload: PushPayload,
  subscriptions: readonly PushSubscriptionJSON[],
): Promise<NotifyResult> {
  const publicKey = publicEnv.vapidPublicKey;
  const privateKey = serverEnv.vapidPrivateKey;
  if (!publicKey || !privateKey) return { sent: 0, expired: [] };
  const unique = new Map(
    subscriptions
      .filter((value) => isPushEndpoint(value.endpoint))
      .map((value) => [value.endpoint, value]),
  );
  const outcomes = await Promise.all(
    [...unique.values()].map(async (subscription) => {
      try {
        await webPush.sendNotification(subscription, JSON.stringify(payload), {
          vapidDetails: { subject: serverEnv.vapidSubject, publicKey, privateKey },
          TTL: 300,
          urgency: payload.severity === "critical" ? "high" : "normal",
          timeout: 10_000,
        });
        return { sent: true, expired: null };
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error ? error.statusCode : null;
        return {
          sent: false,
          expired: statusCode === 404 || statusCode === 410 ? subscription.endpoint : null,
        };
      }
    }),
  );
  return {
    sent: outcomes.filter((outcome) => outcome.sent).length,
    expired: outcomes.flatMap((outcome) => (outcome.expired ? [outcome.expired] : [])),
  };
}
