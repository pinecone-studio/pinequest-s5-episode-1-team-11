import { describe, expect, it } from "vitest";
import { defaultDetectionSettings } from "@/contracts";
import { decodeSnapshot, isKindEnabled, normalizeOccurredAt } from "./ingest";

describe("event ingestion rules", () => {
  it("maps each kind to the guardian's switch", () => {
    const settings = { ...defaultDetectionSettings, distress: false };
    expect(isKindEnabled("fall", settings)).toBe(true);
    expect(isKindEnabled("scream", settings)).toBe(false);
    expect(isKindEnabled("cry", settings)).toBe(false);
    expect(isKindEnabled("glass", { ...settings, hazard: false })).toBe(false);
    expect(isKindEnabled("alarm", settings)).toBe(true);
  });

  it("accepts replays up to a day and clamps future clocks", () => {
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(normalizeOccurredAt("2026-10-08T11:00:00Z", now)).toBe("2026-10-08T11:00:00.000Z");
    expect(normalizeOccurredAt("2026-10-08T13:00:00Z", now)).toBe("2026-10-08T12:01:00.000Z");
    expect(normalizeOccurredAt("2026-10-07T11:59:00Z", now)).toBeNull();
  });

  it("only accepts small JPEG snapshots", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64");
    expect(decodeSnapshot(jpeg)?.length).toBe(7);
    expect(decodeSnapshot(`data:image/jpeg;base64,${jpeg}`)?.length).toBe(7);
    expect(decodeSnapshot(Buffer.from("<svg/>").toString("base64"))).toBeNull();
    expect(decodeSnapshot("not base64!")).toBeNull();
  });
});
