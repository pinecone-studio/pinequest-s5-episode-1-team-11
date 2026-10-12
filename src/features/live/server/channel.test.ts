import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env.server", () => ({ serverEnv: { supabaseSecretKey: "test-secret" } }));

describe("live channel", () => {
  const a = "00000000-0000-4000-8000-0000000000a1";
  const b = "00000000-0000-4000-8000-0000000000b2";
  const hour = 60 * 60_000;
  const now = Date.parse("2026-10-11T10:20:00Z");

  it("is stable within an hour, differs between cameras and hides the device id", async () => {
    const { liveChannelsFor } = await import("./channel");
    const [current] = liveChannelsFor(a, now) ?? [];
    expect(liveChannelsFor(a, now + 30 * 60_000)?.[0]).toBe(current);
    expect(liveChannelsFor(b, now)?.[0]).not.toBe(current);
    expect(current).toMatch(/^live-[a-f0-9]{40}$/);
    expect(current).not.toContain(a);
  });

  it("rotates every hour and keeps last hour's name for views still open", async () => {
    const { liveChannelsFor } = await import("./channel");
    const [current] = liveChannelsFor(a, now) ?? [];
    const [next, previous] = liveChannelsFor(a, now + hour) ?? [];
    expect(next).not.toBe(current);
    expect(previous).toBe(current);
    // Two hours later a removed member's old name is no longer listened on.
    expect(liveChannelsFor(a, now + 2 * hour)).not.toContain(current);
  });
});
