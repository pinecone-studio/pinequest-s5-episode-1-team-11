import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deliverExpoPush } from "./expo-push";

const payload = {
  title: "Уналт",
  body: "Hall",
  url: "/x",
  tag: "e1",
  severity: "critical" as const,
};

afterEach(() => vi.unstubAllGlobals());

describe("deliverExpoPush", () => {
  it("counts accepted tickets and returns tokens Expo no longer knows", async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({
        data: [
          { status: "ok", id: "r1" },
          { status: "error", details: { error: "DeviceNotRegistered" } },
          { status: "error", details: { error: "MessageRateExceeded" } },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const tokens = ["ExponentPushToken[a]", "ExponentPushToken[b]", "ExponentPushToken[c]"];
    expect(await deliverExpoPush(payload, "e1", [...tokens, tokens[0]])).toEqual({
      sent: 1,
      expired: ["ExponentPushToken[b]"],
    });
    const messages = JSON.parse(String(fetch.mock.calls[0]?.[1].body));
    expect(messages).toHaveLength(3);
    expect(messages[0]).toMatchObject({
      priority: "high",
      channelId: "alerts",
      data: { eventId: "e1" },
    });
  });

  it("reports nothing sent when Expo cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await deliverExpoPush(payload, "e1", ["ExponentPushToken[a]"])).toEqual({
      sent: 0,
      expired: [],
    });
  });
});
