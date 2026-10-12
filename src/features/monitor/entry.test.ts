import { expect, it } from "vitest";
import type { PairResponse } from "@/contracts";
import { monitorEntry, withoutPairingCode } from "./entry";

const saved: PairResponse = {
  deviceId: "11111111-1111-4111-8111-111111111111",
  deviceToken: "a".repeat(32),
  name: "iPhone",
  roomName: "Living room",
};

it("reopens an existing camera when its original QR code has expired", () => {
  expect(monitorEntry(saved, "123456")).toEqual({
    kind: "resume",
    device: saved,
    replacementCode: "123456",
  });
});

it("restores a paired camera without requiring another code", () => {
  expect(monitorEntry(saved, "")).toEqual({ kind: "resume", device: saved, replacementCode: null });
});

it("keeps a fresh QR code available for deliberate re-pairing", () => {
  const entry = monitorEntry(saved, "987654");
  expect(entry.kind).toBe("resume");
  if (entry.kind === "resume") {
    expect(entry.device.deviceToken).toBe(saved.deviceToken);
    expect(entry.replacementCode).toBe("987654");
  }
});

it("opens pairing for a browser with no saved camera", () => {
  expect(monitorEntry(null, "123456")).toEqual({ kind: "pair", code: "123456" });
});

it("removes all consumed code parameters while preserving the CCTV source and fragment", () => {
  const url = "https://halo-team11.vercel.app/monitor?code=123456&cctv=hall&code=654321#camera";
  expect(withoutPairingCode(url)).toBe("/monitor?cctv=hall#camera");
});

it("drops a used reconnect link from the address bar", () => {
  expect(withoutPairingCode("https://halo.test/monitor?code=123456&reconnect=1")).toBe("/monitor");
});
