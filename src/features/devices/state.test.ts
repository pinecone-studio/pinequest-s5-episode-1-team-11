import { describe, expect, it } from "vitest";
import { defaultDetectionSettings } from "@/contracts";
import {
  EditDeviceInput,
  formatCountdown,
  NewDeviceInput,
  pairingSecondsRemaining,
  pairingStatus,
} from "./state";

const id = "00000000-0000-4000-8000-0000000000d1";
describe("device input and pairing deadlines", () => {
  it("normalizes names and rejects empty, overlong and unknown values", () => {
    expect(NewDeviceInput.parse({ name: " Camera ", roomName: " Room ", kind: "phone" })).toEqual({
      name: "Camera",
      roomName: "Room",
      kind: "phone",
    });
    for (const name of ["   ", "a".repeat(61)]) {
      expect(NewDeviceInput.safeParse({ name, roomName: "Room", kind: "phone" }).success).toBe(
        false,
      );
    }
    expect(
      EditDeviceInput.safeParse({
        id,
        name: "Camera",
        roomName: "Room",
        settings: defaultDetectionSettings,
        expected: { name: "Camera", roomName: "Room", settings: defaultDetectionSettings },
        householdId: id,
      }).success,
    ).toBe(false);
    expect(
      EditDeviceInput.safeParse({
        id,
        name: "Camera",
        roomName: "Room",
        settings: { ...defaultDetectionSettings, fall: "false" },
        expected: { name: "Camera", roomName: "Room", settings: defaultDetectionSettings },
      }).success,
    ).toBe(false);
  });

  it("uses the absolute deadline at millisecond boundaries and after a suspended tab", () => {
    const deadline = "2026-10-09T00:10:00.000Z";
    const expiry = Date.parse(deadline);
    expect(pairingSecondsRemaining(deadline, expiry - 600_000)).toBe(600);
    expect(pairingSecondsRemaining(deadline, expiry - 1)).toBe(1);
    expect(pairingSecondsRemaining(deadline, expiry)).toBe(0);
    expect(pairingSecondsRemaining(deadline, expiry + 60_000)).toBe(0);
    expect(pairingSecondsRemaining("invalid", expiry)).toBe(0);
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(59)).toBe("00:59");
  });

  it("recognizes a claimed code even though claiming expires it", () => {
    const pairing = { code: "001234", expiresAt: "2026-10-09T00:00:00.000Z", deviceId: id };
    expect(pairingStatus(pairing, Date.parse(pairing.expiresAt) + 1000)).toEqual({
      status: "paired",
      deviceId: id,
    });
    expect(pairingStatus({ ...pairing, deviceId: null }, Date.parse(pairing.expiresAt))).toEqual({
      status: "expired",
    });
  });
});
