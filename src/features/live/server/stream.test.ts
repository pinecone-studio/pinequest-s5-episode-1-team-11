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
