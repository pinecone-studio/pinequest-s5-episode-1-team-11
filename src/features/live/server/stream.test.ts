import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { streamToken } from "./stream";

describe("streamToken", () => {
  it("matches the camera server's check (same vector as cctv/test_stream_auth.py)", () => {
    const token = streamToken(
      "00000000-0000-4000-8000-0000000000d1",
      "s".repeat(32),
      1_800_000_000_000,
    );
    expect(token).toBe(
      "1800000600.9b8facaaffbf9631ec18694e6e76e97f322aa02f851e32daca19373086fb4f02",
    );
  });
});

describe("provisionCamera", () => {
  it("signs the request the way cctv/control.py checks it", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env.server", () => ({
      serverEnv: { streamSecret: "s".repeat(32), streamUrl: "https://cams.example/" },
    }));
    const fetch = vi.fn(async (_url: URL, _init: RequestInit) =>
      Response.json({ deviceId: "d", server: "rtmp://x:1935/live", streamKey: "k" }),
    );
    vi.stubGlobal("fetch", fetch);
    const { provisionCamera } = await import("./stream");
    expect(await provisionCamera("123456", 1_800_000_000_000)).toMatchObject({ streamKey: "k" });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://cams.example/provision");
    expect(init?.headers).toMatchObject({
      "x-halo-time": "1800000000",
      // Same as test_control.py: sign(b"s" * 32, '1800000000.{"code":"123456"}').
      "x-halo-signature": "5c72ba0c2f0a5b7e1b395286eba0620aacf9f7366edc75df08f0f526ddfda015",
    });
    vi.unstubAllGlobals();
  });
});
