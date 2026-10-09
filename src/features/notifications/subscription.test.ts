import { describe, expect, it } from "vitest";
import { isPushEndpoint, StoredPushSubscription } from "./subscription";

describe("browser push subscription validation", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/device",
    "https://updates.push.services.mozilla.com/wpush/v2/device",
    "https://web.push.apple.com/device/token",
  ])("accepts standard browser push provider %s", (endpoint) => {
    expect(isPushEndpoint(endpoint)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/device",
    "https://fcm.googleapis.com:8443/device",
    "https://user:secret@fcm.googleapis.com/device",
    "https://fcm.googleapis.com.attacker.example/device",
    "https://169.254.169.254/latest/meta-data/",
    "https://[::1]/internal",
    "not-a-url",
  ])("rejects arbitrary or insecure target %s", (endpoint) => {
    expect(isPushEndpoint(endpoint)).toBe(false);
  });

  it("bounds supplied payloads and permits the browser's optional expiration", () => {
    const value = {
      endpoint: "https://web.push.apple.com/device",
      keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
      expirationTime: null,
    };
    expect(StoredPushSubscription.safeParse(value).success).toBe(true);
    expect(StoredPushSubscription.safeParse({ ...value, expirationTime: -1 }).success).toBe(false);
    expect(
      StoredPushSubscription.safeParse({
        ...value,
        keys: { ...value.keys, auth: "x".repeat(1000) },
      }).success,
    ).toBe(false);
  });
});
