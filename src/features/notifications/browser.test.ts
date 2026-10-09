import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("browser notification lifecycle", () => {
  it("registers one root worker without asking for notification permission", async () => {
    const registration = { pushManager: {} };
    const register = vi.fn().mockResolvedValue(registration);
    const requestPermission = vi.fn();
    vi.stubGlobal("navigator", {
      serviceWorker: { register, ready: Promise.resolve(registration) },
    });
    vi.stubGlobal("Notification", { requestPermission });
    const { registerNotificationWorker } = await import("./browser");
    const [first, second] = await Promise.all([
      registerNotificationWorker(),
      registerNotificationWorker(),
    ]);
    expect(first).toBe(registration);
    expect(second).toBe(registration);
    expect(register).toHaveBeenCalledOnce();
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("permits registration retry after the browser rejects it", async () => {
    const registration = { pushManager: {} };
    const register = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(registration);
    vi.stubGlobal("navigator", {
      serviceWorker: { register, ready: Promise.resolve(registration) },
    });
    const { registerNotificationWorker } = await import("./browser");
    await expect(registerNotificationWorker()).rejects.toThrow("offline");
    expect(await registerNotificationWorker()).toBe(registration);
  });

  it("unsubscribes the existing browser endpoint before account departure", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const getRegistration = vi
      .fn()
      .mockResolvedValue({ pushManager: { getSubscription: async () => ({ unsubscribe }) } });
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration } });
    const { unsubscribeBrowserPush } = await import("./browser");
    await unsubscribeBrowserPush();
    expect(getRegistration).toHaveBeenCalledWith("/");
    expect(unsubscribe).toHaveBeenCalledOnce();
    unsubscribe.mockResolvedValue(false);
    await expect(unsubscribeBrowserPush()).rejects.toThrow("unsubscribe_failed");
  });

  it("shows iOS install guidance only outside Home Screen mode", async () => {
    vi.stubGlobal("navigator", { userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 1 });
    const matchMedia = vi.fn().mockReturnValue({ matches: false });
    vi.stubGlobal("window", { matchMedia });
    const { needsIosInstall } = await import("./browser");
    expect(needsIosInstall()).toBe(true);
    matchMedia.mockReturnValue({ matches: true });
    expect(needsIosInstall()).toBe(false);
  });
});

describe("push account reconciliation", () => {
  async function setup() {
    const unsubscribe = vi.fn();
    const oldSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/account-a",
      unsubscribe,
    };
    let currentSubscription: { endpoint: string; unsubscribe: typeof unsubscribe } | null =
      oldSubscription;
    const getSubscription = vi.fn(async () => currentSubscription);
    unsubscribe.mockImplementation(async () => {
      if (currentSubscription !== oldSubscription) return false;
      currentSubscription = null;
      return true;
    });
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription } }),
      },
    });
    const { reconcileBrowserPush } = await import("./browser");
    return {
      reconcileBrowserPush,
      oldSubscription,
      unsubscribe,
      getSubscription,
      setSubscription: (value: typeof currentSubscription) => {
        currentSubscription = value;
      },
    };
  }

  it("retains the current account's owned browser subscription", async () => {
    const runtime = await setup();
    const lookup = vi.fn().mockResolvedValue({ ok: true, data: { saved: true } });
    expect(await runtime.reconcileBrowserPush(lookup)).toEqual({ state: "owned" });
    expect(lookup).toHaveBeenCalledWith(runtime.oldSubscription.endpoint);
    expect(runtime.unsubscribe).not.toHaveBeenCalled();
  });

  it("removes account A's endpoint when account B does not own it", async () => {
    const runtime = await setup();
    const lookup = vi.fn().mockResolvedValue({ ok: true, data: { saved: false } });
    expect(await runtime.reconcileBrowserPush(lookup)).toEqual({ state: "removed" });
    expect(runtime.unsubscribe).toHaveBeenCalledOnce();
  });

  it("stops browser push after the server reports an expired session", async () => {
    const runtime = await setup();
    expect(await runtime.reconcileBrowserPush(async () => ({ ok: false, error: "login" }))).toEqual(
      { state: "removed" },
    );
    expect(runtime.unsubscribe).toHaveBeenCalledOnce();
  });

  it("does not present a failed unsubscribe as Off and can recover on retry", async () => {
    const runtime = await setup();
    runtime.unsubscribe.mockResolvedValueOnce(false);
    const lookup = vi.fn().mockResolvedValue({ ok: true, data: { saved: false } });
    expect(await runtime.reconcileBrowserPush(lookup)).toEqual({
      state: "error",
      error: "browserFailed",
    });
    expect(await runtime.reconcileBrowserPush(lookup)).toEqual({ state: "removed" });
  });

  it("preserves a subscription while ownership is uncertain instead of falsely reporting Off", async () => {
    const runtime = await setup();
    expect(
      await runtime.reconcileBrowserPush(async () => ({ ok: false, error: "stateFailed" })),
    ).toEqual({ state: "error", error: "stateFailed" });
    expect(runtime.unsubscribe).not.toHaveBeenCalled();
  });

  it("unsubscribes only the captured old endpoint when a newer subscription appears during lookup", async () => {
    const runtime = await setup();
    const newUnsubscribe = vi.fn().mockResolvedValue(true);
    let finishLookup: ((value: { ok: true; data: { saved: false } }) => void) | undefined;
    const lookup = vi.fn(
      () =>
        new Promise<{ ok: true; data: { saved: false } }>((resolve) => {
          finishLookup = resolve;
        }),
    );
    const pending = runtime.reconcileBrowserPush(lookup);
    await vi.waitFor(() => expect(lookup).toHaveBeenCalledOnce());
    runtime.setSubscription({
      endpoint: "https://fcm.googleapis.com/fcm/send/account-b",
      unsubscribe: newUnsubscribe,
    });
    finishLookup?.({ ok: true, data: { saved: false } });
    expect(await pending).toEqual({ state: "error", error: "stateFailed" });
    expect(runtime.unsubscribe).toHaveBeenCalledOnce();
    expect(newUnsubscribe).not.toHaveBeenCalled();
  });

  it("recognizes an endpoint already removed by a concurrent check", async () => {
    const runtime = await setup();
    runtime.unsubscribe.mockImplementationOnce(async () => {
      runtime.setSubscription(null);
      return false;
    });
    expect(
      await runtime.reconcileBrowserPush(async () => ({ ok: true, data: { saved: false } })),
    ).toEqual({ state: "removed" });
  });

  it("ignores stale ownership results after the boundary's user identity changes", async () => {
    const runtime = await setup();
    let current = true;
    let finishLookup: ((value: { ok: true; data: { saved: false } }) => void) | undefined;
    const lookup = vi.fn(
      () =>
        new Promise<{ ok: true; data: { saved: false } }>((resolve) => {
          finishLookup = resolve;
        }),
    );
    const pending = runtime.reconcileBrowserPush(lookup, () => current);
    await vi.waitFor(() => expect(lookup).toHaveBeenCalledOnce());
    current = false;
    finishLookup?.({ ok: true, data: { saved: false } });
    expect(await pending).toEqual({ state: "cancelled" });
    expect(runtime.unsubscribe).not.toHaveBeenCalled();
  });
});
