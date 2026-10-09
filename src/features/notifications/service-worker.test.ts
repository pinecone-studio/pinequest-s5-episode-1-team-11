import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue([]);
  const self = {
    location: { origin: "https://halo.example" },
    addEventListener: (name: string, callback: (event: unknown) => void) =>
      handlers.set(name, callback),
    registration: { showNotification },
    clients: { matchAll, openWindow, claim: vi.fn() },
    skipWaiting: vi.fn(),
  };
  runInNewContext(readFileSync(new URL("../../../public/sw.js", import.meta.url), "utf8"), {
    self,
    URL,
  });
  async function fire(name: string, value: Record<string, unknown>) {
    let promise: Promise<unknown> | undefined;
    handlers.get(name)?.({
      ...value,
      waitUntil: (pending: Promise<unknown>) => {
        promise = pending;
      },
    });
    await promise;
  }
  return { fire, handlers, showNotification, openWindow, matchAll };
}

describe("notification worker", () => {
  it("displays urgent push with private data limited to a safe destination", async () => {
    const runtime = worker();
    await runtime.fire("push", {
      data: {
        json: () => ({
          title: "Fall detected",
          body: "Living room",
          severity: "critical",
          url: "/events/00000000-0000-4000-8000-000000000001/alert",
          tag: "event-1",
        }),
      },
    });
    expect(runtime.showNotification).toHaveBeenCalledWith(
      "Fall detected",
      expect.objectContaining({
        body: "Living room",
        requireInteraction: true,
        tag: "event-1",
        data: { url: "https://halo.example/events/00000000-0000-4000-8000-000000000001/alert" },
      }),
    );
    expect(runtime.handlers.has("fetch")).toBe(false);
  });

  it("uses a visible fallback for missing or malformed payload", async () => {
    const runtime = worker();
    await runtime.fire("push", {
      data: {
        json: () => {
          throw new Error("invalid JSON");
        },
      },
    });
    expect(runtime.showNotification).toHaveBeenCalledWith(
      "Halo",
      expect.objectContaining({ data: { url: "https://halo.example/events" } }),
    );
  });

  it.each([
    "https://evil.example/",
    "//evil.example/",
    "javascript:alert(1)",
    "/auth/callback?code=bad",
    "/events/%2f%2fevil.example",
  ])("never navigates to unsafe destination %s", async (url) => {
    const runtime = worker();
    const close = vi.fn();
    await runtime.fire("notificationclick", { notification: { close, data: { url } } });
    expect(close).toHaveBeenCalledOnce();
    expect(runtime.openWindow).toHaveBeenCalledWith("https://halo.example/events");
  });

  it("navigates and focuses an existing Halo window", async () => {
    const runtime = worker();
    const navigate = vi.fn().mockResolvedValue(undefined);
    const focus = vi.fn().mockResolvedValue(undefined);
    runtime.matchAll.mockResolvedValue([{ url: "https://halo.example/home", navigate, focus }]);
    await runtime.fire("notificationclick", {
      notification: { close: vi.fn(), data: { url: "/settings" } },
    });
    expect(navigate).toHaveBeenCalledWith("https://halo.example/settings");
    expect(focus).toHaveBeenCalledOnce();
    expect(runtime.openWindow).not.toHaveBeenCalled();
  });
});
