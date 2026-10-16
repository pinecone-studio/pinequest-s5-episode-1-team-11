import "server-only";
import type { PushPayload } from "@/contracts";
import type { NotifyResult } from "./web-push";

const ENDPOINT = "https://exp.host/--/api/v2/push/send";
const BATCH = 100;

type Ticket = { status: "ok" | "error"; details?: { error?: string } };

/**
 * Sends to the mobile app through Expo's push service. `expired` holds tokens Expo reports as
 * DeviceNotRegistered (app removed or token rotated); the caller deletes them.
 */
export async function deliverExpoPush(
  payload: PushPayload,
  eventId: string,
  tokens: readonly string[],
): Promise<NotifyResult> {
  const unique = [...new Set(tokens)];
  let sent = 0;
  const expired: string[] = [];
  for (let start = 0; start < unique.length; start += BATCH) {
    const batch = unique.slice(start, start + BATCH);
    const tickets = await send(
      batch.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        data: { eventId, severity: payload.severity },
        sound: "default",
        priority: payload.severity === "critical" ? "high" : "default",
        channelId: "alerts",
        ttl: 300,
      })),
    );
    tickets.forEach((ticket, index) => {
      if (ticket.status === "ok") sent += 1;
      else if (ticket.details?.error === "DeviceNotRegistered") expired.push(batch[index]);
    });
  }
  return { sent, expired };
}

async function send(messages: object[]): Promise<Ticket[]> {
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => null)) as { data?: Ticket[] } | null;
    return Array.isArray(body?.data) ? body.data : [];
  } catch {
    // Expo unreachable: nothing was sent, the caller keeps the delivery queued.
    return [];
  }
}
