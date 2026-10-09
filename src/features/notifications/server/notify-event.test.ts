import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event, PushSubscriptionJSON } from "@/contracts";

const { sendNotification, config } = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  config: { publicKey: "public-key", privateKey: "private-key" },
}));
vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({ default: { sendNotification } }));
vi.mock("@/lib/env", () => ({
  publicEnv: {
    get vapidPublicKey() {
      return config.publicKey;
    },
  },
}));
vi.mock("@/lib/env.server", () => ({
  serverEnv: {
    get vapidPrivateKey() {
      return config.privateKey;
    },
    vapidSubject: "mailto:halo@example.com",
  },
}));

import { notifyEvent } from "./notify-event";

const event: Event = {
  id: "00000000-0000-4000-8000-000000000001",
  householdId: "00000000-0000-4000-8000-000000000002",
  deviceId: null,
  kind: "fall",
  severity: "critical",
  status: "new",
  confidence: 0.9,
  personName: null,
  roomName: "Living room",
  occurredAt: "2026-10-09T00:00:00Z",
  notifiedAt: null,
  snapshotUrl: "https://private.example/signed.jpg",
  acknowledgedBy: null,
  acknowledgedAt: null,
  note: null,
};
const subscription = (id: string): PushSubscriptionJSON => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
  keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
});

beforeEach(() => {
  sendNotification.mockReset().mockResolvedValue({ statusCode: 201 });
  config.publicKey = "public-key";
  config.privateKey = "private-key";
});

describe("event web push delivery", () => {
  it("sends one encrypted push per endpoint with urgent event deep link and no private snapshot", async () => {
    expect(
      await notifyEvent(event, [subscription("a"), subscription("a"), subscription("b")]),
    ).toEqual({ sent: 2, expired: [] });
    expect(sendNotification).toHaveBeenCalledTimes(2);
    const [target, rawPayload, options] = sendNotification.mock.calls[0];
    expect(target.endpoint).toBe(subscription("a").endpoint);
    expect(JSON.parse(rawPayload)).toMatchObject({
      url: `/events/${event.id}/alert`,
      tag: event.id,
      severity: "critical",
    });
    expect(rawPayload).not.toContain("signed.jpg");
    expect(options).toMatchObject({
      TTL: 300,
      urgency: "high",
      timeout: 10000,
      vapidDetails: { publicKey: "public-key", privateKey: "private-key" },
    });
  });

  it("prunes only 404/410 endpoints and still sends to other recipients on failures", async () => {
    sendNotification
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValueOnce({ statusCode: 201 });
    expect(
      await notifyEvent(event, [
        subscription("a"),
        subscription("b"),
        subscription("c"),
        subscription("d"),
      ]),
    ).toEqual({ sent: 1, expired: [subscription("a").endpoint, subscription("b").endpoint] });
  });

  it("does not attempt delivery when VAPID is unavailable", async () => {
    config.privateKey = "";
    expect(await notifyEvent(event, [subscription("a")])).toEqual({ sent: 0, expired: [] });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("does not make requests to caller supplied internal or arbitrary endpoints", async () => {
    await notifyEvent(event, [
      { ...subscription("a"), endpoint: "https://127.0.0.1/private" },
      { ...subscription("b"), endpoint: "https://attacker.example/" },
    ]);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
