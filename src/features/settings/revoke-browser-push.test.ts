import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPushSubscriptionState, removePushSubscription } from "@/features/notifications/actions";
import { unsubscribeBrowserPush } from "@/features/notifications/browser";
import { revokeBrowserPush } from "./revoke-browser-push";

vi.mock("@/features/notifications/actions", () => ({
  getPushSubscriptionState: vi.fn(),
  removePushSubscription: vi.fn(),
}));
vi.mock("@/features/notifications/browser", () => ({ unsubscribeBrowserPush: vi.fn() }));
const endpoint = "https://fcm.googleapis.com/fcm/send/test";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: async () => ({
        pushManager: { getSubscription: async () => ({ endpoint }) },
      }),
    },
  });
  vi.mocked(getPushSubscriptionState).mockResolvedValue({ ok: true, data: { saved: true } });
  vi.mocked(removePushSubscription).mockResolvedValue({ ok: true, data: undefined });
  vi.mocked(unsubscribeBrowserPush).mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());
describe("shared-browser push revocation before logout", () => {
  it("removes the signed-in user's endpoint before leaving, even if browser unsubscribe fails", async () => {
    vi.mocked(unsubscribeBrowserPush).mockRejectedValueOnce(new Error("browser unavailable"));
    await expect(revokeBrowserPush()).resolves.toBeUndefined();
    expect(removePushSubscription).toHaveBeenCalledWith(endpoint);
  });
  it("does not allow a live endpoint to remain when both revocations fail", async () => {
    vi.mocked(removePushSubscription).mockResolvedValueOnce({ ok: false, error: "removeFailed" });
    vi.mocked(unsubscribeBrowserPush).mockRejectedValueOnce(new Error("unsubscribe_failed"));
    await expect(revokeBrowserPush()).rejects.toThrow("unsubscribe_failed");
  });
  it("requires local revocation when the endpoint belongs to a previous account", async () => {
    vi.mocked(getPushSubscriptionState).mockResolvedValueOnce({ ok: true, data: { saved: false } });
    vi.mocked(unsubscribeBrowserPush).mockRejectedValueOnce(new Error("unsubscribe_failed"));
    await expect(revokeBrowserPush()).rejects.toThrow("unsubscribe_failed");
    expect(removePushSubscription).not.toHaveBeenCalled();
  });
  it("allows logout with successful local revocation when the server is offline", async () => {
    vi.mocked(getPushSubscriptionState).mockRejectedValueOnce(new Error("offline"));
    await expect(revokeBrowserPush()).resolves.toBeUndefined();
    expect(unsubscribeBrowserPush).toHaveBeenCalledOnce();
  });
});
