import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  deleteRows: vi.fn(),
  inRows: vi.fn(),
  deliverPush: vi.fn(),
  isPushConfigured: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("./server/web-push", () => ({
  deliverPush: mocks.deliverPush,
  isPushConfigured: mocks.isPushConfigured,
}));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));

import {
  getPushSubscriptionState,
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "./actions";

const endpoint = "https://fcm.googleapis.com/fcm/send/browser";
const subscription = { endpoint, keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } };
const builder = {
  upsert: mocks.upsert,
  select: mocks.select,
  eq: mocks.eq,
  maybeSingle: mocks.maybeSingle,
  delete: mocks.deleteRows,
  in: mocks.inRows,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: mocks.from });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "current-user" } }, error: null });
  mocks.from.mockReturnValue(builder);
  mocks.select.mockReturnValue(builder);
  mocks.eq.mockReturnValue(builder);
  mocks.deleteRows.mockReturnValue(builder);
  mocks.inRows.mockResolvedValue({ error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({
    data: {
      endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expiration_time: null,
    },
    error: null,
  });
  mocks.isPushConfigured.mockReturnValue(true);
  mocks.deliverPush.mockResolvedValue({ sent: 1, expired: [] });
});

describe("authenticated notification actions", () => {
  it("derives subscription ownership from verified identity, ignoring supplied user id", async () => {
    expect(await savePushSubscription({ ...subscription, user_id: "victim" })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(mocks.upsert).toHaveBeenCalledWith(
      {
        user_id: "current-user",
        endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expiration_time: null,
      },
      { onConflict: "endpoint" },
    );
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it("rejects unauthenticated changes and demo mode without writing anything", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await savePushSubscription(subscription)).toEqual({ ok: false, error: "login" });
    mocks.createClient.mockResolvedValue(null);
    expect(await removePushSubscription(endpoint)).toEqual({ ok: false, error: "demo" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects arbitrary endpoints and malformed encryption keys", async () => {
    expect(
      await savePushSubscription({ ...subscription, endpoint: "https://localhost/private" }),
    ).toEqual({ ok: false, error: "invalid" });
    expect(
      await savePushSubscription({ ...subscription, keys: { p256dh: "x", auth: "y" } }),
    ).toEqual({ ok: false, error: "invalid" });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("reports missing delivery configuration and persistence failures", async () => {
    mocks.isPushConfigured.mockReturnValue(false);
    expect(await savePushSubscription(subscription)).toEqual({ ok: false, error: "unconfigured" });
    expect(await sendTestNotification(endpoint)).toEqual({ ok: false, error: "unconfigured" });
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.isPushConfigured.mockReturnValue(true);
    mocks.upsert.mockResolvedValue({ error: { message: "RLS rejected endpoint" } });
    expect(await savePushSubscription(subscription)).toEqual({ ok: false, error: "saveFailed" });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: "offline" } });
    expect(await getPushSubscriptionState(endpoint)).toEqual({ ok: false, error: "stateFailed" });
  });

  it("reads and deletes only the signed-in user's exact endpoint", async () => {
    expect(await getPushSubscriptionState(endpoint)).toEqual({ ok: true, data: { saved: true } });
    await removePushSubscription(endpoint);
    expect(mocks.eq.mock.calls).toEqual([
      ["user_id", "current-user"],
      ["endpoint", endpoint],
      ["user_id", "current-user"],
      ["endpoint", endpoint],
    ]);
  });

  it("sends the test through the server delivery boundary after checking own subscription", async () => {
    expect(await sendTestNotification(endpoint)).toEqual({ ok: true, data: undefined });
    expect(mocks.deliverPush).toHaveBeenCalledWith(
      {
        title: "testTitle",
        body: "testBody",
        url: "/settings",
        tag: "halo-notification-test",
        severity: "info",
      },
      [{ ...subscription, expirationTime: null }],
    );
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "current-user");
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.deliverPush.mockClear();
    expect(await sendTestNotification(endpoint)).toEqual({ ok: false, error: "noSubscription" });
    expect(mocks.deliverPush).not.toHaveBeenCalled();
  });

  it("removes expired own subscriptions and reports failed delivery truthfully", async () => {
    mocks.deliverPush.mockResolvedValue({ sent: 0, expired: [endpoint] });
    expect(await sendTestNotification(endpoint)).toEqual({ ok: false, error: "noSubscription" });
    expect(mocks.deleteRows).toHaveBeenCalledOnce();
    expect(mocks.inRows).toHaveBeenCalledWith("endpoint", [endpoint]);
    mocks.deliverPush.mockResolvedValue({ sent: 0, expired: [] });
    expect(await sendTestNotification(endpoint)).toEqual({ ok: false, error: "sendFailed" });
  });
});
