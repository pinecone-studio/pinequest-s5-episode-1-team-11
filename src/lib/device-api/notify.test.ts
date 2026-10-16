import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRow } from "@/lib/supabase/database.types";

const mocks = vi.hoisted(() => ({
  notifyEvent: vi.fn(),
  notifyEventToApps: vi.fn(),
  tokens: [] as string[],
  removedTokens: vi.fn(),
  isPushConfigured: vi.fn(),
  rpc: vi.fn(),
  removed: vi.fn(),
  marked: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/notifications/server/notify-event", () => ({
  notifyEvent: mocks.notifyEvent,
  notifyEventToApps: mocks.notifyEventToApps,
}));
vi.mock("@/features/notifications/server/web-push", () => ({
  isPushConfigured: mocks.isPushConfigured,
}));

const endpoints = [
  "https://fcm.googleapis.com/fcm/send/a",
  "https://fcm.googleapis.com/fcm/send/b",
];
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: mocks.rpc,
    from: (table: string) => {
      if (table === "household_members")
        return { select: () => ({ eq: async () => ({ data: [{ user_id: "u1" }], error: null }) }) };
      if (table === "push_subscriptions")
        return {
          select: () => ({
            in: async () => ({
              data: endpoints.map((endpoint) => ({
                endpoint,
                expiration_time: null,
                p256dh: "B".repeat(87),
                auth: "a".repeat(22),
              })),
              error: null,
            }),
          }),
          delete: () => ({ in: mocks.removed }),
        };
      if (table === "expo_push_tokens")
        return {
          select: () => ({
            in: async () => ({ data: mocks.tokens.map((token) => ({ token })), error: null }),
          }),
          delete: () => ({ in: mocks.removedTokens }),
        };
      return { update: () => ({ eq: mocks.marked }) };
    },
  }),
}));

import { notifyHousehold } from "./notify";

const row: EventRow = {
  id: "00000000-0000-4000-8000-0000000000e1",
  household_id: "00000000-0000-4000-8000-000000000001",
  device_id: "00000000-0000-4000-8000-0000000000d1",
  idempotency_key: "k1",
  kind: "fall",
  severity: "critical",
  status: "new",
  confidence: 0.9,
  person_name: null,
  room_name: "Hall",
  occurred_at: "2026-10-08T12:00:00.000Z",
  notified_at: null,
  snapshot_path: null,
  acknowledged_by: null,
  acknowledged_at: null,
  note: null,
  created_at: "2026-10-08T12:00:00.000Z",
};
const completed = () =>
  mocks.rpc.mock.calls.filter(([name]) => name === "complete_push_delivery").length;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.isPushConfigured.mockReturnValue(true);
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.removed.mockResolvedValue({ error: null });
  mocks.marked.mockResolvedValue({ error: null });
  mocks.removedTokens.mockResolvedValue({ error: null });
  mocks.tokens = [];
});

describe("notifyHousehold delivery queue", () => {
  it("marks the event notified and the delivery done when a push went out", async () => {
    mocks.notifyEvent.mockResolvedValue({ sent: 1, expired: [] });
    await notifyHousehold(row);
    expect(mocks.marked).toHaveBeenCalledOnce();
    expect(completed()).toBe(1);
  });

  it("keeps the delivery queued for the minute job when every push service failed", async () => {
    mocks.notifyEvent.mockResolvedValue({ sent: 0, expired: [] });
    await notifyHousehold(row);
    expect(mocks.marked).not.toHaveBeenCalled();
    expect(completed()).toBe(0);
  });

  it("prunes expired subscriptions and finishes when none is left to retry", async () => {
    mocks.notifyEvent.mockResolvedValue({ sent: 0, expired: endpoints });
    await notifyHousehold(row);
    expect(mocks.removed).toHaveBeenCalledWith("endpoint", endpoints);
    expect(completed()).toBe(1);
  });

  it("finishes without sending when push is not configured and no phone app is registered", async () => {
    mocks.isPushConfigured.mockReturnValue(false);
    await notifyHousehold(row);
    expect(mocks.notifyEvent).not.toHaveBeenCalled();
    expect(completed()).toBe(1);
  });

  it("still reaches the mobile app when browser push is not configured", async () => {
    mocks.isPushConfigured.mockReturnValue(false);
    mocks.tokens = ["ExponentPushToken[a]"];
    mocks.notifyEventToApps.mockResolvedValue({ sent: 1, expired: [] });
    await notifyHousehold(row);
    expect(mocks.notifyEvent).not.toHaveBeenCalled();
    expect(mocks.notifyEventToApps).toHaveBeenCalledWith(expect.anything(), [
      "ExponentPushToken[a]",
    ]);
    expect(mocks.marked).toHaveBeenCalledOnce();
    expect(completed()).toBe(1);
  });

  it("prunes uninstalled apps and keeps retrying while a browser may still receive it", async () => {
    mocks.tokens = ["ExponentPushToken[gone]"];
    mocks.notifyEvent.mockResolvedValue({ sent: 0, expired: [] });
    mocks.notifyEventToApps.mockResolvedValue({ sent: 0, expired: ["ExponentPushToken[gone]"] });
    await notifyHousehold(row);
    expect(mocks.removedTokens).toHaveBeenCalledWith("token", ["ExponentPushToken[gone]"]);
    expect(completed()).toBe(0);
  });
});
